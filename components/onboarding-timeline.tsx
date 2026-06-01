import { IconCheck } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import type { OnboardingStep } from '@/lib/services/user.service'

export const ONBOARDING_STEP_ORDER: { key: OnboardingStep; label: string }[] = [
  { key: 'HEALTH_MARKERS', label: 'Health Markers' },
  { key: 'HEALTH_GOALS', label: 'Health Goals' },
  { key: 'CONSENT', label: 'Consent' },
  { key: 'REPORT_UPLOAD', label: 'Reports' },
  { key: 'SPORTS_SCIENTIST_BOOKING', label: 'Sports Scientist' },
  { key: 'NUTRITIONIST_BOOKING', label: 'Nutritionist' },
  { key: 'COMPLETED', label: 'Completed' },
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
  
  const displaySteps = ONBOARDING_STEP_ORDER.filter(
    (step) => step.key !== 'SPORTS_SCIENTIST_BOOKING'
  )

  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex items-start min-w-max gap-0 py-2">
        {displaySteps.map((step, idx) => {
          const isCompleted = completedSet.has(step.key) || step.key === 'COMPLETED' && completedSet.has('COMPLETED')
          const isCurrent = currentStep === step.key
          const isLast = idx === displaySteps.length - 1

          return (
            <li key={step.key} className="flex items-start flex-1 min-w-[100px]">
              <div className="flex flex-col items-center text-center px-1">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                    isCompleted
                      ? 'bg-primary text-primary-foreground border-primary'
                      : isCurrent
                      ? 'border-primary text-primary bg-background'
                      : 'bg-muted text-muted-foreground border-border'
                  )}
                >
                  {isCompleted ? <IconCheck className="h-4 w-4" /> : idx + 1}
                </div>
                <span
                  className={cn(
                    'mt-2 text-[11px] leading-tight max-w-[80px]',
                    isCompleted || isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mt-4 h-px flex-1 min-w-[12px]',
                    isCompleted ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
