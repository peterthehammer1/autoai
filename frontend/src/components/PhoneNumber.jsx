import { useState, useEffect, createContext, useContext } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPhone } from '@/lib/utils'

// Duration in milliseconds that revealed numbers stay visible (5 minutes)
const REVEAL_DURATION = 5 * 60 * 1000

// Get revealed phones from localStorage
const getRevealedPhones = () => {
  try {
    const data = localStorage.getItem('revealedPhones')
    if (!data) return {}
    const parsed = JSON.parse(data)
    // Clean up expired entries
    const now = Date.now()
    const cleaned = {}
    for (const [phone, timestamp] of Object.entries(parsed)) {
      if (now - timestamp < REVEAL_DURATION) {
        cleaned[phone] = timestamp
      }
    }
    return cleaned
  } catch {
    return {}
  }
}

// Save revealed phone to localStorage
const saveRevealedPhone = (phone) => {
  try {
    const current = getRevealedPhones()
    current[phone] = Date.now()
    localStorage.setItem('revealedPhones', JSON.stringify(current))
  } catch {
    // Ignore localStorage errors
  }
}

// Check if a phone is currently revealed
const isPhoneRevealed = (phone) => {
  const revealed = getRevealedPhones()
  const timestamp = revealed[phone]
  if (!timestamp) return false
  return Date.now() - timestamp < REVEAL_DURATION
}

// Check if admin mode is active
const isAdminModeActive = () => {
  const adminUntil = localStorage.getItem('adminModeUntil')
  if (adminUntil && Date.now() < parseInt(adminUntil)) {
    return true
  }
  return false
}

// Mask a phone number showing only last 4 digits
export const maskPhone = (phone) => {
  if (!phone) return ''
  // Extract just digits
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '****'
  const last4 = digits.slice(-4)
  return `•••-•••-${last4}`
}

/**
 * PhoneNumber component with privacy masking
 * Shows masked phone by default, click to reveal for 5 minutes
 * Respects global admin mode
 */
export default function PhoneNumber({ 
  phone, 
  className = '',
  showRevealButton = true,
  alwaysShow = false // For forcing reveal
}) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [adminMode, setAdminMode] = useState(false)

  // Check initial reveal state and admin mode
  useEffect(() => {
    const checkState = () => {
      // Check admin mode first
      const isAdmin = isAdminModeActive()
      setAdminMode(isAdmin)
      
      if (alwaysShow || isAdmin) {
        setIsRevealed(true)
        return
      }
      
      const revealed = isPhoneRevealed(phone)
      setIsRevealed(revealed)
      
      if (revealed) {
        const revealedPhones = getRevealedPhones()
        const timestamp = revealedPhones[phone]
        const remaining = REVEAL_DURATION - (Date.now() - timestamp)
        setTimeLeft(Math.max(0, Math.ceil(remaining / 1000)))
      } else {
        setTimeLeft(0)
      }
    }
    
    checkState()
    
    // Check every second for expiration
    const interval = setInterval(checkState, 1000)
    return () => clearInterval(interval)
  }, [phone, alwaysShow])

  const handleReveal = (e) => {
    e.stopPropagation()
    e.preventDefault()
    saveRevealedPhone(phone)
    setIsRevealed(true)
    setTimeLeft(REVEAL_DURATION / 1000)
  }

  const handleHide = (e) => {
    e.stopPropagation()
    e.preventDefault()
    // Remove from localStorage
    try {
      const current = getRevealedPhones()
      delete current[phone]
      localStorage.setItem('revealedPhones', JSON.stringify(current))
    } catch {}
    setIsRevealed(false)
    setTimeLeft(0)
  }

  if (!phone) return <span className={className}>-</span>

  const displayPhone = isRevealed ? formatPhone(phone) : maskPhone(phone)
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  // In admin mode, always show phone without reveal button
  if (adminMode) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span>{formatPhone(phone)}</span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={isRevealed ? '' : 'font-mono text-slate-500'}>
        {displayPhone}
      </span>
      {showRevealButton && !alwaysShow && (
        <>
          {isRevealed ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-slate-100"
              onClick={handleHide}
              title="Hide phone number"
            >
              <EyeOff className="h-3 w-3 text-slate-400" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-slate-100"
              onClick={handleReveal}
              title="Reveal phone number (visible for 5 min)"
            >
              <Eye className="h-3 w-3 text-slate-400" />
            </Button>
          )}
          {isRevealed && timeLeft > 0 && timeLeft < 120 && (
            <span className="text-xs text-slate-400">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          )}
        </>
      )}
    </span>
  )
}

// Hook for checking admin/Zoe mode
export const useAdminMode = () => {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = () => {
      const adminUntil = localStorage.getItem('adminModeUntil')
      if (adminUntil && Date.now() < parseInt(adminUntil)) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
        localStorage.removeItem('adminModeUntil')
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
  }

  const disableAdminMode = () => {
    localStorage.removeItem('adminModeUntil')
    setIsAdmin(false)
  }

  return { isAdmin, enableAdminMode, disableAdminMode }
}
