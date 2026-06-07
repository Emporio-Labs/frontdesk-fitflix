'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import {
  IconChevronLeft,
  IconFlame,
  IconBarbell,
  IconClock,
  IconTrophy,
} from '@tabler/icons-react'
import { useWorkoutHistory } from '@/hooks/use-workouts'
import { workoutService } from '@/lib/services/workout.service'
import type { WorkoutHistoryEntry } from '@/lib/services/workout.service'

export default function SessionsPage() {
  const [page, setPage] = useState(1)
  const limit = 20

  // 1. Fetch Stats directly (avoiding the disabled hook constraint)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['workout-sessions-stats-custom'],
    queryFn: () => workoutService.getStats(),
    retry: false,
  })

  // 2. Fetch History logs
  const { data: historyData, isLoading: historyLoading, isError, refetch } = useWorkoutHistory({
    page,
    limit,
  })

  const workouts = historyData?.workouts ?? []
  const pagination = historyData?.pagination

  const formatDate = (value?: string | null): string => {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDuration = (mins?: number): string => {
    if (!mins) return '—'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    const rem = mins % 60
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 px-2">
              <Link href="/dashboard/workouts">
                <IconChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">Workouts / Sessions</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Workout Sessions</h2>
          <p className="text-muted-foreground text-sm">
            History of workout sessions completed, sets logged, and streak metrics
          </p>
        </div>
      </div>

      {/* Mini Stats Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Sessions</CardTitle>
            <IconFlame className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{stats?.weeklyWorkouts ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">workouts this week</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <IconTrophy className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{stats?.currentStreak ?? 0} days</div>
            )}
            <p className="text-xs text-muted-foreground">consecutive workout days</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sets logged</CardTitle>
            <IconBarbell className="w-4 h-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalSetsThisWeek ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">sets completed this week</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <IconClock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.totalVolumeKg ? `${stats.totalVolumeKg.toLocaleString()} kg` : '0 kg'}
              </div>
            )}
            <p className="text-xs text-muted-foreground">weight lifted this week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Session Logs</CardTitle>
          <CardDescription>Historical list of completed and active workout sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isError && (
            <div className="text-center py-8 text-red-500">
              Failed to load session logs.
              <button className="underline ml-1" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}

          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : workouts.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground border rounded-lg">
              No workout sessions logged yet.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Muscle Groups</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Exercises</TableHead>
                      <TableHead>Sets / Reps</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Calories</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workouts.map((w: WorkoutHistoryEntry) => {
                      const isCompleted = w.status === 'Completed'
                      const statusCls = isCompleted
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent'
                        : w.status === 'Active'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-transparent'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-transparent'

                      return (
                        <TableRow key={w.id}>
                          <TableCell className="font-semibold text-sm">
                            {formatDate(w.date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {w.muscleGroups && w.muscleGroups.length > 0 ? (
                                w.muscleGroups.map((g) => (
                                  <Badge key={g} variant="outline" className="text-[10px] uppercase">
                                    {g}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatDuration(w.duration)}</TableCell>
                          <TableCell>{w.exerciseCount ?? 0} exercises</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {w.totalSets ?? 0} sets · {w.totalReps ?? 0} reps
                          </TableCell>
                          <TableCell className="font-medium">
                            {w.totalVolumeKg ? `${w.totalVolumeKg.toLocaleString()} kg` : '0 kg'}
                          </TableCell>
                          <TableCell>
                            {w.caloriesBurned ? `${w.caloriesBurned} kcal` : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusCls}>
                              {w.status?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
