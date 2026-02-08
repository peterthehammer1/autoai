import * as React from "react"
import { cn } from "@/lib/utils"

const CircularProgress = React.forwardRef(({ 
  value = 0, 
  size = 120, 
  strokeWidth = 10,
  className,
  showValue = true,
  valueClassName,
  label,
  labelClassName,
  color = "primary",
  trackColor = "#e2e8f0",
  ...props 
}, ref) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  const colorMap = {
    primary: "#3b82f6",
    emerald: "#10b981",
    green: "#22c55e",
    amber: "#f59e0b",
    red: "#ef4444",
    violet: "#8b5cf6",
    blue: "#3b82f6",
    slate: "#475569",
  }

  const strokeColor = colorMap[color] || color

  return (
    <div 
      ref={ref}
      className={cn("relative inline-flex items-center justify-center", className)} 
      {...props}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {(showValue || label) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showValue && (
            <span className={cn(
              "text-2xl font-bold text-slate-900",
              valueClassName
            )}>
              {Math.round(value)}%
            </span>
          )}
          {label && (
            <span className={cn(
              "text-xs text-slate-500 mt-0.5",
              labelClassName
            )}>
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  )
})
CircularProgress.displayName = "CircularProgress"

// Mini version for inline use
const CircularProgressMini = React.forwardRef(({ 
  value = 0, 
  size = 40, 
  strokeWidth = 4,
  className,
  color = "primary",
  ...props 
}, ref) => {
  return (
    <CircularProgress
      ref={ref}
      value={value}
      size={size}
      strokeWidth={strokeWidth}
      showValue={false}
      className={className}
      color={color}
      {...props}
    />
  )
})
CircularProgressMini.displayName = "CircularProgressMini"

export { CircularProgress, CircularProgressMini }
