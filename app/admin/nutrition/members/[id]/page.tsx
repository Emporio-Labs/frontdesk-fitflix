'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
import { StatusBadge } from '@/components/status-badge'
import { MacroSummary } from '@/components/nutrition/macro-summary'
import { MealLogRow } from '@/components/nutrition/meal-log-row'
import { NutritionStatusCell } from '@/components/nutrition/nutrition-status-cell'
import { ProgressForm } from '@/components/nutrition/progress-form'
import { AssessmentForm } from '@/components/nutrition/assessment-form'
import {
  OnboardingTimeline,
  ONBOARDING_STEP_ORDER,
} from '@/components/onboarding-timeline'
import {
  IconArrowLeft,
  IconSparkles,
} from '@tabler/icons-react'
import { useUser } from '@/hooks/use-users'
import {
  useNutritionPlans,
  useNutritionProgress,
  useMealLogs,
  useNutritionAssessment,
} from '@/hooks/use-nutrition'
import { useCanAccess } from '@/hooks/use-auth'
import {
  DIETARY_PREFERENCE_LABELS,
  LIFESTYLE_CATEGORY_LABELS,
  type DietaryPreference,
} from '@/lib/types/nutrition'

const LOGS_PAGE_SIZE = 8

function chips(values?: string[]) {
  if (!values?.length) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <Badge key={v} variant="secondary">
          {v}
        </Badge>
      ))}
    </div>
  )
}

export default function NutritionMemberProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = String(params?.id ?? '')
  const today = new Date().toISOString().slice(0, 10)

  const [tab, setTab] = useState('overview')
  const [logDate, setLogDate] = useState(today)
  const [logPage, setLogPage] = useState(0)
  const [progressOpen, setProgressOpen] = useState(false)
  const [assessmentOpen, setAssessmentOpen] = useState(false)

  const { data: user, isLoading: userLoading, isError: userError } =
    useUser(userId)
  const { data: plans = [] } = useNutritionPlans(userId)
  const { data: progress = [] } = useNutritionProgress(userId)
  const { data: assessment } = useNutritionAssessment(userId)
  const canUpdate = useCanAccess('nutrition', 'update')

  const activePlan = useMemo(
    () => plans.find((p) => p.status === 'Active') ?? plans[0],
    [plans]
  )

  const { data: mealLogs = [] } = useMealLogs(
    activePlan?._id ?? '',
    logDate
  )

  const logBySlot = useMemo(() => {
    const map = new Map<string, (typeof mealLogs)[number]>()
    for (const l of mealLogs) map.set(l.slot, l)
    return map
  }, [mealLogs])

  const allMeals = useMemo(
    () => activePlan?.days?.flatMap((d) => d.meals ?? []) ?? [],
    [activePlan]
  )

  const pagedMeals = useMemo(
    () =>
      allMeals.slice(
        logPage * LOGS_PAGE_SIZE,
        logPage * LOGS_PAGE_SIZE + LOGS_PAGE_SIZE
      ),
    [allMeals, logPage]
  )
  const pageCount = Math.max(1, Math.ceil(allMeals.length / LOGS_PAGE_SIZE))

  const displayName =
    user?.username || user?.email || (userLoading ? 'Loading…' : 'Unknown User')

  if (userError) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Client not found</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            This client could not be loaded.
          </CardContent>
        </Card>
      </div>
    )
  }

  const ob = user?.onboardingStatus

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Link href="/admin/nutrition">
        <Button variant="ghost" size="sm">
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{displayName}</h2>
          <p className="text-muted-foreground">
            {user?.email || '—'}
            {user?.phone ? ` · ${user.phone}` : ''}
          </p>
        </div>
        {activePlan && <NutritionStatusCell status={activePlan.status} />}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessment">Nutrition Profile</TabsTrigger>
          <TabsTrigger value="diet-plans">Diet Plans</TabsTrigger>
          <TabsTrigger value="meal-logs">Meal Logs</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        {/* ── Overview ───────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4">
          {userLoading ? (
            <SkeletonCard />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Client Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Username</span>
                    <span>{user?.username || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age</span>
                    <span>{user?.age || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender</span>
                    <span>{user?.gender || '—'}</span>
                  </div>
                  <div className="pt-2">
                    <div className="mb-1 text-muted-foreground">
                      Health Goals
                    </div>
                    {chips(user?.healthGoals)}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Onboarding</CardTitle>
                  <CardDescription>
                    {ob
                      ? `Current step: ${ob.currentStep.replace(/_/g, ' ')}`
                      : 'No onboarding data'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ob ? (
                    <OnboardingTimeline
                      currentStep={ob.currentStep}
                      completedSteps={ob.completedSteps}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Onboarding has not started for this client.
                    </p>
                  )}
                </CardContent>
              </Card>

              {activePlan ? (
                <div className="lg:col-span-3">
                  <MacroSummary
                    caloriesKcal={activePlan.targetCaloriesKcal ?? 0}
                    macros={activePlan.targetMacros}
                    title={`Active Plan — ${activePlan.name}`}
                  />
                </div>
              ) : (
                <Card className="lg:col-span-3">
                  <CardContent className="pt-6">
                    <EmptyState
                      title="No active plan"
                      description="This client has no assigned nutrition plan yet."
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Assessment (enriches onboarding, never duplicates) ───────── */}
        <TabsContent value="assessment" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>From Onboarding</CardTitle>
                <CardDescription>
                  Read-only — sourced from the client&apos;s onboarding record
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="mb-1 text-muted-foreground">Health Goals</div>
                  {chips(user?.healthGoals)}
                </div>
                <div className="space-y-1 pt-2">
                  {ONBOARDING_STEP_ORDER.filter(
                    (s) => s.key !== 'COMPLETED'
                  ).map((s) => {
                    const done = ob?.completedSteps?.includes(s.key)
                    return (
                      <div
                        key={s.key}
                        className="flex items-center justify-between"
                      >
                        <span className="text-muted-foreground">
                          {s.label}
                        </span>
                        <Badge variant={done ? 'default' : 'secondary'}>
                          {done ? 'Done' : 'Pending'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Nutrition Profile</CardTitle>
                  <CardDescription>
                    Allergies, preferences, conditions, calorie &amp; macro targets
                  </CardDescription>
                </div>
                {canUpdate && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAssessmentOpen(true)}
                  >
                    {assessment ? 'Edit Profile' : 'Add Profile'}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!assessment ? (
                  <EmptyState
                    title="No nutrition profile yet"
                    description="A structured nutrition profile has not been recorded for this client."
                  />
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Dietary Preference
                      </span>
                      <span>
                        {assessment.dietaryPreference
                          ? DIETARY_PREFERENCE_LABELS[
                              assessment.dietaryPreference as DietaryPreference
                            ]
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Meals / day
                      </span>
                      <span>{assessment.mealsPerDay ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Water target
                      </span>
                      <span>
                        {assessment.waterTargetMl != null
                          ? `${assessment.waterTargetMl} ml`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Target calories
                      </span>
                      <span>
                        {assessment.targetCaloriesKcal != null
                          ? `${assessment.targetCaloriesKcal} kcal`
                          : '—'}
                      </span>
                    </div>
                    <div className="pt-1">
                      <div className="mb-1 text-muted-foreground">
                        Preferred foods
                      </div>
                      {chips(assessment.preferredFoods)}
                    </div>
                    <div className="pt-1">
                      <div className="mb-1 text-muted-foreground">
                        Disliked foods
                      </div>
                      {chips(assessment.dislikedFoods)}
                    </div>
                    {(assessment.allergiesSnapshot?.length ||
                      assessment.medicalConditionsSnapshot?.length) && (
                      <div className="pt-1">
                        <div className="mb-1 text-muted-foreground">
                          Clinical flags
                        </div>
                        {chips([
                          ...(assessment.allergiesSnapshot ?? []),
                          ...(assessment.medicalConditionsSnapshot ?? []),
                        ])}
                      </div>
                    )}
                    {assessment.notes && (
                      <p className="pt-1 text-muted-foreground">
                        {assessment.notes}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Diet Plans ─────────────────────────────────────────────── */}
        <TabsContent value="diet-plans" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Plans</CardTitle>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <EmptyState
                  title="No plans assigned"
                  description="Assign a nutrition plan from the dashboard or Plans page."
                />
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan</TableHead>
                          <TableHead>Goal</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Start</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plans.map((p) => (
                          <TableRow key={p._id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {p.name}
                                {(p.conditionTags?.length ||
                                  p.lifestyle?.length ||
                                  p.days.some((d) =>
                                    d.meals.some((m) => m.options?.length)
                                  )) && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    <IconSparkles className="mr-0.5 h-3 w-3" />
                                    Clinical
                                  </Badge>
                                )}
                              </div>
                              {p.conditionTags?.length ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {p.conditionTags.slice(0, 3).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              {p.goal.replace(/([a-z])([A-Z])/g, '$1 $2')}
                            </TableCell>
                            <TableCell>
                              <NutritionStatusCell status={p.status} />
                            </TableCell>
                            <TableCell>
                              {p.startDate
                                ? new Date(p.startDate).toLocaleDateString()
                                : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/admin/nutrition/plans/${p._id}`}>
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Lifestyle recommendations for the active plan */}
                  {activePlan?.lifestyle?.length ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Lifestyle Recommendations
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({activePlan.name})
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {activePlan.lifestyle.map((rec, i) => (
                          <div
                            key={i}
                            className="flex gap-3 rounded-md border p-2.5 text-sm"
                          >
                            <Badge variant="secondary" className="text-xs shrink-0 self-start mt-0.5">
                              {LIFESTYLE_CATEGORY_LABELS[rec.category] ??
                                rec.category}
                            </Badge>
                            <div className="min-w-0">
                              {rec.title && (
                                <p className="font-medium">{rec.title}</p>
                              )}
                              {rec.detail && (
                                <p className="text-muted-foreground text-xs mt-0.5">
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Meal Logs (paginated) ──────────────────────────────────── */}
        <TabsContent value="meal-logs" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Meal Logs</CardTitle>
                <CardDescription>
                  {activePlan
                    ? `Plan: ${activePlan.name}`
                    : 'No active plan'}
                </CardDescription>
              </div>
              <Input
                type="date"
                value={logDate}
                onChange={(e) => {
                  setLogDate(e.target.value)
                  setLogPage(0)
                }}
                className="w-auto"
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {!activePlan || allMeals.length === 0 ? (
                <EmptyState
                  title="No meals to show"
                  description="There is no active plan with meals for this client."
                />
              ) : (
                <>
                  {pagedMeals.map((meal, i) => (
                    <MealLogRow
                      key={`${meal.mealType}-${logPage}-${i}`}
                      planId={activePlan._id}
                      date={logDate}
                      meal={meal}
                      log={logBySlot.get(meal.mealType)}
                      editable={false}
                    />
                  ))}
                  {pageCount > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-muted-foreground">
                        Page {logPage + 1} of {pageCount}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={logPage === 0}
                          onClick={() => setLogPage((p) => p - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={logPage >= pageCount - 1}
                          onClick={() => setLogPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Progress ───────────────────────────────────────────────── */}
        <TabsContent value="progress" className="mt-4">
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
        </TabsContent>

      </Tabs>

      <ProgressForm
        userId={userId}
        open={progressOpen}
        onOpenChange={setProgressOpen}
      />

      <AssessmentForm
        userId={userId}
        open={assessmentOpen}
        onOpenChange={setAssessmentOpen}
        assessment={assessment}
      />
    </div>
  )
}
