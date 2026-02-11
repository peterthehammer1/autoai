import { useEffect, useRef, useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const TOUR_VERSION = 'v1'
const STORAGE_KEY = 'dashboard-tour-completed'

const TOUR_STEPS = [
  {
    element: '[data-tour="dashboard-header"]',
    popover: {
      title: 'Welcome to Your Dashboard',
      description: 'Your command center shows the time of day, today\'s date, and quick access to all your tools.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="todays-schedule"]',
    popover: {
      title: "Today's Schedule",
      description: 'See all of today\'s appointments at a glance. Click any appointment for full details.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="ai-agent"]',
    popover: {
      title: 'AI Agent Performance',
      description: 'Monitor your AI voice agent in real time — calls handled, bookings made, and conversion rate.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="mini-calendar"]',
    popover: {
      title: 'Calendar Overview',
      description: 'Browse months and spot busy days. Click any date to jump to that day\'s appointments.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="ai-insights"]',
    popover: {
      title: 'AI-Powered Insights',
      description: 'Smart recommendations based on your data — trends, warnings, and action items.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="sidebar-nav"]',
    popover: {
      title: 'Navigation',
      description: 'Access Appointments, Customers, Call Logs, Analytics, and Reports from the sidebar.',
      side: 'right',
      align: 'start',
    },
  },
]

export function useDashboardTour(ready = false) {
  const driverRef = useRef(null)

  const startTour = useCallback(() => {
    // Filter steps to only include elements that exist in the DOM
    const isMobile = window.innerWidth < 1024
    const availableSteps = TOUR_STEPS.filter((step) => {
      if (isMobile && step.element === '[data-tour="sidebar-nav"]') return false
      return document.querySelector(step.element)
    })

    if (availableSteps.length === 0) return

    if (driverRef.current) {
      driverRef.current.destroy()
    }

    driverRef.current = driver({
      showProgress: true,
      animate: true,
      overlayColor: 'rgba(8, 36, 56, 0.65)',
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'dashboard-tour-popover',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      onDestroyed: () => {
        localStorage.setItem(STORAGE_KEY, TOUR_VERSION)
      },
      steps: availableSteps,
    })

    driverRef.current.drive()
  }, [])

  // Auto-start on first visit once data is ready
  useEffect(() => {
    if (!ready) return
    if (localStorage.getItem(STORAGE_KEY) === TOUR_VERSION) return

    const timeout = setTimeout(() => {
      startTour()
    }, 800)

    return () => clearTimeout(timeout)
  }, [ready, startTour])

  // Listen for manual trigger from sidebar button
  useEffect(() => {
    const handler = () => startTour()
    window.addEventListener('start-dashboard-tour', handler)
    return () => window.removeEventListener('start-dashboard-tour', handler)
  }, [startTour])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy()
      }
    }
  }, [])

  return { startTour }
}
