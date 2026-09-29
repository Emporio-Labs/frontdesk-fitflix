'use client'

import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/skeleton-loader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { MacroSummary } from '@/components/nutrition/macro-summary'
import { HydrationWidget } from '@/components/nutrition/hydration-widget'
import { MealLogRow } from '@/components/nutrition/meal-log-row'
import { AdherenceChart } from '@/components/nutrition/adherence-chart'
import { NutritionStatusCell } from '@/components/nutrition/nutrition-status-cell'
import {
  useNutritionPlans,
  useMealLogs,
  useAdherence,
  useNutritionProgress,
} from '@/hooks/use-nutrition'
import { getTodayDateKey } from '@/lib/utils'
import { NUTRITION_GOAL_LABELS } from '@/lib/types/nutrition'
import type { StoredMeal } from '@/lib/types/nutrition'
import {
  IconSalad,
  IconChartLine,
  IconClipboardList,
} from '@tabler/icons-react'

interface ClientNutritionWorkspaceProps {
  userId: string
}

function daysAgoKey(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function ClientNutritionWorkspace({ userId }: ClientNutritionWorkspaceProps) {
  const today = getTodayDateKey()
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null)

  const adherenceFrom = daysAgoKey(13)
  const adherenceTo = today

  const { data: plans = [], isLoading: plansLoading } = useNutritionPlans(userId)
  const activePlan = useMemo(
    () => plans.find((p) => p.status === 'Active') ?? plans[0],
    [plans]
  )
  const planId = activePlan?._id ?? ''

  const { data: mealLogs = [] } = useMealLogs(planId, selectedDate, userId)
  const { data: adherence = [] } = useAdherence(userId, adherenceFrom, adherenceTo)
  const { data: progress = [] } = useNutritionProgress(userId)

  const logBySlot = useMemo(() => {
    const map = new Map<string, (typeof mealLogs)[number]>()
    for (const l of mealLogs) {
      const key = l.slot || l.mealType
      if (key) map.set(key, l)
    }
    return map
  }, [mealLogs])

  const currentDayNumber = useMemo(() => {
    if (!activePlan?.startDate) return 1
    const start = new Date(activePlan.startDate)
    if (isNaN(start.getTime())) return 1
    const target = new Date(selectedDate)
    start.setHours(0, 0, 0, 0)
    target.setHours(0, 0, 0, 0)
    const diffDays = Math.floor(
      (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays < 0) return 1
    const duration =
      activePlan.durationDays && activePlan.durationDays > 0 ? activePlan.durationDays : 7
    return (diffDays % duration) + 1
  }, [activePlan?.startDate, activePlan?.durationDays, selectedDate])

  const activeDayNum = selectedDayNumber ?? currentDayNumber

  const activeDay = useMemo(() => {
    return (
      activePlan?.days?.find((d) => d.dayNumber === activeDayNum) ?? activePlan?.days?.[0]
    )
  }, [activePlan?.days, activeDayNum])

  const dayMeals: StoredMeal[] = activeDay?.meals ?? []

  const adherenceSummary = useMemo(() => {
    if (!adherence.length) return { avg: 0, onTrack: 0, offTrack: 0 }
    const avg = Math.round(
      adherence.reduce((s, a) => s + (a.adherencePct || 0), 0) / adherence.length
    )
    const onTrack = adherence.filter((a) => a.status === 'on_track').length
    const offTrack = adherence.filter((a) => a.status === 'off_track').length
    return { avg, onTrack, offTrack }
  }, [adherence])

  if (plansLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!activePlan) {
    return (
      <EmptyState
        icon={<IconSalad className="h-10 w-10 text-muted-foreground" />}
        title="No nutrition plan assigned"
        description="Assign a plan to this member to see their meal log, adherence, hydration and progress."
      />
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{activePlan.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {NUTRITION_GOAL_LABELS[activePlan.goal] ?? activePlan.goal}
                {activePlan.startDate
                  ? ` · Started ${new Date(activePlan.startDate).toLocaleDateString()}`
                  : ''}
                {activePlan.endDate
                  ? ` · Ends ${new Date(activePlan.endDate).toLocaleDateString()}`
                  : ''}
              </p>
            </div>
            <NutritionStatusCell status={activePlan.status} />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <MacroSummary
            caloriesKcal={activePlan.targetCaloriesKcal ?? 0}
            macros={activePlan.targetMacros}
            title="Plan Targets"
          />
          <HydrationWidget userId={userId} date={selectedDate} editable={false} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <IconClipboardList className="w-5 h-5 text-primary" />
                    Meal Log
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Day {activeDayNum} of{' '}
                    {activePlan.durationDays || activePlan.days?.length || 7} ·{' '}
                    {new Date(selectedDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={(e) => {
                    setSelectedDate(e.target.value || today)
                    setSelectedDayNumber(null)
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm"
                />
              </div>
              {activePlan.days && activePlan.days.length > 1 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {activePlan.days.map((d) => (
                    <Button
                      key={d.dayNumber}
                      variant={activeDayNum === d.dayNumber ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setSelectedDayNumber(d.dayNumber)}
                    >
                      Day {d.dayNumber}
                    </Button>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {dayMeals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No meals configured for Day {activeDayNum}.
                </p>
              ) : (
                dayMeals.map((meal, i) => (
                  <MealLogRow
                    key={`${meal.mealType}-${i}`}
                    planId={activePlan._id}
                    date={selectedDate}
                    meal={meal}
                    log={logBySlot.get(meal.mealType)}
                    editable={false}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <IconChartLine className="w-5 h-5 text-emerald-500" />
            Adherence (last 14 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {adherence.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No adherence data recorded yet.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold">{adherenceSummary.avg}%</div>
                  <div className="text-xs text-muted-foreground">Avg adherence</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold text-emerald-600">
                    {adherenceSummary.onTrack}
                  </div>
                  <div className="text-xs text-muted-foreground">Days on track</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold text-red-600">
                    {adherenceSummary.offTrack}
                  </div>
                  <div className="text-xs text-muted-foreground">Days off track</div>
                </div>
              </div>
              <AdherenceChart data={adherence} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {progress.length === 0 ? (
            <EmptyState
              title="No progress entries"
              description="Weight and body-fat history will appear here once logged."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Body Fat</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progress.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {p.weight != null
                          ? String(p.weight).toLowerCase().endsWith('kg')
                            ? p.weight
                            : `${p.weight} kg`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {p.bodyFatPct != null
                          ? String(p.bodyFatPct).endsWith('%')
                            ? p.bodyFatPct
                            : `${p.bodyFatPct}%`
                          : '—'}
                      </TableCell>
                      <TableCell>{p.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
