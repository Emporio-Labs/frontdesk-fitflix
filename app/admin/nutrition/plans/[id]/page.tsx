'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SkeletonCard } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import { MacroSummary } from '@/components/nutrition/macro-summary'
import { MealLogRow } from '@/components/nutrition/meal-log-row'
import { HydrationWidget } from '@/components/nutrition/hydration-widget'
import { NutritionStatusCell } from '@/components/nutrition/nutrition-status-cell'
import { ProgressForm } from '@/components/nutrition/progress-form'
import {
  IconArrowLeft,
  IconChartLine,
  IconFileDownload,
} from '@tabler/icons-react'
import {
  useNutritionPlan,
  useMealLogs,
  useAdherence,
  useNutritionProgress,
} from '@/hooks/use-nutrition'
import { useCanAccess } from '@/hooks/use-auth'

export default function NutritionPlanDetailPage() {
  const params = useParams()
  const id = String(params?.id ?? '')
  const today = new Date().toISOString().slice(0, 10)
  const [progressOpen, setProgressOpen] = useState(false)

  const { data: plan, isLoading, isError } = useNutritionPlan(id)
  const { data: mealLogs = [] } = useMealLogs(id, today)
  const { data: adherence = [] } = useAdherence(plan?.userId ?? '')
  const { data: progress = [] } = useNutritionProgress(plan?.userId ?? '')
  const canUpdate = useCanAccess('nutrition', 'update')

  const logBySlot = useMemo(() => {
    const map = new Map<string, (typeof mealLogs)[number]>()
    for (const l of mealLogs) map.set(l.slot, l)
    return map
  }, [mealLogs])

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SkeletonCard />
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Link href="/admin/nutrition/plans">
          <Button variant="ghost" size="sm">
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Plan not found</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            This nutrition plan could not be loaded.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Link href="/admin/nutrition/plans">
        <Button variant="ghost" size="sm">
          <IconArrowLeft className="w-4 h-4 mr-2" />
          Back to Plans
        </Button>
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{plan.name}</h2>
          <p className="text-muted-foreground">
            {plan.userName ?? plan.userId} · {plan.goal.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NutritionStatusCell status={plan.status} />
          <Button
            variant="outline"
            size="sm"
            disabled
            title="PDF export coming soon"
          >
            <IconFileDownload className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <MacroSummary
            calories={plan.totalCalories}
            macros={plan.macros}
            title="Plan Targets"
          />
          <HydrationWidget
            userId={plan.userId}
            date={today}
            editable={false}
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Meals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.meals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No meals in this plan.
                </p>
              ) : (
                plan.meals.map((meal, i) => (
                  <MealLogRow
                    key={`${meal.slot}-${i}`}
                    planId={plan._id}
                    date={today}
                    meal={meal}
                    log={logBySlot.get(meal.slot)}
                    editable={false}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconChartLine className="w-5 h-5" />
                Adherence (recent)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {adherence.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No adherence data yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Consumed / Planned</TableHead>
                        <TableHead>Meals</TableHead>
                        <TableHead>Adherence</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adherence.slice(0, 14).map((a) => (
                        <TableRow key={a.date}>
                          <TableCell>
                            {new Date(a.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {a.consumedCalories} / {a.plannedCalories} kcal
                          </TableCell>
                          <TableCell>
                            {a.mealsCompleted} / {a.mealsPlanned}
                          </TableCell>
                          <TableCell>{Math.round(a.adherencePct)}%</TableCell>
                          <TableCell>
                            <NutritionStatusCell status={a.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Progress</CardTitle>
              {canUpdate && (
                <Button size="sm" onClick={() => setProgressOpen(true)}>
                  Log Progress
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {progress.length === 0 ? (
                <EmptyState
                  title="No progress entries"
                  description="Weight and body-fat history will appear here."
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
                          <TableCell>
                            {new Date(p.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {p.weight != null ? `${p.weight} kg` : '—'}
                          </TableCell>
                          <TableCell>
                            {p.bodyFatPct != null ? `${p.bodyFatPct}%` : '—'}
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
      </div>

      <ProgressForm
        userId={plan.userId}
        open={progressOpen}
        onOpenChange={setProgressOpen}
      />
    </div>
  )
}
