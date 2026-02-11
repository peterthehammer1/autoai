import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const PROGRESS_KEY = 'dashboard-tour-progress'

const TOUR_STEPS = [
  {
    element: '[data-tour="customers-header"]',
    popover: {
      title: 'Customer Hub',
      description: 'Your central place for managing customer relationships.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="customers-search"]',
    popover: {
      title: 'Search Customers',
      description: 'Quickly find customers by name or phone number.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="customers-list"]',
    popover: {
      title: 'Customer List',
      description: 'Browse all your customers here. Click any name to see their full profile.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="customers-detail"]',
    popover: {
      title: 'Customer Details',
      description: 'Select a customer from the list to view their vehicles, appointments, and insights. Head back to the dashboard to continue the tour!',
      side: 'left',
      align: 'start',
    },
  },
]

export function useCustomersTour(ready = false) {
  const driverRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!ready) return

    // Only show this tour if the dashboard tour is in progress
    const saved = sessionStorage.getItem(PROGRESS_KEY)
    if (!saved) return

    let cancelled = false
    let timer = null

    const startTour = () => {
      try {
        const availableSteps = TOUR_STEPS.filter((step) =>
          document.querySelector(step.element)
        )

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
          doneBtnText: 'Back to Dashboard',
          onNextClick: (_element, _step, opts) => {
            const isLast = opts.state.activeIndex === availableSteps.length - 1
            if (isLast) {
              driverRef.current?.destroy()
              navigate('/dashboard')
              return
            }
            driverRef.current?.moveNext()
          },
          onCloseClick: () => {
            // X click — mark dashboard tour as complete, clear progress
            localStorage.setItem('dashboard-tour-completed', 'v2')
            sessionStorage.removeItem(PROGRESS_KEY)
            driverRef.current?.destroy()
          },
          onDestroyed: () => {
            // No-op — don't touch sessionStorage so dashboard progress is preserved
          },
          steps: availableSteps,
        })

        driverRef.current.drive()
      } catch (e) {
        console.warn('Customers tour failed to start:', e)
      }
    }

    const tryStart = (attemptsLeft) => {
      if (cancelled) return
      const hasElements = TOUR_STEPS.some((step) =>
        document.querySelector(step.element)
      )
      if (hasElements) {
        requestAnimationFrame(() => {
          if (!cancelled) startTour()
        })
      } else if (attemptsLeft > 0) {
        timer = setTimeout(() => tryStart(attemptsLeft - 1), 500)
      }
    }

    timer = setTimeout(() => tryStart(5), 1000)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (driverRef.current) {
        driverRef.current.destroy()
      }
    }
  }, [ready, navigate])
}
