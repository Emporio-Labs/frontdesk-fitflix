'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
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
  IconFileDownload,
  IconSparkles,
} from '@tabler/icons-react'
import {
  useNutritionPlan,
  useMealLogs,
  useNutritionProgress,
} from '@/hooks/use-nutrition'
import { useCanAccess } from '@/hooks/use-auth'
import { LIFESTYLE_CATEGORY_LABELS } from '@/lib/types/nutrition'
import { Badge } from '@/components/ui/badge'
import type { StoredMeal } from '@/lib/types/nutrition'

export default function NutritionPlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? '')
  const today = new Date().toISOString().slice(0, 10)
  const [progressOpen, setProgressOpen] = useState(false)

  const { data: plan, isLoading, isError } = useNutritionPlan(id)
  const { data: mealLogs = [] } = useMealLogs(id, today)
  const { data: progress = [] } = useNutritionProgress(plan?.userId ?? '')
  const canUpdate = useCanAccess('nutrition', 'update')

  const logBySlot = useMemo(() => {
    const map = new Map<string, (typeof mealLogs)[number]>()
    for (const l of mealLogs) map.set(l.slot, l)
    return map
  }, [mealLogs])

  const allMeals: StoredMeal[] = useMemo(() => {
    if (!plan?.days) return []
    return plan.days.flatMap((d) => d.meals ?? [])
  }, [plan])

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
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <IconArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
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
      <Link href="/admin/nutrition">
        <Button variant="ghost" size="sm">
          <IconArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{plan.name}</h2>
          <p className="text-muted-foreground">
            {plan.member?.username || plan.member?.fullName || plan.member?.email || plan.userName || 'Unknown User'} · {plan.goal.replace(/([a-z])([A-Z])/g, '$1 $2')}
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

      {/* Clinical metadata: condition tags + lifestyle recommendations */}
      {(plan.conditionTags?.length || plan.lifestyle?.length) ? (
        <div className="space-y-3">
          {plan.conditionTags?.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <IconSparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Condition tags:</span>
              {plan.conditionTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          {plan.lifestyle?.length ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Lifestyle Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.lifestyle.map((rec, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-md border p-2.5 text-sm"
                  >
                    <Badge variant="secondary" className="text-xs shrink-0 self-start mt-0.5">
                      {LIFESTYLE_CATEGORY_LABELS[rec.category] ?? rec.category}
                    </Badge>
                    <div>
                      {rec.title && (
                        <p className="font-medium">{rec.title}</p>
                      )}
                      {rec.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {rec.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <MacroSummary
            caloriesKcal={plan.targetCaloriesKcal ?? 0}
            macros={plan.targetMacros}
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
              {allMeals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No meals in this plan.
                </p>
              ) : (
                allMeals.map((meal, i) => (
                  <MealLogRow
                    key={`${meal.mealType}-${i}`}
                    planId={plan._id}
                    date={today}
                    meal={meal}
                    log={logBySlot.get(meal.mealType)}
                    editable={false}
                  />
                ))
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
                            {p.weight != null ? (String(p.weight).toLowerCase().endsWith('kg') ? p.weight : `${p.weight} kg`) : '—'}
                          </TableCell>
                          <TableCell>
                            {p.bodyFatPct != null ? (String(p.bodyFatPct).endsWith('%') ? p.bodyFatPct : `${p.bodyFatPct}%`) : '—'}
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
