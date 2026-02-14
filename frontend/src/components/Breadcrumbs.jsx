import { createContext, useContext, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

const ROUTE_LABELS = {
  dashboard: 'Dashboard',
  appointments: 'Appointments',
  customers: 'Customers',
  'call-logs': 'Call Logs',
  'sms-logs': 'SMS Messages',
  analytics: 'Analytics',
  reports: 'Reports',
  services: 'Services',
  settings: 'Settings',
  'bay-view': 'Bay View',
}

const BreadcrumbContext = createContext({ entityName: null, setEntityName: () => {} })

export function BreadcrumbProvider({ children }) {
  const [entityName, setEntityName] = useState(null)
  return (
    <BreadcrumbContext.Provider value={{ entityName, setEntityName }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbEntity() {
  return useContext(BreadcrumbContext)
}

export default function Breadcrumbs() {
  const location = useLocation()
  const { entityName } = useContext(BreadcrumbContext)

  const segments = location.pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const crumbs = []
  let path = ''

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    path += `/${segment}`
    const isLast = i === segments.length - 1

    // UUID or ID segment — use entity name if available
    const isId = segment.length > 8 && segment.includes('-')
    const label = isId
      ? (entityName || 'Details')
      : (ROUTE_LABELS[segment] || segment)

    crumbs.push({ label, href: path, isLast })
  }

  if (crumbs.length <= 1) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-2 -mt-1">
      <ol className="flex items-center gap-1 text-xs">
        {crumbs.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
            {crumb.isLast ? (
              <span className="text-slate-600 font-medium">{crumb.label}</span>
            ) : (
              <Link to={crumb.href} className="text-slate-400 hover:text-slate-600 transition-colors">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
