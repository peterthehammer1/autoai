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
  ChevronRight,
  PhoneCall,
} from 'lucide-react'

// Business phone numbers for AI agent
const PHONE_NUMBERS = [
  { label: 'New York', phone: '(716) 412-2499', raw: '+17164122499' },
  { label: 'Toronto', phone: '(647) 371-1990', raw: '+16473711990' },
]

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Call Logs', href: '/call-logs', icon: Phone },
  { name: 'SMS Messages', href: '/sms-logs', icon: MessageSquare },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  // Hidden for now - pages still accessible via direct URL
  // { name: 'Services', href: '/services', icon: Wrench },
  // { name: 'Settings', href: '/settings', icon: Settings },
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
          
          {/* Mobile Phone Numbers */}
          <div className="p-3 border-t border-slate-700/50 space-y-2">
            {PHONE_NUMBERS.map((num) => (
              <a 
                key={num.raw}
                href={`tel:${num.raw}`}
                className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 p-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <PhoneCall className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{num.phone}</p>
                  <p className="text-[10px] text-slate-400">{num.label} • AI Booking</p>
                </div>
              </a>
            ))}
          </div>
          
          {/* Mobile Powered by Nucleus */}
          <div className="p-3 border-t border-slate-700/50">
            <a 
              href="https://nucleus.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 opacity-60 hover:opacity-100 transition-opacity"
            >
              <span className="text-[11px] text-slate-400">Powered by</span>
              <img 
                src="/nucleus-logo.svg" 
                alt="Nucleus" 
                className="h-3.5 brightness-0 invert opacity-70"
              />
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
            {navigation.map((item) => (
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
          <div className="p-3 border-t border-slate-700/50 space-y-2">
            {/* Phone Numbers */}
            {PHONE_NUMBERS.map((num) => (
              <a 
                key={num.raw}
                href={`tel:${num.raw}`}
                className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 p-2.5 hover:bg-primary/20 transition-colors group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <PhoneCall className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{num.phone}</p>
                  <p className="text-[10px] text-slate-400">{num.label} • AI Booking</p>
                </div>
              </a>
            ))}
            
            {/* AI Status */}
            <div className="rounded-lg bg-slate-800 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">AI Active</span>
              </div>
              <p className="text-sm font-medium text-white">Voice Agent Online</p>
              <p className="text-xs text-slate-400">Handling calls 24/7</p>
            </div>
            
            {/* Desktop Powered by Nucleus */}
            <a 
              href="https://nucleus.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 mt-2 opacity-50 hover:opacity-100 transition-opacity"
            >
              <span className="text-[11px] text-slate-400">Powered by</span>
              <img 
                src="/nucleus-logo.svg" 
                alt="Nucleus" 
                className="h-3.5 brightness-0 invert opacity-70"
              />
            </a>
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
          
          <div className="flex-1" />
          
          {/* Powered by Nucleus */}
          <a 
            href="https://nucleus.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <span className="text-xs text-slate-400 group-hover:text-slate-500 transition-colors">Powered by</span>
            <img 
              src="/nucleus-logo.svg" 
              alt="Nucleus" 
              className="h-4 opacity-70 group-hover:opacity-100 transition-opacity"
            />
          </a>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
