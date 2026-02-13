import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCents } from '@/lib/utils'
import {
  ArrowUpRight,
  ArrowDownRight,
  PhoneCall,
  CalendarCheck,
  DollarSign,
  Receipt,
  Smile,
  UserPlus,
} from 'lucide-react'

function useAnimatedNumber(target, duration = 800) {
  const [display, setDisplay] = useState(0)
  const raf = useRef(null)

  useEffect(() => {
    if (target == null) return
    const num = typeof target === 'number' ? target : parseFloat(String(target).replace(/[^0-9.-]/g, '')) || 0
    const start = performance.now()

    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(num * eased))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }

    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration])

  return display
}

function StatCard({ title, value, change, changeLabel, icon: Icon, iconColor, iconBg, prefix = '', suffix = '', loading, animateValue }) {
  const isPositive = change > 0
  const isNegative = change < 0
  const animatedNum = useAnimatedNumber(animateValue ? (typeof value === 'number' ? value : 0) : null)

  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-slate-500 mb-1 truncate">{title}</p>
            {loading ? (
              <div className="h-6 w-16 bg-slate-100 animate-pulse rounded" />
            ) : (
              <p className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {prefix}{animateValue && typeof value === 'number' ? animatedNum.toLocaleString() : (typeof value === 'number' ? value.toLocaleString() : value)}{suffix}
              </p>
            )}
            {change !== undefined && change !== null && (
              <div className={cn(
                "flex items-center gap-0.5 mt-1 text-[10px] font-medium",
                isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-slate-500"
              )}>
                {isPositive ? <ArrowUpRight className="h-3 w-3 shrink-0" /> :
                 isNegative ? <ArrowDownRight className="h-3 w-3 shrink-0" /> : null}
                <span className="shrink-0">{isPositive ? '+' : ''}{change}%</span>
                {changeLabel && <span className="text-slate-400 font-normal truncate">{changeLabel}</span>}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn("p-1.5 rounded-lg shrink-0", iconBg || "bg-slate-100")}>
              <Icon className={cn("h-4 w-4", iconColor || "text-slate-600")} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function StatCards({ comprehensive, loading }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        title="Total Calls"
        value={comprehensive?.calls?.total || 0}
        change={comprehensive?.calls?.change}
        changeLabel="vs last"
        icon={PhoneCall}
        iconColor="text-blue-600"
        iconBg="bg-blue-100"
        loading={loading}
        animateValue
      />
      <StatCard
        title="Booked"
        value={comprehensive?.calls?.booked || 0}
        icon={CalendarCheck}
        iconColor="text-emerald-600"
        iconBg="bg-emerald-100"
        loading={loading}
        animateValue
      />
      <StatCard
        title="Revenue"
        value={formatCents(comprehensive?.revenue?.period_total || 0)}
        change={comprehensive?.revenue?.change}
        changeLabel="vs last"
        icon={DollarSign}
        iconColor="text-slate-600"
        iconBg="bg-slate-100"
        loading={loading}
      />
      <StatCard
        title="Avg Ticket"
        value={formatCents(comprehensive?.revenue?.avg_ticket || 0)}
        icon={Receipt}
        iconColor="text-amber-600"
        iconBg="bg-amber-100"
        loading={loading}
      />
      <StatCard
        title="Satisfaction"
        value={comprehensive?.calls?.satisfaction_rate || 0}
        suffix="%"
        icon={Smile}
        iconColor="text-violet-600"
        iconBg="bg-violet-100"
        loading={loading}
        animateValue
      />
      <StatCard
        title="New Customers"
        value={comprehensive?.customers?.new || 0}
        change={comprehensive?.customers?.change}
        changeLabel="vs last"
        icon={UserPlus}
        iconColor="text-cyan-600"
        iconBg="bg-cyan-100"
        loading={loading}
        animateValue
      />
    </div>
  )
}
