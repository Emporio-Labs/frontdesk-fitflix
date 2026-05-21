'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdherenceBar } from '@/components/nutrition/adherence-bar'
import type { MacroTarget } from '@/lib/types/nutrition'

interface MacroSummaryProps {
  caloriesKcal: number
  macros?: MacroTarget | null
  plannedCalories?: number
  title?: string
}

export function MacroSummary({
  caloriesKcal,
  macros,
  plannedCalories,
  title = 'Macro Summary',
}: MacroSummaryProps) {
  const proteinG = macros?.proteinG ?? 0
  const carbsG = macros?.carbsG ?? 0
  const fatG = macros?.fatG ?? 0
  const totalMacroGrams = proteinG + carbsG + fatG || 1
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{Math.round(caloriesKcal)}</span>
          <span className="text-muted-foreground">
            kcal{plannedCalories ? ` / ${Math.round(plannedCalories)} planned` : ''}
          </span>
        </div>
        {plannedCalories ? (
          <AdherenceBar
            label="Calorie target"
            value={caloriesKcal}
            max={plannedCalories}
          />
        ) : null}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border p-3">
            <div className="text-lg font-semibold">{Math.round(proteinG)}g</div>
            <div className="text-xs text-muted-foreground">Protein</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-lg font-semibold">{Math.round(carbsG)}g</div>
            <div className="text-xs text-muted-foreground">Carbs</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-lg font-semibold">{Math.round(fatG)}g</div>
            <div className="text-xs text-muted-foreground">Fat</div>
          </div>
        </div>
        <AdherenceBar
          label="Protein share"
          value={proteinG}
          max={totalMacroGrams}
        />
      </CardContent>
    </Card>
  )
}
