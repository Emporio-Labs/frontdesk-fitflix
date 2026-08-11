'use client'

import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  IconActivity,
  IconBarbell,
  IconChevronDown,
  IconChevronRight,
  IconFlame,
  IconClock,
  IconTargetArrow,
} from '@tabler/icons-react'
import {
  useMemberWorkoutHistory,
  useMemberWorkoutStats,
  useMemberWorkoutSession,
} from '@/hooks/use-member-workout'
import type { WorkoutHistoryEntry } from '@/lib/services/trainer-workout.service'

const WEEKS_CHARTED = 12

/** Monday-based week start, normalised to local midnight. */
function startOfWeek(input: Date): Date {
  const d = new Date(input)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Sessions per week for the last [WEEKS_CHARTED] weeks.
 *
 * Every week in the range is emitted, including empty ones — dropping the
 * zeros would compress gaps out of the axis and make an erratic member look
 * consistent, which is the opposite of what this chart is for.
 */
function toWeeklySeries(workouts: WorkoutHistoryEntry[]) {
  const counts = new Map<number, number>()
  for (const w of workouts) {
    const key = startOfWeek(new Date(w.date)).getTime()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const series: { week: string; sessions: number }[] = []
  const cursor = startOfWeek(new Date())
  for (let i = WEEKS_CHARTED - 1; i >= 0; i--) {
    const weekStart = new Date(cursor)
    weekStart.setDate(weekStart.getDate() - i * 7)
    series.push({
      week: weekStart.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      }),
      sessions: counts.get(weekStart.getTime()) ?? 0,
    })
  }
  return series
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function statusVariant(status: WorkoutHistoryEntry['status']) {
  if (status === 'Completed') return 'default' as const
  if (status === 'Active') return 'secondary' as const
  return 'outline' as const
}

/**
 * A member's workout history — stats, weekly consistency, and an expandable
 * session timeline.
 *
 * Read-only by design: this is the same view for a trainer looking at their
 * own roster member and an admin looking at any user. Admins are permitted by
 * the same route the trainer uses, because the roster ownership check in
 * `subjectIsMember` only runs for `role === "trainer"`.
 */
export function MemberWorkoutJourney({
  userId,
  className,
}: {
  userId: string
  className?: string
}) {
  const { data: history, isLoading: historyLoading } =
    useMemberWorkoutHistory(userId)
  const { data: stats, isLoading: statsLoading } = useMemberWorkoutStats(userId)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const workouts = history?.workouts ?? []
  const weekly = useMemo(() => toWeeklySeries(workouts), [workouts])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconActivity className="w-4 h-4" /> Workout Journey
        </CardTitle>
        <CardDescription>
          Training history, consistency and per-session detail
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[74px] rounded-lg" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              icon={IconFlame}
              label="Streak"
              value={`${stats.currentStreak}`}
              hint="consecutive days"
            />
            <StatTile
              icon={IconTargetArrow}
              label="Consistency"
              value={`${stats.consistencyScore}%`}
            />
            <StatTile
              icon={IconBarbell}
              label="Volume"
              value={`${Math.round(stats.totalVolumeKg).toLocaleString()} kg`}
              hint="this week"
            />
            <StatTile
              icon={IconActivity}
              label="Sessions"
              value={`${stats.weeklyWorkouts}`}
              hint="this week"
            />
          </div>
        ) : null}

        {/* Consistency over time */}
        <div>
          <p className="mb-2 text-sm font-medium">
            Sessions per week
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (last {WEEKS_CHARTED} weeks)
            </span>
          </p>
          {historyLoading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={weekly}
                margin={{ top: 5, right: 5, left: -24, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar
                  dataKey="sessions"
                  name="Sessions"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Timeline */}
        <div>
          <p className="mb-2 text-sm font-medium">Session history</p>

          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : workouts.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No workouts recorded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {workouts.map((w) => {
                const isOpen = expandedId === w.id
                return (
                  <li key={w.id} className="rounded-lg border">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : w.id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
                      aria-expanded={isOpen}
                    >
                      {isOpen ? (
                        <IconChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <IconChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex-1 text-sm font-medium">
                        {formatDay(w.date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <IconClock className="w-3.5 h-3.5" />
                        {formatDuration(w.duration)}
                      </span>
                      <Badge variant={statusVariant(w.status)}>{w.status}</Badge>
                    </button>

                    {isOpen ? (
                      <SessionDetail userId={userId} sessionId={w.id} />
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}

          {history?.nextCursor ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Showing the most recent {workouts.length} sessions.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Detail for one expanded session. Split out so the fetch is mounted only when
 * a row is opened rather than firing for every row in the timeline.
 */
function SessionDetail({
  userId,
  sessionId,
}: {
  userId: string
  sessionId: string
}) {
  const { data: session, isLoading, isError } = useMemberWorkoutSession(
    userId,
    sessionId,
  )

  if (isLoading) {
    return (
      <div className="space-y-2 border-t p-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
  }

  if (isError || !session) {
    return (
      <p className="border-t p-3 text-sm text-muted-foreground">
        Could not load this session.
      </p>
    )
  }

  const exercises = session.exercises ?? []
  if (exercises.length === 0) {
    return (
      <p className="border-t p-3 text-sm text-muted-foreground">
        No exercises were logged in this session.
      </p>
    )
  }

  return (
    <div className="space-y-3 border-t p-3">
      {exercises.map((ex) => (
        <div key={ex._id}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {ex.exercise?.name ?? 'Exercise'}
            </span>
            <Badge variant="outline" className="text-[10px] capitalize">
              {ex.section}
            </Badge>
            {ex.isCompleted ? (
              <Badge variant="secondary" className="text-[10px]">
                Done
              </Badge>
            ) : null}
          </div>

          {ex.sets.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">No sets logged.</p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {ex.sets.map((s) => {
                // `User` (and null, on rows predating the column) means the
                // member logged it themself; anything else is staff.
                const byStaff = !!s.loggedByModel && s.loggedByModel !== 'User'
                return (
                  <li
                    key={s._id}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span className="w-10 tabular-nums">
                      {s.isWarmup ? 'W' : `#${s.setNumber}`}
                    </span>
                    <span className="tabular-nums">
                      {s.actualWeightKg} kg × {s.actualReps}
                    </span>
                    {byStaff ? (
                      <Badge variant="outline" className="text-[10px]">
                        {s.loggedByModel}
                      </Badge>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
