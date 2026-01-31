import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Phone,
  MessageSquare,
  BarChart3,
  Wrench,
  Settings,
  Menu,
  X,
  Search,
  ChevronRight,
  PhoneCall,
} from 'lucide-react'

// Business phone number for AI agent
const BUSINESS_PHONE = '(716) 412-2499'
const BUSINESS_PHONE_RAW = '+17164122499'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Call Logs', href: '/call-logs', icon: Phone },
  { name: 'SMS Messages', href: '/sms-logs', icon: MessageSquare },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Services', href: '/services', icon: Wrench },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const isActive = (href) => 
    location.pathname === href || location.pathname.startsWith(href + '/')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden transition-opacity duration-300',
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className="fixed inset-0 bg-slate-900/50"
          onClick={() => setSidebarOpen(false)}
        />
        
        {/* Mobile sidebar */}
        <div className={cn(
          'fixed inset-y-0 left-0 w-72 shadow-xl transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )} style={{ backgroundColor: '#082438' }}>
          <div className="flex h-20 items-center justify-between px-2 overflow-hidden">
            <div className="h-20 w-48 overflow-hidden flex items-center justify-center">
              <img src="/logo-dark.png" alt="Premier Auto Service" className="w-48 scale-[1.4]" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex flex-col gap-0.5 p-3 flex-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          
          {/* Mobile Phone Number */}
          <div className="p-3 border-t border-slate-700/50">
            <a 
              href={`tel:${BUSINESS_PHONE_RAW}`}
              className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 p-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <PhoneCall className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{BUSINESS_PHONE}</p>
                <p className="text-[11px] text-slate-400">AI Booking Line</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow" style={{ backgroundColor: '#082438' }}>
          {/* Logo - scaled to show full logo while minimizing extra background */}
          <div className="h-20 overflow-hidden flex items-center justify-center">
            <img src="/logo-dark.png" alt="Premier Auto Service" className="w-56 scale-[1.4]" />
          </div>
          
          {/* Navigation */}
          <nav className="flex flex-col gap-0.5 p-3 flex-1">
            <p className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Main
            </p>
            {navigation.slice(0, 5).map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.name}
                {isActive(item.href) && (
                  <ChevronRight className="h-4 w-4 ml-auto opacity-60" />
                )}
              </Link>
            ))}
            
            <p className="px-3 py-2 mt-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Settings
            </p>
            {navigation.slice(5).map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.name}
                {isActive(item.href) && (
                  <ChevronRight className="h-4 w-4 ml-auto opacity-60" />
                )}
              </Link>
            ))}
          </nav>
          
          {/* AI Status & Phone */}
          <div className="p-3 border-t border-slate-700/50 space-y-3">
            {/* Phone Number */}
            <a 
              href={`tel:${BUSINESS_PHONE_RAW}`}
              className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 p-3 hover:bg-primary/20 transition-colors group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <PhoneCall className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{BUSINESS_PHONE}</p>
                <p className="text-[11px] text-slate-400">AI Booking Line</p>
              </div>
            </a>
            
            {/* AI Status */}
            <div className="rounded-lg bg-slate-800 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">AI Active</span>
              </div>
              <p className="text-sm font-medium text-white">Voice Agent Online</p>
              <p className="text-xs text-slate-400">Handling calls 24/7</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-14 sm:h-16 items-center gap-4 bg-white border-b border-slate-200 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </Button>
          
          {/* Search bar */}
          <div className="hidden sm:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search..."
                className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-100 border-0 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1" />
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
