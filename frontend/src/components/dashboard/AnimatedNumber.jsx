import { useState, useEffect } from 'react'

function AnimatedNumber({ value, prefix = '', suffix = '', duration = 1000 }) {
  const [displayValue, setDisplayValue] = useState(0)
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0 : value || 0

  useEffect(() => {
    const startTime = Date.now()
    const startValue = displayValue

    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = startValue + (numericValue - startValue) * easeOut

      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [numericValue])

  return (
    <span>
      {prefix}{Math.round(displayValue).toLocaleString()}{suffix}
    </span>
  )
}

export default AnimatedNumber
