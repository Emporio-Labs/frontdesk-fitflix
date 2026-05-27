'use client'

import { computeBmi } from '@/lib/health-insights'
import { inferNutritionGoal } from '@/lib/nutrition/derive-targets'
import { NUTRITION_GOAL_LABELS } from '@/lib/types/nutrition'
import type { User } from '@/lib/services/user.service'

interface UserClinicalSummaryProps {
  user: User | null | undefined
}

interface Card {
  label: string
  value: string
}

export function UserClinicalSummary({ user }: UserClinicalSummaryProps) {
  const weight = user?.healthMarkers?.weight
  const height = user?.healthMarkers?.height
  const ageNum = user?.age ? Number(user.age) : NaN
  const goal = NUTRITION_GOAL_LABELS[inferNutritionGoal(user?.healthGoals)]
  const bmi = computeBmi(height, weight)
  const activity = user?.healthMarkers?.activityLevel ?? null

  const cards: Card[] = [
    { label: 'Weight', value: weight != null ? `${weight} kg` : '—' },
    {
      label: 'Age',
      value: Number.isFinite(ageNum) && ageNum > 0 ? String(ageNum) : '—',
    },
    { label: 'Goal', value: goal },
    { label: 'Height', value: height != null ? `${height} cm` : '—' },
    { label: 'BMI', value: bmi != null ? String(bmi) : '—' },
    { label: 'Activity', value: activity || '—' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col justify-center rounded-lg border bg-card px-3 py-2 shadow-sm"
          style={{ minHeight: '60px' }}
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-none mb-1">
            {label}
          </span>
          <span className="text-sm font-semibold leading-none text-foreground truncate">
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}
