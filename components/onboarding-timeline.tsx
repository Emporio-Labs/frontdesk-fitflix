import { IconCheck } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import type { OnboardingStep } from '@/lib/services/user.service'

export const ONBOARDING_STEP_ORDER: { key: OnboardingStep; label: string }[] = [
  { key: 'ACTIVE_X_TEST', label: 'Active X test' },
  { key: 'DNA_SAMPLE', label: 'DNA sample' },
  { key: 'VALD_TEST', label: 'VALD test' },
  { key: 'NUTRITION_APPOINTMENT', label: 'Nutrition appointment' },
  { key: 'SPORT_SCIENTIST_APPOINTMENT', label: 'Sport scientist' },
  { key: 'PLAN_TRAINER_ASSIGNMENT', label: 'Plan & PT trainer' },
]

export function onboardingStepLabel(step?: string | null): string {
  if (!step) return '—'
  const found = ONBOARDING_STEP_ORDER.find((s) => s.key === step)
  if (found) return found.label
  return step
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

interface OnboardingTimelineProps {
  currentStep?: OnboardingStep
  completedSteps?: OnboardingStep[]
}

export function OnboardingTimeline({ currentStep, completedSteps = [] }: OnboardingTimelineProps) {
  const completedSet = new Set(completedSteps)

  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex min-w-max items-start gap-0 py-2">
        {ONBOARDING_STEP_ORDER.map((step, idx) => {
          const isCompleted = completedSet.has(step.key)
          const isCurrent = currentStep === step.key
          const isLast = idx === ONBOARDING_STEP_ORDER.length - 1

          return (
            <li key={step.key} className="flex min-w-[120px] flex-1 items-start">
              <div className="flex flex-col items-center px-1 text-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                    isCompleted
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCurrent
                        ? 'border-primary bg-background text-primary'
                        : 'border-border bg-muted text-muted-foreground',
                  )}
                >
                  {isCompleted ? <IconCheck className="h-4 w-4" /> : idx + 1}
                </div>
                <span
                  className={cn(
                    'mt-2 max-w-[100px] text-[11px] leading-tight',
                    isCompleted || isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className={cn('mt-4 h-px min-w-[16px] flex-1', isCompleted ? 'bg-primary' : 'bg-border')} />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
