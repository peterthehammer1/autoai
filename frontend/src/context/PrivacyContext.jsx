import { createContext, useContext, useState, useEffect } from 'react'

const ADMIN_DURATION = 30 * 60 * 1000 // 30 minutes

const PrivacyContext = createContext(null)

export function PrivacyProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminTimeLeft, setAdminTimeLeft] = useState(0)

  useEffect(() => {
    const checkAdmin = () => {
      const adminUntil = localStorage.getItem('adminModeUntil')
      if (adminUntil) {
        const until = parseInt(adminUntil)
        const remaining = until - Date.now()
        if (remaining > 0) {
          setIsAdmin(true)
          setAdminTimeLeft(Math.ceil(remaining / 1000))
        } else {
          setIsAdmin(false)
          setAdminTimeLeft(0)
          localStorage.removeItem('adminModeUntil')
        }
      } else {
        setIsAdmin(false)
        setAdminTimeLeft(0)
      }
    }
    
    checkAdmin()
    const interval = setInterval(checkAdmin, 1000)
    return () => clearInterval(interval)
  }, [])

  const enableAdminMode = (durationMinutes = 30) => {
    const until = Date.now() + (durationMinutes * 60 * 1000)
    localStorage.setItem('adminModeUntil', until.toString())
    setIsAdmin(true)
    setAdminTimeLeft(durationMinutes * 60)
  }

  const disableAdminMode = () => {
    localStorage.removeItem('adminModeUntil')
    setIsAdmin(false)
    setAdminTimeLeft(0)
  }

  return (
    <PrivacyContext.Provider value={{ 
      isAdmin, 
      adminTimeLeft,
      enableAdminMode, 
      disableAdminMode 
    }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  const context = useContext(PrivacyContext)
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider')
  }
  return context
}
