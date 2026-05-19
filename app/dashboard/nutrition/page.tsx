'use client'

import { useMemo, useState } from 'react'
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
import { IconFileDownload, IconSalad } from '@tabler/icons-react'
import {
  useMyNutritionPlan,
  useMealLogs,
  useAdherence,
  useNutritionProgress,
} from '@/hooks/use-nutrition'
import { useAuth } from '@/hooks/use-auth'

export default function MyNutritionPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const today = new Date().toISOString().slice(0, 10)
  const [progressOpen, setProgressOpen] = useState(false)

  const { data: plan, isLoading, isError } = useMyNutritionPlan()
  const { data: mealLogs = [] } = useMealLogs(plan?._id ?? '', today)
  const { data: adherence = [] } = useAdherence(userId)
  const { data: progress = [] } = useNutritionProgress(userId)

  const logBySlot = useMemo(() => {
    const map = new Map<string, (typeof mealLogs)[number]>()
    for (const l of mealLogs) map.set(l.slot, l)
    return map
  }, [mealLogs])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Nutrition</h2>
          <p className="text-muted-foreground">
            Your assigned plan, meals, hydration and progress
          </p>
        </div>
        <Button variant="outline" size="sm" disabled title="PDF export coming soon">
          <IconFileDownload className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : isError || !plan ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<IconSalad className="w-10 h-10" />}
              title="No nutrition plan assigned"
              description="Your nutritionist hasn't assigned a plan yet. Check back soon."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>{plan.name}</CardTitle>
                <NutritionStatusCell status={plan.status} />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {plan.goal.replace(/_/g, ' ')}
              </CardContent>
            </Card>
            <MacroSummary
              calories={plan.totalCalories}
              macros={plan.macros}
              title="Daily Targets"
            />
            <HydrationWidget userId={userId} date={today} />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Meals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.meals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No meals in your plan.
                  </p>
                ) : (
                  plan.meals.map((meal, i) => (
                    <MealLogRow
                      key={`${meal.slot}-${i}`}
                      planId={plan._id}
                      date={today}
                      meal={meal}
                      log={logBySlot.get(meal.slot)}
                      editable
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Adherence</CardTitle>
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
                          <TableHead>Adherence</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adherence.slice(0, 7).map((a) => (
                          <TableRow key={a.date}>
                            <TableCell>
                              {new Date(a.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {a.consumedCalories} / {a.plannedCalories} kcal
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
                <CardTitle>My Progress</CardTitle>
                <Button size="sm" onClick={() => setProgressOpen(true)}>
                  Log Progress
                </Button>
              </CardHeader>
              <CardContent>
                {progress.length === 0 ? (
                  <EmptyState
                    title="No progress entries"
                    description="Log your weight and body-fat to track progress."
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
      )}

      <ProgressForm
        userId={userId}
        open={progressOpen}
        onOpenChange={setProgressOpen}
      />
    </div>
  )
}
