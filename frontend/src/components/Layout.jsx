import { useState, useEffect, Suspense } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { PageLoader } from '@/App'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Breadcrumbs, { BreadcrumbProvider } from '@/components/Breadcrumbs'
import CommandPalette from '@/components/CommandPalette'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Phone,
  MessageSquare,
  BarChart3,
  FileDown,
  Columns,
  ClipboardList,
  Wrench,
  Settings,
  Menu,
  X,
  ChevronRight,
  PhoneCall,
  HelpCircle,
  Search,
} from 'lucide-react'

// Business phone numbers for AI agent
const PHONE_NUMBERS = [
  { label: 'New York', phone: '(716) 412-2499', raw: '+17164122499' },
  { label: 'Toronto', phone: '(647) 371-1990', raw: '+16473711990' },
]

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Bay View', href: '/bay-view', icon: Columns },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Call Logs', href: '/call-logs', icon: Phone },
  { name: 'SMS Messages', href: '/sms-logs', icon: MessageSquare },
  { name: 'Work Orders', href: '/work-orders', icon: ClipboardList },
  { name: 'Reports', href: '/reports', icon: FileDown },
  // Hidden for now - pages still accessible via direct URL
  // { name: 'Services', href: '/services', icon: Wrench },
  // { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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
          role="presentation"
          onClick={() => setSidebarOpen(false)}
        />
        
        {/* Mobile sidebar */}
        <div className={cn(
          'fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl transition-transform duration-300 ease-out bg-sidebar',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <div className="flex h-20 items-center justify-between px-2 overflow-hidden">
            <div className="h-20 w-48 overflow-hidden flex items-center justify-center">
              <img src="/logo-dark.png" alt="Premier Auto Service" className="w-48 scale-100 sm:scale-[1.4]" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex flex-col gap-0.5 p-3 flex-1" aria-label="Main navigation">
            {/* Mobile search trigger */}
            <button
              onClick={() => { setSidebarOpen(false); setSearchOpen(true) }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 mb-2 text-sm text-slate-500 bg-slate-800/60 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-300 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search...</span>
            </button>
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
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
                  <PhoneCall className="h-3.5 w-3.5 text-white" aria-hidden="true" />
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
        <div className="flex flex-col flex-grow bg-sidebar">
          {/* Logo - scaled to show full logo while minimizing extra background */}
          <div className="h-20 overflow-hidden flex items-center justify-center">
            <img src="/logo-dark.png" alt="Premier Auto Service" className="w-56 scale-100 lg:scale-[1.4]" />
          </div>
          
          {/* Navigation */}
          <nav data-tour="sidebar-nav" className="flex flex-col gap-0.5 p-3 flex-1" aria-label="Main navigation">
            {/* Search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 mb-2 text-sm text-slate-500 bg-slate-800/60 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-300 hover:border-slate-600 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-slate-500 bg-slate-800 border border-slate-700 rounded">⌘K</kbd>
            </button>
            <p className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Main
            </p>
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                {item.name}
                {isActive(item.href) && (
                  <ChevronRight className="h-4 w-4 ml-auto opacity-60" aria-hidden="true" />
                )}
              </Link>
            ))}
            {/* Take Tour button */}
            {location.pathname.startsWith('/dashboard') && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('start-dashboard-tour'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors mt-auto"
              >
                <HelpCircle className="h-[18px] w-[18px]" aria-hidden="true" />
                Take Tour
              </button>
            )}
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
                  <PhoneCall className="h-3.5 w-3.5 text-white" aria-hidden="true" />
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
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
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
        {/* Mobile menu button - fixed position */}
        <div className="lg:hidden fixed top-3 left-3 z-50">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-white/90 backdrop-blur shadow-md border border-slate-200"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </Button>
        </div>

        {/* Page content */}
        <main id="main-content" className="px-4 sm:px-6 pb-4 sm:pb-6" role="main">
          <BreadcrumbProvider>
            <Breadcrumbs />
            <Suspense fallback={<PageLoader />}>
              <div className="animate-fade-in">
                <Outlet />
              </div>
            </Suspense>
          </BreadcrumbProvider>
        </main>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
