'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useLogMeal } from '@/hooks/use-nutrition'
import type { MealLog, StoredMeal } from '@/lib/types/nutrition'
import { MEAL_TYPE_LABELS } from '@/lib/types/nutrition'
import {
  normalizeMeal,
  optionCalories,
} from '@/lib/nutrition-normalize'
import { cn } from '@/lib/utils'

interface MealLogRowProps {
  planId: string
  date: string
  meal: StoredMeal
  log?: MealLog
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

  // Normalize to handle both old flat meals and new option-based meals.
  // If backend strips `options`, falls back to `items` transparently.
  const normalized = normalizeMeal(meal)

  // Prefer the selected option if present; else fall back to default.
  const activeOption =
    log?.selectedOptionId
      ? (normalized.options.find((o) => o.optionId === log.selectedOptionId) ??
          normalized.defaultOption)
      : normalized.defaultOption

  const calories = optionCalories(activeOption)

  const toggle = (next: boolean) => {
    logMeal.mutate({
      planId,
      date,
      slot: meal.mealType,
      consumed: next,
    })
  }

  const hasMultipleOptions = normalized.options.length > 1

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-lg border p-3',
        consumed && 'bg-muted/50'
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Checkbox
          checked={consumed}
          disabled={!editable || logMeal.isPending}
          onCheckedChange={(v) => toggle(!!v)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">
              {normalized.name ||
                (MEAL_TYPE_LABELS[meal.mealType] ?? meal.mealType)}
            </span>
            {hasMultipleOptions && (
              <Badge variant="secondary" className="text-xs">
                {activeOption.label}
              </Badge>
            )}
            {normalized.timelineSlot &&
              normalized.timelineSlot !==
                (MEAL_TYPE_LABELS[meal.mealType] as string) && (
                <span className="text-xs text-muted-foreground">
                  · {normalized.timelineSlot.replace(/([a-z])([A-Z])/g, '$1 $2')}
                </span>
              )}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {activeOption.items.length
              ? activeOption.items
                  .map((i) => `${i.foodName} (${i.quantityG}g)`)
                  .join(', ')
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
