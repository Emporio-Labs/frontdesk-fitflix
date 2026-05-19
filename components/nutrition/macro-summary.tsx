'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdherenceBar } from '@/components/nutrition/adherence-bar'
import type { Macros } from '@/lib/types/nutrition'

interface MacroSummaryProps {
  calories: number
  macros: Macros
  /** Optional planned/target calories to show progress against */
  plannedCalories?: number
  title?: string
}

export function MacroSummary({
  calories,
  macros,
  plannedCalories,
  title = 'Macro Summary',
}: MacroSummaryProps) {
  const totalMacroGrams = macros.protein + macros.carbs + macros.fat || 1
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{Math.round(calories)}</span>
          <span className="text-muted-foreground">
            kcal{plannedCalories ? ` / ${Math.round(plannedCalories)} planned` : ''}
          </span>
        </div>
        {plannedCalories ? (
          <AdherenceBar
            label="Calorie target"
            value={calories}
            max={plannedCalories}
          />
        ) : null}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border p-3">
            <div className="text-lg font-semibold">{Math.round(macros.protein)}g</div>
            <div className="text-xs text-muted-foreground">Protein</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-lg font-semibold">{Math.round(macros.carbs)}g</div>
            <div className="text-xs text-muted-foreground">Carbs</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-lg font-semibold">{Math.round(macros.fat)}g</div>
            <div className="text-xs text-muted-foreground">Fat</div>
          </div>
        </div>
        <AdherenceBar
          label="Protein share"
          value={macros.protein}
          max={totalMacroGrams}
        />
      </CardContent>
    </Card>
  )
}
