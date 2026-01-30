import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Phone,
  BarChart3,
  Wrench,
  Settings,
  Menu,
  X,
  Sparkles,
  Bell,
  Search,
  ChevronRight,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Call Logs', href: '/call-logs', icon: Phone },
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
    <div className="min-h-screen gradient-subtle">
      {/* Mobile sidebar backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden transition-opacity duration-300',
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        
        {/* Mobile sidebar */}
        <div className={cn(
          'fixed inset-y-0 left-0 w-72 bg-white shadow-2xl transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <div className="flex h-16 items-center justify-between px-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-glow">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">Premier Auto</span>
                <span className="block text-[10px] font-medium text-primary uppercase tracking-wider">AI Platform</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive(item.href)
                    ? 'bg-primary text-white shadow-glow'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  isActive(item.href) ? '' : 'group-hover:scale-110'
                )} />
                {item.name}
                {isActive(item.href) && (
                  <ChevronRight className="h-4 w-4 ml-auto opacity-70" />
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white/80 backdrop-blur-xl border-r border-gray-200/50">
          {/* Logo */}
          <div className="flex h-20 items-center gap-3 px-6 border-b border-gray-100">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-glow">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">Premier Auto</span>
              <span className="block text-[10px] font-semibold text-primary uppercase tracking-wider">AI Platform</span>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex flex-col gap-1 p-4 flex-1">
            <p className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Main Menu
            </p>
            {navigation.slice(0, 4).map((item, index) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive(item.href)
                    ? 'bg-primary text-white shadow-glow'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <item.icon className={cn(
                  'h-5 w-5 transition-all duration-200',
                  isActive(item.href) ? '' : 'group-hover:scale-110 group-hover:text-primary'
                )} />
                {item.name}
                {isActive(item.href) && (
                  <ChevronRight className="h-4 w-4 ml-auto opacity-70" />
                )}
              </Link>
            ))}
            
            <p className="px-4 py-2 mt-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Management
            </p>
            {navigation.slice(4).map((item, index) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive(item.href)
                    ? 'bg-primary text-white shadow-glow'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={cn(
                  'h-5 w-5 transition-all duration-200',
                  isActive(item.href) ? '' : 'group-hover:scale-110 group-hover:text-primary'
                )} />
                {item.name}
                {isActive(item.href) && (
                  <ChevronRight className="h-4 w-4 ml-auto opacity-70" />
                )}
              </Link>
            ))}
          </nav>
          
          {/* Pro badge */}
          <div className="p-4 border-t border-gray-100">
            <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-yellow-400">AI Powered</span>
              </div>
              <p className="text-sm font-medium mb-1">Voice Agent Active</p>
              <p className="text-xs text-gray-400">24/7 automated booking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 sm:h-20 items-center gap-4 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 rounded-xl"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Search bar */}
          <div className="hidden sm:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search appointments, customers..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-gray-100/80 border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 sm:flex-none" />
          
          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Date */}
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-gray-900">
                {new Date().toLocaleDateString('en-CA', {
                  weekday: 'long',
                })}
              </p>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString('en-CA', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            
            {/* Notification button */}
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl relative">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
            </Button>
            
            {/* Avatar */}
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white font-semibold text-sm shadow-soft">
              PA
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
