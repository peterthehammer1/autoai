import { cn } from '@/lib/utils'
import { Check, ChevronRight } from 'lucide-react'

function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isActive = index === currentStep
        const isCompleted = index < currentStep

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                isActive && 'bg-primary text-primary-foreground',
                isCompleted && 'text-primary',
                !isActive && !isCompleted && 'text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2',
                  isActive && 'border-primary-foreground bg-primary-foreground/20',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  !isActive && !isCompleted && 'border-muted-foreground/50'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span className="hidden sm:inline text-sm font-medium">
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default StepIndicator
