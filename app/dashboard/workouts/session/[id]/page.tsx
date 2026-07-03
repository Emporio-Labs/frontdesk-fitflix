'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  IconChevronLeft,
  IconBarbell,
  IconCheck,
  IconPlayerStop,
  IconClipboardList,
} from '@tabler/icons-react'
import {
  useWorkoutSession,
  useUpdateWorkoutSession,
  useLogSet,
} from '@/hooks/use-workouts'
import type { SessionStatus, WorkoutExercise } from '@/types/workout'

const STATUS_CLASSES: Record<SessionStatus, string> = {
  Active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-transparent',
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent',
  Abandoned: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-transparent',
}

function formatDate(value?: string | null): string {
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

function formatTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function WorkoutSessionPage() {
  const params = useParams<{ id: string }>()
  const sessionId = params?.id ?? ''

  const { data: session, isLoading, isError, refetch } = useWorkoutSession(sessionId)
  const updateSession = useUpdateWorkoutSession()

  const exercises = session?.exercises ?? []
  const totalTargetSets = exercises.reduce((sum, ex) => sum + (ex.targetSets ?? 0), 0)
  const totalLoggedSets = exercises.reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0)
  const totalVolumeKg = exercises.reduce(
    (sum, ex) =>
      sum + (ex.sets ?? []).reduce((s, set) => s + set.actualReps * set.actualWeightKg, 0),
    0
  )

  const isActive = session?.status === 'Active'

  const handleStatusChange = (status: SessionStatus) => {
    updateSession.mutate({ id: sessionId, payload: { status } })
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 px-2">
              <Link href="/dashboard/workouts/sessions">
                <IconChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">Workouts / Sessions / Detail</span>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">Workout Session</h2>
            {session && <Badge className={STATUS_CLASSES[session.status]}>{session.status.toUpperCase()}</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">
            {session
              ? `${formatDate(session.date)} · started ${formatTime(session.startedAt)}${session.completedAt ? ` · finished ${formatTime(session.completedAt)}` : ''}`
              : 'Session details, exercises, and set logs'}
          </p>
        </div>
        {isActive && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('Abandoned')}
              disabled={updateSession.isPending}
              className="text-red-600 hover:text-red-700"
            >
              <IconPlayerStop className="w-4 h-4 mr-1" /> Abandon
            </Button>
            <Button
              size="sm"
              onClick={() => handleStatusChange('Completed')}
              disabled={updateSession.isPending}
            >
              <IconCheck className="w-4 h-4 mr-1" /> Complete Workout
            </Button>
          </div>
        )}
      </div>

      {isError && (
        <div className="text-center py-12 text-red-500 border rounded-lg">
          Failed to load this session.
          <button className="underline ml-1" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      ) : session ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exercises</CardTitle>
                <IconClipboardList className="w-4 h-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{exercises.length}</div>
                <p className="text-xs text-muted-foreground">in this session</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sets Logged</CardTitle>
                <IconCheck className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalLoggedSets} / {totalTargetSets}
                </div>
                <p className="text-xs text-muted-foreground">completed vs target</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Volume</CardTitle>
                <IconBarbell className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalVolumeKg.toLocaleString()} kg</div>
                <p className="text-xs text-muted-foreground">total weight lifted</p>
              </CardContent>
            </Card>
          </div>

          {session.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{session.notes}</p>
              </CardContent>
            </Card>
          )}

          {exercises.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground border rounded-lg">
              No exercises in this session yet.
            </div>
          ) : (
            <div className="space-y-4">
              {exercises.map((ex) => (
                <ExerciseCard
                  key={ex._id ?? ex.exerciseId}
                  sessionId={sessionId}
                  exercise={ex}
                  canLog={isActive}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function ExerciseCard({
  sessionId,
  exercise,
  canLog,
}: {
  sessionId: string
  exercise: WorkoutExercise
  canLog: boolean
}) {
  const logSet = useLogSet()
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')

  const sets = exercise.sets ?? []
  const name = exercise.exercise?.name ?? 'Exercise'
  const exerciseRefId = exercise._id ?? exercise.exerciseId

  const handleLogSet = () => {
    const actualReps = Number(reps)
    const actualWeightKg = Number(weight)
    if (!Number.isFinite(actualReps) || actualReps < 1) return
    if (!Number.isFinite(actualWeightKg) || actualWeightKg < 0) return
    logSet.mutate(
      {
        sessionId,
        exerciseId: exerciseRefId,
        payload: { actualReps, actualWeightKg },
      },
      {
        onSuccess: () => {
          setReps('')
          setWeight('')
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{name}</CardTitle>
            {exercise.exercise?.muscleGroup && (
              <Badge variant="outline" className="text-[10px] uppercase">
                {exercise.exercise.muscleGroup}
              </Badge>
            )}
            {exercise.isCompleted && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent">
                Done
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Target: {exercise.targetSets} × {exercise.targetReps}
            {exercise.targetWeightKg ? ` @ ${exercise.targetWeightKg} kg` : ''}
            {exercise.restSeconds ? ` · ${exercise.restSeconds}s rest` : ''}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sets.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sets logged yet.</p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Set</TableHead>
                  <TableHead>Reps</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>RPE</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sets.map((set) => (
                  <TableRow key={set._id}>
                    <TableCell className="font-medium">
                      {set.setNumber}
                      {set.isWarmup && (
                        <span className="ml-1 text-[10px] text-muted-foreground uppercase">warmup</span>
                      )}
                    </TableCell>
                    <TableCell>{set.actualReps}</TableCell>
                    <TableCell>{set.actualWeightKg} kg</TableCell>
                    <TableCell>{set.rpe ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTime(set.completedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {canLog && !exercise.isCompleted && (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reps</label>
              <Input
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder={String(exercise.targetReps)}
                className="h-8 w-24"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Weight (kg)</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={exercise.targetWeightKg ? String(exercise.targetWeightKg) : '0'}
                className="h-8 w-28"
              />
            </div>
            <Button
              size="sm"
              className="h-8"
              onClick={handleLogSet}
              disabled={logSet.isPending || !reps || !weight}
            >
              {logSet.isPending ? 'Logging...' : 'Log Set'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
