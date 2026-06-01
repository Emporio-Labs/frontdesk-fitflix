'use client'

import { Input } from '@/components/ui/input'
import {
  IconFlame,
  IconMeat,
  IconBread,
  IconButterfly,
  IconDroplet,
  IconSparkles,
} from '@tabler/icons-react'

export interface NutritionTargetValues {
  calories: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  waterMl: number | null
}

interface NutritionTargetCardsProps {
  value: NutritionTargetValues
  onChange: (next: NutritionTargetValues) => void
  autoFilled?: boolean
}

interface FieldConfig {
  key: keyof NutritionTargetValues
  label: string
  unit: string
  icon: React.ElementType
}

const FIELDS: FieldConfig[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', icon: IconFlame },
  { key: 'proteinG', label: 'Protein', unit: 'g', icon: IconMeat },
  { key: 'carbsG', label: 'Carbs', unit: 'g', icon: IconBread },
  { key: 'fatG', label: 'Fat', unit: 'g', icon: IconButterfly },
  { key: 'waterMl', label: 'Water', unit: 'ml', icon: IconDroplet },
]

export function NutritionTargetCards({
  value,
  onChange,
  autoFilled,
}: NutritionTargetCardsProps) {
  const update = (key: keyof NutritionTargetValues, raw: string) => {
    const num = raw === '' ? null : Number(raw)
    onChange({
      ...value,
      [key]: num != null && Number.isFinite(num) ? num : null,
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Nutritional Targets</h3>
          <p className="text-xs text-muted-foreground">
            Editable daily targets — saved with the plan
          </p>
        </div>
        {autoFilled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <IconSparkles className="h-3 w-3" />
            Auto-filled — edit to override
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {FIELDS.map(({ key, label, unit, icon: Icon }) => (
          <div
            key={key}
            className="rounded-lg border bg-card px-3 py-3 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <Input
                type="number"
                inputMode="numeric"
                step="any"
                min={0}
                className="h-9 text-base font-semibold px-2"
                value={value[key] ?? ''}
                onChange={(e) => update(key, e.target.value)}
                placeholder="—"
              />
              <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
