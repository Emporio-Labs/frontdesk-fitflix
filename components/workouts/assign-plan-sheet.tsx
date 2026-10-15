'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  IconAlertTriangle,
  IconCalendar,
  IconCheck,
  IconLoader2,
  IconSearch,
  IconSparkles,
} from '@tabler/icons-react'
import { useAssignWorkoutPlan, useWorkoutPlan, useWorkoutPlans } from '@/hooks/use-workout-plans'
import { matchPlanToMember } from '@/lib/workout-plan-match'
import { normalizeApiPlan } from '@/lib/normalize-workout-plan'
import { cn } from '@/lib/utils'
import { DIFFICULTIES, PLAN_GOALS, type WorkoutPlan } from '@/types/workout'
import type { MemberAssignment } from '@/lib/services/trainer-workout.service'

const ALL = 'all'

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const addDays = (iso: string, days: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d + days)
}

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export interface AssignPlanMember {
  _id: string
  username?: string
  age?: number
  dateOfBirth?: string
  healthGoals?: string[]
}

/**
 * Assign a template to one member: pick (recommended first) → preview the
 * days → choose a start date. The backend copies the plan into the member's
 * own schedule, so "Assign & customize" edits that copy, never the template.
 */
export function AssignPlanSheet({
  open,
  onOpenChange,
  member,
  currentAssignment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: AssignPlanMember
  currentAssignment?: MemberAssignment | null
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [goal, setGoal] = useState(ALL)
  const [difficulty, setDifficulty] = useState(ALL)
  const [selectedId, setSelectedId] = useState('')
  const [startDate, setStartDate] = useState(todayIso)

  const { data: listData, isLoading } = useWorkoutPlans({ isTemplate: true, status: 'Active', limit: 100 })
  const assignMutation = useAssignWorkoutPlan()

  const ranked = useMemo(() => {
    const plans = listData?.plans ?? []
    return plans
      .map((plan) => ({ plan, match: matchPlanToMember(plan, member) }))
      .sort((a, b) => b.match.score - a.match.score || a.plan.name.localeCompare(b.plan.name))
  }, [listData, member])

  const bestScore = ranked[0]?.match.score ?? 0

  const visible = ranked.filter(({ plan }) => {
    const term = search.trim().toLowerCase()
    return (
      (goal === ALL || plan.goal === goal) &&
      (difficulty === ALL || plan.difficulty === difficulty) &&
      (!term ||
        plan.name.toLowerCase().includes(term) ||
        (plan.templateCategory ?? '').toLowerCase().includes(term))
    )
  })

  // Preselect the best match each time the sheet opens.
  useEffect(() => {
    if (!open) return
    setStartDate(todayIso())
    if (!selectedId && ranked.length > 0) setSelectedId(ranked[0].plan._id)
  }, [open, ranked.length])

  const activeAssignment =
    currentAssignment?.status?.toLowerCase() === 'active' ? currentAssignment : null
  const alreadyOnSelected = !!activeAssignment && activeAssignment.planId?._id === selectedId

  const handleAssign = async (customize: boolean) => {
    if (!selectedId || !startDate) return
    try {
      await assignMutation.mutateAsync({
        id: selectedId,
        payload: { userIds: [member._id], startDate: new Date(startDate).toISOString() },
      })
      onOpenChange(false)
      setSelectedId('')
      if (customize) router.push(`/dashboard/workouts/members/${member._id}`)
    } catch {
      // toast shown by the hook
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Assign workout plan</SheetTitle>
          <SheetDescription>
            Pick a template for {member.username || 'this member'}. They get their own copy, so changes
            for them never touch the template.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All goals</SelectItem>
                {PLAN_GOALS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="sm:w-36">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All levels</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template list */}
          <div className="rounded-lg border max-h-64 overflow-y-auto divide-y">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No templates match.</p>
            ) : (
              visible.map(({ plan, match }) => {
                const selected = plan._id === selectedId
                const recommended = bestScore > 0 && match.score === bestScore
                return (
                  <button
                    key={plan._id}
                    type="button"
                    onClick={() => setSelectedId(plan._id)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors',
                      selected ? 'bg-primary/10' : 'hover:bg-muted/50'
                    )}
                  >
                    <span
                      className={cn(
                        'h-4 w-4 rounded-full border flex items-center justify-center shrink-0',
                        selected && 'bg-primary border-primary text-primary-foreground'
                      )}
                    >
                      {selected && <IconCheck className="h-3 w-3" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{plan.name}</span>
                        {recommended && (
                          <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                            <IconSparkles className="h-3 w-3" />
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {PLAN_GOALS.find((g) => g.value === plan.goal)?.label ?? plan.goal} · {plan.difficulty} ·{' '}
                        {plan.days.length} days
                        {recommended && match.reasons.length > 0 && ` · matches ${match.reasons.join(', ')}`}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {selectedId && <PlanPreview planId={selectedId} startDate={startDate} />}

          {/* Start date */}
          <div className="rounded-lg border p-3 space-y-2">
            <Label htmlFor="assign-start" className="flex items-center gap-1.5 text-xs font-semibold">
              <IconCalendar className="h-4 w-4" />
              Start date
            </Label>
            <Input
              id="assign-start"
              type="date"
              min={todayIso()}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="sm:w-48"
            />
            <p className="text-[11px] text-muted-foreground">
              Day 1 is on this date and each plan day is one calendar day. Missed days roll forward.
            </p>
          </div>

          {activeAssignment && (
            <div
              className={cn(
                'rounded-lg border p-3 text-sm flex gap-2',
                alreadyOnSelected
                  ? 'border-muted bg-muted/40'
                  : 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
              )}
            >
              <IconAlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {alreadyOnSelected ? (
                <span>
                  {member.username || 'This member'} is already on this plan. Edit their schedule instead of
                  assigning it again.
                </span>
              ) : (
                <span>
                  This replaces <strong>{activeAssignment.planId?.name ?? 'their current plan'}</strong> (
                  {activeAssignment.dayProgress.filter((d) => d.status === 'completed').length} of{' '}
                  {activeAssignment.dayProgress.length} days done). Their progress on it is kept in history.
                </span>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="border-t p-4 flex-row justify-end gap-2">
          <Button
            variant="outline"
            disabled={!selectedId || alreadyOnSelected || assignMutation.isPending}
            onClick={() => handleAssign(true)}
          >
            Assign &amp; customize
          </Button>
          <Button
            disabled={!selectedId || alreadyOnSelected || assignMutation.isPending}
            onClick={() => handleAssign(false)}
          >
            {assignMutation.isPending && <IconLoader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Assign
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** Day-by-day calendar of the selected template, with the exercises of one day. */
function PlanPreview({ planId, startDate }: { planId: string; startDate: string }) {
  const { data, isLoading } = useWorkoutPlan(planId)
  const [dayIndex, setDayIndex] = useState(0)

  useEffect(() => setDayIndex(0), [planId])

  if (isLoading || !data) return <Skeleton className="h-40 w-full" />

  const plan: WorkoutPlan = normalizeApiPlan(data)
  const days = [...plan.days].sort((a, b) => a.dayNumber - b.dayNumber)
  const day = days[dayIndex]
  const end = addDays(startDate, Math.max(days.length - 1, 0))

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{plan.name}</p>
        <p className="text-xs text-muted-foreground">
          {days.length} days · ends {formatDate(end)}
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => (
          <button
            key={d.dayNumber}
            type="button"
            onClick={() => setDayIndex(i)}
            title={d.name}
            className={cn(
              'rounded-md border px-1 py-1.5 text-center transition-colors',
              i === dayIndex ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
              d.isRestDay && 'bg-muted/40 text-muted-foreground'
            )}
          >
            <div className="text-[10px] font-semibold">D{d.dayNumber}</div>
            <div className="text-[10px]">{d.isRestDay ? 'Rest' : d.exercises.length}</div>
          </button>
        ))}
      </div>

      {day && (
        <div className="space-y-1">
          <p className="text-xs font-semibold">
            Day {day.dayNumber} · {day.name}
            <span className="font-normal text-muted-foreground"> · {formatDate(addDays(startDate, dayIndex))}</span>
          </p>
          {day.isRestDay || day.exercises.length === 0 ? (
            <p className="text-xs text-muted-foreground">Rest day</p>
          ) : (
            <ul className="text-xs divide-y rounded-md border">
              {day.exercises.map((ex, i) => (
                <li key={i} className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <span className="truncate">
                    <span className="text-muted-foreground capitalize">{ex.section ?? 'workout'} · </span>
                    {ex.exercise?.name ?? 'Exercise'}
                  </span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {ex.durationSeconds
                      ? `${ex.targetSets} × ${ex.durationSeconds}s`
                      : `${ex.targetSets} × ${ex.targetReps}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
