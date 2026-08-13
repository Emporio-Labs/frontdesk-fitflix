'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trainerWorkoutService } from '@/lib/services/trainer-workout.service'
import {
  useActiveMemberWorkoutSession,
  useStartMemberWorkoutSession,
  useCompleteMemberWorkoutSession,
  useLogMemberSet,
  useDeleteMemberSet,
  useDeleteMemberExercise,
  useAddExerciseToMemberSession,
  useUpdateMemberExercise,
} from '@/hooks/use-member-workout'
import { useMyMember } from '@/hooks/use-my-members'
import { useExercises } from '@/hooks/use-exercises'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  IconEdit,
  IconFlame as IconWarmup,
  IconActivity as IconStretching,
} from '@tabler/icons-react'
import { toast } from 'sonner'

type WorkoutSectionKey = 'warmup' | 'workout' | 'stretching'

const SECTION_CONFIG: Record<
  WorkoutSectionKey,
  { title: string; subtitle: string; icon: any; colorClass: string; borderClass: string }
> = {
  warmup: {
    title: 'Warm Up',
    subtitle: 'Prime the body',
    icon: IconWarmup,
    colorClass: 'text-amber-500 bg-amber-500/10',
    borderClass: 'border-amber-500/30',
  },
  workout: {
    title: 'Workout',
    subtitle: 'Main training',
    icon: IconBarbell,
    colorClass: 'text-emerald-500 bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
  },
  stretching: {
    title: 'Stretching',
    subtitle: 'Cool down & recover',
    icon: IconStretching,
    colorClass: 'text-blue-500 bg-blue-500/10',
    borderClass: 'border-blue-500/30',
  },
}

export default function MemberLiveWorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const { data: member, isLoading: memberLoading } = useMyMember(userId)
  const { data: sessionData, isLoading: sessionLoading } = useActiveMemberWorkoutSession(userId)
  const { data: exercisesData } = useExercises()
  const allExercises = exercisesData?.exercises ?? []

  const startSessionMutation = useStartMemberWorkoutSession(userId)
  const session = sessionData?.session
  const elapsedSeconds = sessionData?.elapsedSeconds ?? 0

  const completeSessionMutation = useCompleteMemberWorkoutSession(userId, session?._id ?? '')
  const addExerciseMutation = useAddExerciseToMemberSession(userId, session?._id ?? '')

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [targetSection, setTargetSection] = useState<WorkoutSectionKey>('workout')
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [selectedExercise, setSelectedExercise] = useState<any>(null)
  const [newTargetSets, setNewTargetSets] = useState(3)
  const [newTargetReps, setNewTargetReps] = useState(10)
  const [newTargetWeight, setNewTargetWeight] = useState(0)

  // PT Live Oversight Heartbeat & Immediate Cleanup on Exit
  useEffect(() => {
    if (!userId) return

    // Immediately register PT oversight
    trainerWorkoutService.startOverseeing(userId).catch(() => {})

    // Heartbeat ping every 15s to keep active oversight fresh
    const intervalId = setInterval(() => {
      trainerWorkoutService.startOverseeing(userId).catch(() => {})
    }, 15000)

    // Cleanup: when trainer leaves, navigates back, or closes page, stop oversight immediately
    return () => {
      clearInterval(intervalId)
      trainerWorkoutService.stopOverseeing(userId).catch(() => {})
    }
  }, [userId])

  // Format timer
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleOpenAddDialog = (section: WorkoutSectionKey = 'workout') => {
    setTargetSection(section)
    setSelectedExercise(null)
    setExerciseSearch('')
    setNewTargetSets(section === 'workout' ? 3 : 1)
    setNewTargetReps(10)
    setNewTargetWeight(0)
    setAddDialogOpen(true)
  }

  const handleAddExerciseToSession = () => {
    if (!selectedExercise || !session?._id) return
    addExerciseMutation.mutate(
      {
        exerciseId: selectedExercise._id,
        section: targetSection,
        targetSets: Number(newTargetSets) || 1,
        targetReps: Number(newTargetReps) || 10,
        targetWeightKg: Number(newTargetWeight) || 0,
        restSeconds: 60,
      },
      {
        onSuccess: () => {
          setAddDialogOpen(false)
          setSelectedExercise(null)
        },
      }
    )
  }

  const filteredExercises = allExercises.filter((e) => {
    const search = exerciseSearch.toLowerCase()
    const nameMatch = e.name.toLowerCase().includes(search)
    const muscleMatch = Array.isArray(e.muscleGroups)
      ? e.muscleGroups.some((mg: string) => mg.toLowerCase().includes(search))
      : false
    return nameMatch || muscleMatch
  })

  if (memberLoading || sessionLoading) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  const exercises = session?.exercises ?? []
  const warmupExercises = exercises.filter((e: any) => e.section === 'warmup')
  const mainWorkoutExercises = exercises.filter((e: any) => e.section === 'workout' || !e.section)
  const stretchingExercises = exercises.filter((e: any) => e.section === 'stretching')

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background pb-32 font-sans text-foreground">
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

      <div className="p-4 space-y-6">
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
            {/* Top Bar Summary */}
            <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border">
              <div>
                <p className="text-xs font-semibold">Active Session Exercises</p>
                <p className="text-[11px] text-muted-foreground">{exercises.length} total exercise(s)</p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleOpenAddDialog('workout')}
              >
                <IconPlus className="w-4 h-4 mr-1" />
                Add Exercise
              </Button>
            </div>

            {/* SECTION 1: WARM UP */}
            <SectionBlock
              sectionKey="warmup"
              exercises={warmupExercises}
              userId={userId}
              sessionId={session._id}
              onAddClick={() => handleOpenAddDialog('warmup')}
            />

            {/* SECTION 2: WORKOUT */}
            <SectionBlock
              sectionKey="workout"
              exercises={mainWorkoutExercises}
              userId={userId}
              sessionId={session._id}
              onAddClick={() => handleOpenAddDialog('workout')}
            />

            {/* SECTION 3: STRETCHING */}
            <SectionBlock
              sectionKey="stretching"
              exercises={stretchingExercises}
              userId={userId}
              sessionId={session._id}
              onAddClick={() => handleOpenAddDialog('stretching')}
            />

            {/* Sticky Footer: Finish Workout Session */}
            <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40 flex flex-col gap-2">
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

      {/* Add Exercise Modal */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Exercise to Live Session</DialogTitle>
            <DialogDescription>
              Select an exercise and choose which section to add it to.
            </DialogDescription>
          </DialogHeader>

          {/* Section Selector Pills */}
          <div className="flex gap-2 p-1 bg-muted/60 rounded-xl">
            {(['warmup', 'workout', 'stretching'] as WorkoutSectionKey[]).map((secKey) => {
              const cfg = SECTION_CONFIG[secKey]
              const isSelected = targetSection === secKey
              return (
                <button
                  key={secKey}
                  type="button"
                  onClick={() => setTargetSection(secKey)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    isSelected ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <cfg.icon className="w-3.5 h-3.5" />
                  {cfg.title}
                </button>
              )
            })}
          </div>

          {!selectedExercise ? (
            <div className="space-y-3 flex-1 overflow-hidden flex flex-col mt-2">
              <Input
                placeholder="Search exercise..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
              />
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[280px] pr-1">
                {filteredExercises.map((ex: any) => (
                  <div
                    key={ex._id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedExercise(ex)
                    }}
                  >
                    <div>
                      <p className="font-semibold text-sm">{ex.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Array.isArray(ex.muscleGroups) ? ex.muscleGroups.join(', ') : 'Full Body'}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost">Select</Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{selectedExercise.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Target Section: <span className="font-semibold text-emerald-600">{SECTION_CONFIG[targetSection].title}</span>
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedExercise(null)}>
                  Change
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Target Sets</Label>
                  <Input
                    type="number"
                    value={newTargetSets}
                    onChange={(e) => setNewTargetSets(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Target Reps</Label>
                  <Input
                    type="number"
                    value={newTargetReps}
                    onChange={(e) => setNewTargetReps(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Target Wt (kg)</Label>
                  <Input
                    type="number"
                    value={newTargetWeight}
                    onChange={(e) => setNewTargetWeight(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
                onClick={handleAddExerciseToSession}
                disabled={addExerciseMutation.isPending}
              >
                <IconPlus className="w-4 h-4 mr-2" />
                {addExerciseMutation.isPending
                  ? 'Adding...'
                  : `Add to ${SECTION_CONFIG[targetSection].title}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SectionBlock({
  sectionKey,
  exercises,
  userId,
  sessionId,
  onAddClick,
}: {
  sectionKey: WorkoutSectionKey
  exercises: any[]
  userId: string
  sessionId: string
  onAddClick: () => void
}) {
  const cfg = SECTION_CONFIG[sectionKey]
  const IconComp = cfg.icon

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-1 border-b">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${cfg.colorClass}`}>
            <IconComp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold">{cfg.title}</h3>
            <p className="text-[11px] text-muted-foreground">{cfg.subtitle} ({exercises.length})</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onAddClick} className="text-xs h-8">
          <IconPlus className="w-3.5 h-3.5 mr-1" />
          Add to {cfg.title}
        </Button>
      </div>

      {exercises.length === 0 ? (
        <div className="p-4 text-center border border-dashed rounded-xl bg-muted/20">
          <p className="text-xs text-muted-foreground">No {cfg.title.toLowerCase()} exercises added yet.</p>
          <Button variant="outline" size="sm" className="mt-2 text-xs h-7" onClick={onAddClick}>
            + Add {cfg.title} Exercise
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {exercises.map((workoutExercise) => (
            <ExerciseLoggingCard
              key={workoutExercise._id}
              userId={userId}
              sessionId={sessionId}
              workoutExercise={workoutExercise}
            />
          ))}
        </div>
      )}
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
  const [isEditingTargets, setIsEditingTargets] = useState(false)
  const [editSection, setEditSection] = useState<WorkoutSectionKey>(
    (workoutExercise.section as WorkoutSectionKey) || 'workout'
  )
  const [editSets, setEditSets] = useState(workoutExercise.targetSets || 3)
  const [editReps, setEditReps] = useState(workoutExercise.targetReps || 10)
  const [editWeight, setEditWeight] = useState(workoutExercise.targetWeightKg || 0)

  const logSetMutation = useLogMemberSet(userId, sessionId, workoutExercise._id)
  const deleteSetMutation = useDeleteMemberSet(userId, sessionId, workoutExercise._id)
  const deleteExerciseMutation = useDeleteMemberExercise(userId, sessionId)
  const updateExerciseMutation = useUpdateMemberExercise(userId, sessionId)

  const sets = workoutExercise.sets ?? []
  const exerciseName = workoutExercise.exercise?.name || 'Exercise'

  const handleLogSet = () => {
    logSetMutation.mutate({
      actualReps: reps,
      actualWeightKg: weight,
      isWarmup: false,
    })
  }

  const isCompleted = workoutExercise.isCompleted === true

  /**
   * Tick the exercise off (or put it back) on the member's behalf.
   *
   * The member app treats this as the signal to advance its guided player, so
   * completing here is what moves them on. Reversible on purpose: a mis-tap
   * mid-session should not strand the member on the wrong exercise.
   */
  const handleToggleComplete = () => {
    updateExerciseMutation.mutate({
      workoutExerciseId: workoutExercise._id,
      payload: { isCompleted: !isCompleted },
    })
  }

  const handleSaveTargets = () => {
    updateExerciseMutation.mutate(
      {
        workoutExerciseId: workoutExercise._id,
        payload: {
          section: editSection,
          targetSets: Number(editSets),
          targetReps: Number(editReps),
          targetWeightKg: Number(editWeight),
        },
      },
      {
        onSuccess: () => {
          setIsEditingTargets(false)
        },
      }
    )
  }

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="p-4 pb-2 bg-muted/30 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <span className={isCompleted ? 'line-through text-muted-foreground' : ''}>
              {exerciseName}
            </span>
            {isCompleted && (
              <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                <IconCheck className="w-3 h-3" />
                Done
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Target: {workoutExercise.targetSets} sets × {workoutExercise.targetReps} reps
            {workoutExercise.targetWeightKg ? ` @ ${workoutExercise.targetWeightKg}kg` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Edit exercise targets"
            onClick={() => setIsEditingTargets(!isEditingTargets)}
          >
            <IconEdit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            title="Remove exercise"
            onClick={() => deleteExerciseMutation.mutate(workoutExercise._id)}
          >
            <IconTrash className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Target & Section Editor */}
        {isEditingTargets && (
          <div className="p-3 bg-muted/50 rounded-xl border space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Edit Target Parameters
            </p>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase">Section</Label>
              <div className="flex gap-2 mt-1">
                {(['warmup', 'workout', 'stretching'] as WorkoutSectionKey[]).map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setEditSection(sec)}
                    className={`flex-1 py-1 rounded text-xs font-semibold capitalize ${
                      editSection === sec ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase">Target Sets</Label>
                <Input
                  type="number"
                  value={editSets}
                  onChange={(e) => setEditSets(Number(e.target.value))}
                  className="h-8 text-xs font-semibold mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase">Target Reps</Label>
                <Input
                  type="number"
                  value={editReps}
                  onChange={(e) => setEditReps(Number(e.target.value))}
                  className="h-8 text-xs font-semibold mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase">Target Wt (kg)</Label>
                <Input
                  type="number"
                  value={editWeight}
                  onChange={(e) => setEditWeight(Number(e.target.value))}
                  className="h-8 text-xs font-semibold mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditingTargets(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSaveTargets}
                disabled={updateExerciseMutation.isPending}
              >
                Save Targets
              </Button>
            </div>
          </div>
        )}

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

        {/* Completing this is what advances the member's guided player. */}
        <Button
          size="lg"
          variant={isCompleted ? 'outline' : 'default'}
          className={`w-full h-12 text-base font-bold shadow flex items-center justify-center gap-2 rounded-xl ${
            isCompleted
              ? 'text-muted-foreground'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          onClick={handleToggleComplete}
          disabled={updateExerciseMutation.isPending}
        >
          <IconCheck className="w-5 h-5" />
          {isCompleted ? 'Mark Incomplete' : 'Complete & Move to Next'}
        </Button>
      </CardContent>
    </Card>
  )
}
