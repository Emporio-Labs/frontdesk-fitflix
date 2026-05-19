'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { useLogMeal } from '@/hooks/use-nutrition'
import type { MealLog, TemplateMeal } from '@/lib/types/nutrition'
import { cn } from '@/lib/utils'

interface MealLogRowProps {
  planId: string
  date: string
  meal: TemplateMeal
  log?: MealLog
  /** When false the checkbox is read-only (admin viewing a member's plan) */
  editable?: boolean
}

export function MealLogRow({
  planId,
  date,
  meal,
  log,
  editable = true,
}: MealLogRowProps) {
  const logMeal = useLogMeal(planId, date)
  const consumed = log?.consumed ?? false

  const calories = meal.items.reduce((s, i) => s + (Number(i.calories) || 0), 0)

  const toggle = (next: boolean) => {
    logMeal.mutate({
      planId,
      date,
      slot: meal.slot,
      consumed: next,
    })
  }

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-lg border p-3',
        consumed && 'bg-muted/50'
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={consumed}
          disabled={!editable || logMeal.isPending}
          onCheckedChange={(v) => toggle(!!v)}
          className="mt-1"
        />
        <div>
          <div className="font-medium">{meal.slot}</div>
          <div className="text-sm text-muted-foreground">
            {meal.items.length
              ? meal.items.map((i) => `${i.foodName} (${i.quantity}${i.unit})`).join(', ')
              : 'No foods'}
          </div>
        </div>
      </div>
      <div className="text-sm font-medium whitespace-nowrap">
        {Math.round(calories)} kcal
      </div>
    </div>
  )
}
