import { useEffect, useRef, useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const TOUR_VERSION = 'v2'
const COMPLETED_KEY = 'dashboard-tour-completed'
const PROGRESS_KEY = 'dashboard-tour-progress'

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
  const unmountingRef = useRef(false)
  const tourCompletedRef = useRef(false)
  const currentStepRef = useRef(0)

  const startTour = useCallback((resumeFromStep = 0) => {
    try {
      const isMobile = window.innerWidth < 1024
      const availableSteps = TOUR_STEPS.filter((step) => {
        if (isMobile && step.element === '[data-tour="sidebar-nav"]') return false
        return document.querySelector(step.element)
      })

      if (availableSteps.length === 0) return

      const startIndex = Math.max(0, Math.min(resumeFromStep, availableSteps.length - 1))

      if (driverRef.current) {
        driverRef.current.destroy()
      }

      // Reset refs for new tour session
      tourCompletedRef.current = false
      currentStepRef.current = startIndex

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
        onHighlighted: (_element, step, opts) => {
          currentStepRef.current = opts.state.activeIndex ?? currentStepRef.current
        },
        onNextClick: (_element, step, opts) => {
          const isLast = opts.state.activeIndex === availableSteps.length - 1
          if (isLast) {
            tourCompletedRef.current = true
          }
          driverRef.current?.moveNext()
        },
        onCloseClick: () => {
          driverRef.current?.destroy()
        },
        onDestroyed: () => {
          if (tourCompletedRef.current) {
            // User clicked "Done" on last step — tour complete
            localStorage.setItem(COMPLETED_KEY, TOUR_VERSION)
            sessionStorage.removeItem(PROGRESS_KEY)
          } else if (unmountingRef.current) {
            // Component unmounting (navigation) — save progress
            sessionStorage.setItem(
              PROGRESS_KEY,
              JSON.stringify({ step: currentStepRef.current, version: TOUR_VERSION })
            )
          } else {
            // User clicked X to dismiss — treat as complete
            localStorage.setItem(COMPLETED_KEY, TOUR_VERSION)
            sessionStorage.removeItem(PROGRESS_KEY)
          }
        },
        steps: availableSteps,
      })

      driverRef.current.drive(startIndex)
    } catch (e) {
      console.warn('Dashboard tour failed to start:', e)
    }
  }, [])

  // Auto-start on first visit once data is ready
  useEffect(() => {
    if (!ready) return
    if (localStorage.getItem(COMPLETED_KEY) === TOUR_VERSION) return

    // Check for saved progress to resume from
    let resumeStep = 0
    try {
      const saved = sessionStorage.getItem(PROGRESS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.version === TOUR_VERSION && typeof parsed.step === 'number') {
          resumeStep = parsed.step
        }
      }
    } catch {
      // ignore malformed data
    }

    let cancelled = false
    let timer = null

    const tryStart = (attemptsLeft) => {
      if (cancelled) return
      const hasElements = TOUR_STEPS.some((step) =>
        document.querySelector(step.element)
      )
      if (hasElements) {
        requestAnimationFrame(() => {
          if (!cancelled) startTour(resumeStep)
        })
      } else if (attemptsLeft > 0) {
        timer = setTimeout(() => tryStart(attemptsLeft - 1), 500)
      }
    }

    timer = setTimeout(() => tryStart(5), 1000)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [ready, startTour])

  // Listen for manual trigger from sidebar button
  useEffect(() => {
    const handler = () => {
      sessionStorage.removeItem(PROGRESS_KEY)
      startTour(0)
    }
    window.addEventListener('start-dashboard-tour', handler)
    return () => window.removeEventListener('start-dashboard-tour', handler)
  }, [startTour])

  // Cleanup on unmount — set unmountingRef so onDestroyed saves progress
  useEffect(() => {
    return () => {
      unmountingRef.current = true
      if (driverRef.current) {
        driverRef.current.destroy()
      }
    }
  }, [])

  return { startTour }
}
