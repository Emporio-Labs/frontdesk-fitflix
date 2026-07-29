'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  useActiveMemberWorkoutSession,
  useStartMemberWorkoutSession,
  useCompleteMemberWorkoutSession,
  useLogMemberSet,
  useDeleteMemberSet,
  useDeleteMemberExercise,
} from '@/hooks/use-member-workout'
import { useMyMember } from '@/hooks/use-my-members'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconChevronLeft,
  IconPlus,
  IconMinus,
  IconCheck,
  IconTrash,
  IconFlame,
  IconClock,
  IconUserCheck,
  IconBarbell,
} from '@tabler/icons-react'

export default function MemberLiveWorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const { data: member, isLoading: memberLoading } = useMyMember(userId)
  const { data: sessionData, isLoading: sessionLoading } = useActiveMemberWorkoutSession(userId)

  const startSessionMutation = useStartMemberWorkoutSession(userId)
  const session = sessionData?.session
  const elapsedSeconds = sessionData?.elapsedSeconds ?? 0

  const completeSessionMutation = useCompleteMemberWorkoutSession(userId, session?._id ?? '')

  // Format timer
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  if (memberLoading || sessionLoading) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Header bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between p-4 bg-background/90 backdrop-blur border-b">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-10 px-2">
          <IconChevronLeft className="w-5 h-5 mr-1" />
          Back
        </Button>

        <div className="text-center">
          <h1 className="text-base font-bold truncate max-w-[180px]">
            {member?.name || member?.username || member?.email || 'Member'}
          </h1>
          <p className="text-[11px] text-muted-foreground">Live Training Session</p>
        </div>

        {session ? (
          <Badge variant="outline" className="text-xs px-2 py-1 border-amber-500 text-amber-600 bg-amber-500/10">
            <IconClock className="w-3 h-3 mr-1 animate-pulse" />
            {formatTimer(elapsedSeconds)}
          </Badge>
        ) : (
          <div className="w-16" />
        )}
      </div>

      <div className="p-4 space-y-4">
        {!session ? (
          /* Start Session CTA */
          <Card className="border-emerald-500/30 bg-emerald-500/5 text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto">
              <IconBarbell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">No Active Session</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Start a live session to log sets for {member?.name || 'this member'}
              </p>
            </div>
            <Button
              size="lg"
              className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
              onClick={() => startSessionMutation.mutate({})}
              disabled={startSessionMutation.isPending}
            >
              <IconFlame className="w-5 h-5 mr-2" />
              Start Live Workout
            </Button>
          </Card>
        ) : (
          /* Active Workout Session View */
          <>
            {session.exercises.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground space-y-3">
                <p className="text-sm">No exercises added to this session yet.</p>
              </Card>
            ) : (
              session.exercises.map((workoutExercise) => (
                <ExerciseLoggingCard
                  key={workoutExercise._id}
                  userId={userId}
                  sessionId={session._id}
                  workoutExercise={workoutExercise}
                />
              ))
            )}

            {/* Complete session sticky footer button */}
            <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
              <Button
                size="lg"
                className="w-full h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl rounded-xl flex items-center justify-center gap-2"
                onClick={() => completeSessionMutation.mutate()}
                disabled={completeSessionMutation.isPending}
              >
                <IconCheck className="w-6 h-6" />
                Finish Workout Session
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ExerciseLoggingCard({
  userId,
  sessionId,
  workoutExercise,
}: {
  userId: string
  sessionId: string
  workoutExercise: any
}) {
  const [reps, setReps] = useState<number>(workoutExercise.targetReps || 10)
  const [weight, setWeight] = useState<number>(workoutExercise.targetWeightKg || 20)

  const logSetMutation = useLogMemberSet(userId, sessionId, workoutExercise._id)
  const deleteSetMutation = useDeleteMemberSet(userId, sessionId, workoutExercise._id)
  const deleteExerciseMutation = useDeleteMemberExercise(userId, sessionId)

  const sets = workoutExercise.sets ?? []
  const exerciseName = workoutExercise.exercise?.name || 'Exercise'

  const handleLogSet = () => {
    logSetMutation.mutate({
      actualReps: reps,
      actualWeightKg: weight,
      isWarmup: false,
    })
  }

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="p-4 pb-2 bg-muted/30 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-bold">{exerciseName}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Target: {workoutExercise.targetSets} sets × {workoutExercise.targetReps} reps
            {workoutExercise.targetWeightKg ? ` @ ${workoutExercise.targetWeightKg}kg` : ''}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => deleteExerciseMutation.mutate(workoutExercise._id)}
        >
          <IconTrash className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Logged Sets List */}
        {sets.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Logged Sets ({sets.length})
            </p>
            <div className="divide-y border rounded-lg overflow-hidden bg-card">
              {sets.map((setItem: any) => (
                <div key={setItem._id} className="flex items-center justify-between p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs bg-muted rounded-full w-6 h-6 flex items-center justify-center">
                      #{setItem.setNumber}
                    </span>
                    <span className="font-bold">{setItem.actualWeightKg} kg</span>
                    <span className="text-muted-foreground">× {setItem.actualReps} reps</span>
                    {setItem.loggedByModel === 'Trainer' && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20">
                        <IconUserCheck className="w-3 h-3 mr-0.5" /> Coach
                      </Badge>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteSetMutation.mutate(setItem._id)}
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Stepper Inputs for Reps & Weight */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Weight Stepper */}
          <div className="border rounded-xl p-3 bg-muted/20 text-center space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Weight (kg)</span>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-lg text-lg font-bold"
                onClick={() => setWeight((w) => Math.max(0, w - 2.5))}
              >
                <IconMinus className="w-5 h-5" />
              </Button>
              <span className="text-xl font-extrabold">{weight}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-lg text-lg font-bold"
                onClick={() => setWeight((w) => w + 2.5)}
              >
                <IconPlus className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Reps Stepper */}
          <div className="border rounded-xl p-3 bg-muted/20 text-center space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Reps</span>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-lg text-lg font-bold"
                onClick={() => setReps((r) => Math.max(1, r - 1))}
              >
                <IconMinus className="w-5 h-5" />
              </Button>
              <span className="text-xl font-extrabold">{reps}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-lg text-lg font-bold"
                onClick={() => setReps((r) => r + 1)}
              >
                <IconPlus className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Log Set Button */}
        <Button
          size="lg"
          className="w-full h-12 text-base font-bold bg-primary text-primary-foreground shadow flex items-center justify-center gap-2 rounded-xl"
          onClick={handleLogSet}
          disabled={logSetMutation.isPending}
        >
          <IconPlus className="w-5 h-5" />
          Log Set #{sets.length + 1}
        </Button>
      </CardContent>
    </Card>
  )
}
