// Backward-compat normalization adapter — the single point of truth that lets
// old flat meals (just `items[]`) and new option-based meals render through one
// uniform view model. If the backend strips `options`/`timelineSlot`/`reasoning`
// on round-trip, normalization falls back to `items` and everything renders
// exactly as it did before. Render surfaces must NEVER branch on backend shape;
// they consume the normalized shape instead.

import {
  MEALTYPE_TO_TIMELINE,
  type MealOption,
  type MealReasoning,
  type StoredDay,
  type StoredMeal,
  type StoredMealItem,
  type MealType,
  type TimelineSlot,
} from '@/lib/types/nutrition'

export interface NormalizedMealOption {
  optionId: string
  label: string
  items: StoredMealItem[]
  reasoning?: MealReasoning
  isDefault: boolean
}

export interface NormalizedMeal {
  mealType: MealType
  timelineSlot: TimelineSlot
  name: string
  timeOfDay?: string | null
  notes?: string
  reasoning?: MealReasoning
  options: NormalizedMealOption[]
  defaultOption: NormalizedMealOption
}

export interface NormalizedDay {
  dayNumber: number
  meals: NormalizedMeal[]
}

function sumCalories(items: StoredMealItem[] | undefined): number {
  if (!items?.length) return 0
  return Math.round(
    items.reduce((acc, it) => acc + (Number(it.caloriesKcal) || 0), 0)
  )
}

export function optionCalories(option: NormalizedMealOption): number {
  return sumCalories(option.items)
}

function normalizeOption(
  raw: MealOption,
  index: number,
  forcedDefault: boolean
): NormalizedMealOption {
  return {
    optionId: raw.optionId?.trim() || `opt-${index}`,
    label: raw.label?.trim() || `Option ${index + 1}`,
    items: Array.isArray(raw.items) ? raw.items : [],
    reasoning: raw.reasoning,
    isDefault: forcedDefault || raw.isDefault === true,
  }
}

export function normalizeMeal(meal: StoredMeal): NormalizedMeal {
  const rawOptions = Array.isArray(meal.options) ? meal.options : []

  let options: NormalizedMealOption[]

  if (rawOptions.length === 0) {
    // Old flat meal (or backend stripped options): synthesize a single option
    // from the canonical `items` so it renders identically to today.
    options = [
      {
        optionId: 'default',
        label: meal.name || 'Option 1',
        items: Array.isArray(meal.items) ? meal.items : [],
        reasoning: meal.reasoning,
        isDefault: true,
      },
    ]
  } else {
    options = rawOptions.map((o, i) => normalizeOption(o, i, false))
    // Guarantee exactly one default: first explicitly-flagged, else index 0.
    const firstDefault = options.findIndex((o) => o.isDefault)
    const defaultIdx = firstDefault === -1 ? 0 : firstDefault
    options = options.map((o, i) => ({ ...o, isDefault: i === defaultIdx }))
  }

  const defaultOption =
    options.find((o) => o.isDefault) ?? options[0]

  const timelineSlot: TimelineSlot =
    meal.timelineSlot ?? MEALTYPE_TO_TIMELINE[meal.mealType] ?? 'Breakfast'

  return {
    mealType: meal.mealType,
    timelineSlot,
    name: meal.name,
    timeOfDay: meal.timeOfDay,
    notes: meal.notes,
    reasoning: meal.reasoning,
    options,
    defaultOption,
  }
}

export function normalizeDay(day: StoredDay): NormalizedDay {
  return {
    dayNumber: day.dayNumber,
    meals: Array.isArray(day.meals) ? day.meals.map(normalizeMeal) : [],
  }
}

export function normalizeDays(days: StoredDay[] | undefined): NormalizedDay[] {
  if (!Array.isArray(days)) return []
  return days.map(normalizeDay)
}

// Resolve the items a member is actually following for a given meal: the
// explicitly selected option if present and valid, else the default option.
export function resolveMealItems(
  meal: NormalizedMeal,
  selectedOptionId?: string
): StoredMealItem[] {
  if (selectedOptionId) {
    const sel = meal.options.find((o) => o.optionId === selectedOptionId)
    if (sel) return sel.items
  }
  return meal.defaultOption.items
}
