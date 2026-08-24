'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  IconArrowLeft,
  IconFlame,
  IconPlus,
  IconTrash,
  IconCheck,
  IconCalendar,
  IconBarbell,
  IconArrowUp,
  IconArrowDown,
  IconUserCheck,
  IconCopy,
  IconCoffee,
  IconBed,
} from '@tabler/icons-react'
import { useUser } from '@/hooks/use-users'
import { useExercises } from '@/hooks/use-exercises'
import { trainerWorkoutService } from '@/lib/services/trainer-workout.service'
import { MemberWorkoutJourney } from '@/components/workouts/member-workout-journey'
import { AssignOrCreatePlanModal } from '@/components/workouts/assign-or-create-plan-modal'

interface PlanExerciseItem {
  exerciseId: string
  name: string
  muscleGroup: string
  /** Backend flag: the referenced Exercise document no longer exists. */
  exerciseMissing?: boolean
  section: string
  targetSets: number
  targetReps: number
  targetWeightKg: number
  restSeconds: number
  orderIndex: number
}

interface PlanDayItem {
  dayNumber: number
  name: string
  isRestDay: boolean
  exercises: PlanExerciseItem[]
}

function getScheduledDayInfo(
  startDateStr?: string,
  dayNumber: number = 1,
  dayName?: string,
  dayProgress?: any[]
) {
  const cleanName =
    !dayName ||
    dayName.toLowerCase() === `day ${dayNumber}` ||
    dayName.toLowerCase() === `day${dayNumber}`
      ? ''
      : dayName

  let scheduledDateObj: Date | null = null
  if (Array.isArray(dayProgress)) {
    const dp = dayProgress.find((p) => p.dayNumber === dayNumber)
    if (dp?.scheduledDate) {
      const parsed = new Date(dp.scheduledDate)
      if (!Number.isNaN(parsed.getTime())) scheduledDateObj = parsed
    }
  }

  if (!scheduledDateObj && startDateStr) {
    const start = new Date(startDateStr)
    if (!Number.isNaN(start.getTime())) {
      scheduledDateObj = new Date(start)
      scheduledDateObj.setDate(start.getDate() + (dayNumber - 1))
    }
  }

  if (!scheduledDateObj) {
    const title = cleanName ? `Day ${dayNumber}: ${cleanName}` : `Day ${dayNumber}`
    return { tabLabel: title, headerTitle: title, dateString: '', relativeTag: '' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const targetDate = new Date(scheduledDateObj)
  targetDate.setHours(0, 0, 0, 0)

  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  let relativeTag = ''
  if (diffDays === 0) relativeTag = 'Today'
  else if (diffDays === 1) relativeTag = 'Tomorrow'
  else if (diffDays === -1) relativeTag = 'Yesterday'

  const dateString = targetDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  let dayTitleBase = `Day ${dayNumber}`
  if (cleanName) {
    dayTitleBase += `: ${cleanName}`
  }

  const dateBadge = relativeTag ? `${relativeTag} (${dateString})` : dateString

  const tabLabel = `${dayTitleBase} • ${dateBadge}`
  const headerTitle = `${dayTitleBase} — ${dateBadge}`

  return { tabLabel, headerTitle, dateString, relativeTag }
}

export default function MemberSchedulePage() {
  const params = useParams<{ userId?: string | string[] }>()
  const router = useRouter()
  const userIdParam = params?.userId
  const userId = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam || ''

  const qc = useQueryClient()
  const { data: user, isLoading: userLoading } = useUser(userId)
  const { data: exercisesData } = useExercises()
  const allExercises = exercisesData?.exercises ?? []

  // Fetch Member's Assignment Schedule
  const {
    data: assignment,
    isLoading: assignmentLoading,
    isError,
  } = useQuery({
    queryKey: ['user-assignment', userId],
    queryFn: () => trainerWorkoutService.getUserAssignment(userId),
    enabled: !!userId,
  })

  const [activeDayNumber, setActiveDayNumber] = useState<number>(1)
  const [editingDays, setEditingDays] = useState<Record<number, PlanExerciseItem[]>>({})
  const [restDays, setRestDays] = useState<Record<number, boolean>>({})
  const [addExerciseDialogOpen, setAddExerciseDialogOpen] = useState(false)
  const [copyFromDialogOpen, setCopyFromDialogOpen] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [assignOrCreateModalOpen, setAssignOrCreateModalOpen] = useState(false)
  const [showExpiredSchedule, setShowExpiredSchedule] = useState(false)

  const handleAddNewDay = () => {
    const existingNums = Object.keys(editingDays).map(Number)
    const maxDay = existingNums.length > 0 ? Math.max(...existingNums) : (assignment?.userDays?.length || 0)
    const newDayNum = maxDay + 1
    setEditingDays((prev) => ({
      ...prev,
      [newDayNum]: [],
    }))
    setActiveDayNumber(newDayNum)
    toast.success(`Created Day ${newDayNum}. Add exercises or copy from another day!`)
  }

  const toCleanExerciseId = (val: any): string => {
    if (!val) return ''
    if (typeof val === 'string') return val
    if (typeof val === 'object') {
      if (val._id) return String(val._id)
      if (val.id) return String(val.id)
      if (val.exerciseId) return toCleanExerciseId(val.exerciseId)
      if (typeof val.toString === 'function') {
        const str = val.toString()
        if (str !== '[object Object]') return str
      }
    }
    return String(val)
  }

  const handleCopyDayExercises = (sourceDayNum: number) => {
    const sourceExercises = editingDays[sourceDayNum] || []
    if (sourceExercises.length === 0) {
      toast.error(`Day ${sourceDayNum} has no exercises to copy`)
      return
    }
    const copied = sourceExercises.map((ex, idx) => ({
      ...ex,
      exerciseId: toCleanExerciseId(ex.exerciseId),
      orderIndex: idx,
      section: (ex.section || 'workout').toLowerCase(),
      targetSets: Math.max(1, Number(ex.targetSets) || 3),
      targetReps: Math.max(1, Number(ex.targetReps) || 10),
      targetWeightKg: Math.max(0, Number(ex.targetWeightKg) || 0),
      restSeconds: Math.max(0, Number(ex.restSeconds) || 60),
    }))
    setEditingDays((prev) => ({
      ...prev,
      [activeDayNumber]: copied,
    }))
    setCopyFromDialogOpen(false)
    toast.success(`Copied ${copied.length} exercises from Day ${sourceDayNum} to Day ${activeDayNumber}`)
  }

  // Initialize local editable state from assignment data & auto-select Today
  useEffect(() => {
    if (assignment?.userDays) {
      const daysMap: Record<number, PlanExerciseItem[]> = {}
      const restMap: Record<number, boolean> = {}
      let todayDayNum: number | null = null

      assignment.userDays.forEach((day: PlanDayItem) => {
        restMap[day.dayNumber] = day.isRestDay === true
        daysMap[day.dayNumber] = (day.exercises || []).map((ex, idx) => ({
          exerciseId: toCleanExerciseId(ex.exerciseId),
          name: ex.name || 'Exercise',
          muscleGroup: ex.muscleGroup || 'FullBody',
          exerciseMissing: ex.exerciseMissing === true,
          section: (ex.section || 'workout').toLowerCase(),
          targetSets: ex.targetSets || 3,
          targetReps: ex.targetReps || 10,
          targetWeightKg: ex.targetWeightKg || 0,
          restSeconds: ex.restSeconds || 60,
          orderIndex: ex.orderIndex ?? idx,
        }))

        const dayInfo = getScheduledDayInfo(
          assignment?.startDate,
          day.dayNumber,
          day.name,
          assignment?.dayProgress
        )
        if (dayInfo.relativeTag === 'Today' && !todayDayNum) {
          todayDayNum = day.dayNumber
        }
      })

      setEditingDays(daysMap)
      setRestDays(restMap)

      if (assignment.userDays.length > 0) {
        const defaultDay = todayDayNum ?? assignment.userDays[0].dayNumber
        setActiveDayNumber(defaultDay)
      }
    }
  }, [assignment])

  // Save updated exercises for a specific day
  const updateDayMutation = useMutation({
    mutationFn: ({
      dayNumber,
      exercises,
      isRestDay,
    }: {
      dayNumber: number
      exercises: PlanExerciseItem[]
      isRestDay?: boolean
    }) =>
      trainerWorkoutService.updateUserDayExercises(userId, dayNumber, {
        isRestDay: isRestDay ?? restDays[dayNumber] ?? false,
        exercises: exercises
          .map((ex, idx) => ({
            exerciseId: toCleanExerciseId(ex.exerciseId),
            orderIndex: idx,
            section: (ex.section || 'workout').toLowerCase(),
            targetSets: Math.max(1, Number(ex.targetSets) || 3),
            targetReps: Math.max(1, Number(ex.targetReps) || 10),
            targetWeightKg: Math.max(0, Number(ex.targetWeightKg) || 0),
            restSeconds: Math.max(0, Number(ex.restSeconds) || 60),
          }))
          .filter((ex) => ex.exerciseId.length > 0),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['user-assignment', userId] })
      toast.success(data.message || 'Schedule updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update day schedule')
    },
  })

  const currentDayExercises = editingDays[activeDayNumber] || []

  const updateExerciseField = (index: number, field: keyof PlanExerciseItem, value: any) => {
    const updated = [...currentDayExercises]
    updated[index] = { ...updated[index], [field]: value }
    setEditingDays((prev) => ({ ...prev, [activeDayNumber]: updated }))
  }

  const removeExercise = (index: number) => {
    const updated = currentDayExercises.filter((_, i) => i !== index)
    setEditingDays((prev) => ({ ...prev, [activeDayNumber]: updated }))
  }

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === currentDayExercises.length - 1)
    ) {
      return
    }
    const updated = [...currentDayExercises]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp
    setEditingDays((prev) => ({ ...prev, [activeDayNumber]: updated }))
  }

  const handleAddExercise = (exercise: any) => {
    const newItem: PlanExerciseItem = {
      exerciseId: exercise._id,
      name: exercise.name,
      // `exercise` is a library Exercise document, which stores a
      // `muscleGroups` array; take the first entry, the same projection the
      // backend applies when it builds nested exercise payloads. (`exercise` is
      // `any` here, so a wrong key fails silently rather than at compile time.)
      muscleGroup: exercise.muscleGroups?.[0] || 'FullBody',
      section: 'workout',
      targetSets: 3,
      targetReps: 10,
      targetWeightKg: 0,
      restSeconds: 60,
      orderIndex: currentDayExercises.length,
    }
    setEditingDays((prev) => ({
      ...prev,
      [activeDayNumber]: [...currentDayExercises, newItem],
    }))
    setAddExerciseDialogOpen(false)
    toast.success(`Added ${exercise.name} to Day ${activeDayNumber}`)
  }

  const handleSaveDaySchedule = () => {
    updateDayMutation.mutate({
      dayNumber: activeDayNumber,
      exercises: currentDayExercises,
      isRestDay: !!restDays[activeDayNumber],
    })
  }

  const filteredExercises = allExercises.filter((e) => {
    const search = exerciseSearch.toLowerCase()
    const nameMatch = e.name.toLowerCase().includes(search)
    const muscleMatch = (e.muscleGroups ?? []).join(' ').toLowerCase().includes(search)
    return nameMatch || muscleMatch
  })

  if (userLoading || assignmentLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const planObj = assignment?.planId
  const trainerObj = assignment?.assignedBy

  const isPlanExpired = (() => {
    if (!assignment?.startDate) return false
    const durationWeeks = planObj?.durationWeeks || planObj?.duration || 4
    const start = new Date(assignment.startDate)
    if (Number.isNaN(start.getTime())) return false
    const end = new Date(start)
    end.setDate(end.getDate() + (durationWeeks * 7))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today > end || assignment?.status === 'Completed' || assignment?.status === 'Expired'
  })()

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Back to Roster
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAssignOrCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <IconPlus className="w-4 h-4 mr-2" />
            Assign / Create Plan
          </Button>
          <Button asChild variant="default" className="bg-amber-600 hover:bg-amber-700">
            <Link href={`/dashboard/workouts/members/${userId}/live`}>
              <IconFlame className="w-4 h-4 mr-2" />
              Start Live Session
            </Link>
          </Button>
        </div>
      </div>

      {/* Member Profile & Active Plan Hero Header */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-none shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-emerald-400 border border-emerald-500/30">
                {user?.username?.slice(0, 2).toUpperCase() || 'MB'}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{user?.username}</h2>
                  <Badge variant="outline" className="border-emerald-400 text-emerald-300">
                    Active Member
                  </Badge>
                </div>
                <p className="text-sm text-slate-300 mt-1">{user?.email}</p>
                {trainerObj && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                    <IconUserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Assigned Coach: <strong className="text-slate-200">{trainerObj.name || trainerObj.trainerName}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {planObj ? (
              isPlanExpired ? (
                <div className="bg-amber-950/70 p-4 rounded-xl border border-amber-500/50 flex flex-col gap-1.5 min-w-[280px]">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="border-amber-400 text-amber-300 bg-amber-500/10 text-[10px] uppercase tracking-wider font-bold">
                      Plan Expired / Passed
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => setAssignOrCreateModalOpen(true)}
                      className="h-6 text-[10px] px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
                    >
                      <IconPlus className="w-3 h-3 mr-1" />
                      Assign New Plan
                    </Button>
                  </div>
                  <span className="text-base font-bold text-amber-200">{planObj.name}</span>
                  <p className="text-xs text-amber-300/90 font-medium">
                    This program has passed. Member is waiting for a new workout plan!
                  </p>
                </div>
              ) : (
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex flex-col gap-1 min-w-[260px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Prescribed Plan</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAssignOrCreateModalOpen(true)}
                      className="h-6 text-[10px] px-2 text-emerald-400 hover:text-emerald-300 hover:bg-slate-700/50"
                    >
                      <IconPlus className="w-3 h-3 mr-1" />
                      New Plan
                    </Button>
                  </div>
                  <span className="text-base font-semibold text-emerald-300">{planObj.name}</span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1">
                    <span>Goal: {planObj.goal || 'Fitness'}</span>
                    <span>•</span>
                    <span>{planObj.durationWeeks || 4} Weeks</span>
                    {assignment?.startDate && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-300 font-medium">
                          Start: {new Date(assignment.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-col items-end gap-2">
                <Badge variant="destructive">No Active Plan Assigned</Badge>
                <Button
                  size="sm"
                  onClick={() => setAssignOrCreateModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  <IconPlus className="w-3.5 h-3.5 mr-1" />
                  Assign / Create Plan
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Whole Schedule View & Days Editor */}
      {!assignment || (isPlanExpired && !showExpiredSchedule) ? (
        <Card className="p-10 text-center bg-gradient-to-b from-amber-500/5 to-transparent border-amber-500/30 shadow-md">
          <div className="max-w-md mx-auto space-y-3">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20">
              <IconCalendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {isPlanExpired ? 'Workout Plan Has Passed / Expired' : 'No Active Workout Plan'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isPlanExpired
                ? `The member's previous workout program ended on ${new Date(new Date(assignment.startDate).getTime() + (planObj.durationWeeks || 4) * 7 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. No workout is scheduled for Today (${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}).`
                : 'This member currently has no active workout plan assigned.'}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Button
                onClick={() => setAssignOrCreateModalOpen(true)}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
              >
                <IconPlus className="w-4 h-4 mr-1.5" />
                Assign / Create Plan Starting Today
              </Button>
              {isPlanExpired && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExpiredSchedule(true)}
                  className="w-full sm:w-auto text-xs"
                >
                  View Past Expired Schedule
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconCalendar className="w-5 h-5 text-primary" />
                Member Workout Schedule
              </CardTitle>
              <CardDescription>
                View and customize the exact exercises, sets, reps, and target weights prescribed for this member.
              </CardDescription>
            </div>
            <Button
              onClick={handleSaveDaySchedule}
              disabled={updateDayMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <IconCheck className="w-4 h-4 mr-2" />
              {updateDayMutation.isPending ? 'Saving Schedule...' : `Save Day ${activeDayNumber} Schedule`}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Days Tabs */}
            {(() => {
              const userDaysList: PlanDayItem[] = assignment?.userDays || []
              const allDayNumbers = Array.from(
                new Set([...userDaysList.map((d) => d.dayNumber), ...Object.keys(editingDays).map(Number)])
              ).sort((a, b) => a - b)

              const dayListToRender = allDayNumbers.map((dayNum) => {
                const found = userDaysList.find((d) => d.dayNumber === dayNum)
                return (
                  found || {
                    dayNumber: dayNum,
                    name: `Day ${dayNum}`,
                    isRestDay: false,
                    exercises: [],
                  }
                )
              })

              return (
                <Tabs
                  value={String(activeDayNumber)}
                  onValueChange={(val) => setActiveDayNumber(Number(val))}
                  className="w-full"
                >
                  <TabsList className="flex flex-wrap h-auto gap-2 bg-muted/50 p-1.5 rounded-xl items-center">
                    {dayListToRender.map((day: PlanDayItem) => {
                      const isCurrentDayRest = !!restDays[day.dayNumber] || day.isRestDay === true
                      const dayInfo = getScheduledDayInfo(
                        assignment?.startDate,
                        day.dayNumber,
                        day.name,
                        assignment?.dayProgress
                      )
                      return (
                        <TabsTrigger
                          key={day.dayNumber}
                          value={String(day.dayNumber)}
                          className="px-4 py-2.5 rounded-lg text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-1.5"
                        >
                          <span>{dayInfo.tabLabel}</span>
                          {isCurrentDayRest && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-600 bg-amber-500/10">
                              Rest
                            </Badge>
                          )}
                          {dayInfo.relativeTag === 'Today' && (
                            <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-4">
                              Today
                            </Badge>
                          )}
                        </TabsTrigger>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddNewDay}
                      className="h-9 px-3 text-xs border-dashed border-emerald-500/50 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-medium"
                    >
                      <IconPlus className="w-3.5 h-3.5 mr-1" />
                      Add Day
                    </Button>
                  </TabsList>

                  {dayListToRender.map((day: PlanDayItem) => {
                    const isCurrentDayRest = !!restDays[day.dayNumber]
                    const dayInfo = getScheduledDayInfo(
                      assignment?.startDate,
                      day.dayNumber,
                      day.name,
                      assignment?.dayProgress
                    )
                    return (
                      <TabsContent key={day.dayNumber} value={String(day.dayNumber)} className="mt-6 space-y-4">
                        <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-3">
                          <div>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                              {dayInfo.headerTitle}
                              {isCurrentDayRest && (
                                <Badge className="bg-amber-500 text-white text-xs font-semibold flex items-center gap-1">
                                  <IconCoffee className="w-3 h-3" />
                                  Rest Day
                                </Badge>
                              )}
                              {dayInfo.relativeTag === 'Today' && (
                                <Badge className="bg-emerald-500 text-white text-xs font-semibold">Today's Session</Badge>
                              )}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {isCurrentDayRest
                                ? `Prescribed Rest & Recovery Day for ${dayInfo.dateString || `Day ${day.dayNumber}`}`
                                : `${currentDayExercises.length} prescribed exercises scheduled for ${dayInfo.dateString || `Day ${day.dayNumber}`}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant={isCurrentDayRest ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                const nextVal = !isCurrentDayRest
                                setRestDays((prev) => ({ ...prev, [day.dayNumber]: nextVal }))
                                toast.info(nextVal ? `Marked Day ${day.dayNumber} as Rest Day` : `Set Day ${day.dayNumber} as Training Day`)
                              }}
                              className={
                                isCurrentDayRest
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm'
                                  : 'text-xs border-amber-500/40 text-amber-700 hover:bg-amber-50 font-medium'
                              }
                            >
                              <IconCoffee className="w-3.5 h-3.5 mr-1.5" />
                              {isCurrentDayRest ? 'Rest Day Prescribed' : 'Set as Rest Day'}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCopyFromDialogOpen(true)}
                              className="text-xs border-amber-500/40 text-amber-700 hover:bg-amber-50 font-medium"
                            >
                              <IconCopy className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                              Copy from Another Day
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAddExerciseDialogOpen(true)}
                            >
                              <IconPlus className="w-4 h-4 mr-2 text-emerald-600" />
                              Add Exercise to Day {day.dayNumber}
                            </Button>
                          </div>
                        </div>

                        {isCurrentDayRest && (
                          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-600 font-bold flex-shrink-0">
                              <IconCoffee className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">Prescribed Rest & Recovery Day</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Day {day.dayNumber} is scheduled for muscle recovery, hydration, and active mobility. You can optionally keep light stretching below or leave empty.
                              </p>
                            </div>
                          </div>
                        )}

                  {currentDayExercises.length === 0 ? (
                    <div className="p-8 text-center border border-dashed rounded-xl">
                      <p className="text-sm text-muted-foreground">No exercises prescribed for Day {day.dayNumber}.</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={() => setAddExerciseDialogOpen(true)}
                      >
                        Add First Exercise
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentDayExercises.map((ex, index) => (
                        <div
                          key={`${ex.exerciseId}-${index}`}
                          className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border bg-card hover:border-primary/40 transition-colors gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => moveExercise(index, 'up')}
                                disabled={index === 0}
                              >
                                <IconArrowUp className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => moveExercise(index, 'down')}
                                disabled={index === currentDayExercises.length - 1}
                              >
                                <IconArrowDown className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <div>
                              <p
                                className={`font-bold text-sm ${
                                  ex.exerciseMissing ? 'text-destructive' : ''
                                }`}
                              >
                                {ex.name}
                              </p>
                              <Badge
                                variant={ex.exerciseMissing ? 'destructive' : 'secondary'}
                                className="text-[10px] mt-1"
                              >
                                {ex.exerciseMissing
                                  ? 'Removed from library — replace it'
                                  : ex.muscleGroup}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                            <div>
                              <Label className="text-[10px] text-muted-foreground uppercase">Target Sets</Label>
                              <Input
                                type="number"
                                value={ex.targetSets}
                                onChange={(e) =>
                                  updateExerciseField(index, 'targetSets', Number(e.target.value))
                                }
                                className="h-8 text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground uppercase">Target Reps</Label>
                              <Input
                                type="number"
                                value={ex.targetReps}
                                onChange={(e) =>
                                  updateExerciseField(index, 'targetReps', Number(e.target.value))
                                }
                                className="h-8 text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground uppercase">Target Weight (kg)</Label>
                              <Input
                                type="number"
                                value={ex.targetWeightKg}
                                onChange={(e) =>
                                  updateExerciseField(index, 'targetWeightKg', Number(e.target.value))
                                }
                                className="h-8 text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground uppercase">Rest (sec)</Label>
                              <Input
                                type="number"
                                value={ex.restSeconds}
                                onChange={(e) =>
                                  updateExerciseField(index, 'restSeconds', Number(e.target.value))
                                }
                                className="h-8 text-xs font-semibold"
                              />
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 self-end md:self-center"
                            onClick={() => removeExercise(index)}
                          >
                            <IconTrash className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  </TabsContent>
                )
              })}
            </Tabs>
          )
        })()}
      </CardContent>
        </Card>
      )}

      {/* What the member has actually done, as opposed to what they're scheduled to do */}
      <MemberWorkoutJourney userId={userId} />

      {/* Add Exercise Dialog */}
      <Dialog open={addExerciseDialogOpen} onOpenChange={setAddExerciseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Exercise to Day {activeDayNumber}</DialogTitle>
            <DialogDescription>
              Select an exercise from the library to add to this member's schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Search exercise by name or muscle group..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredExercises.map((ex) => (
              <div
                key={ex._id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div>
                  <p className="font-semibold text-sm">{ex.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">
                      {ex.muscleGroups?.join(', ') || 'FullBody'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Difficulty: {ex.difficulty || 'Intermediate'}</span>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleAddExercise(ex)}>
                  <IconPlus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Day Dialog */}
      <Dialog open={copyFromDialogOpen} onOpenChange={setCopyFromDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <IconCopy className="w-5 h-5 text-amber-600" />
              Copy Exercises to Day {activeDayNumber}
            </DialogTitle>
            <DialogDescription>
              Select an existing day to copy all prescribed exercise targets into Day {activeDayNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2.5 max-h-[60vh] overflow-y-auto">
            {(() => {
              const userDaysList: PlanDayItem[] = assignment?.userDays || []
              const allDayNumbers = Array.from(
                new Set([...userDaysList.map((d) => d.dayNumber), ...Object.keys(editingDays).map(Number)])
              ).sort((a, b) => a - b)

              const candidates = allDayNumbers.filter((dNum) => dNum !== activeDayNumber)

              if (candidates.length === 0) {
                return (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No other days available to copy from. Click "+ Add Day" to create more days first.
                  </div>
                )
              }

              return candidates.map((dNum) => {
                const count = (editingDays[dNum] || []).length
                return (
                  <div
                    key={dNum}
                    className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-sm">Day {dNum}</p>
                      <p className="text-xs text-muted-foreground">{count} exercises prescribed</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={count === 0}
                      onClick={() => handleCopyDayExercises(dNum)}
                      className="text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                    >
                      <IconCopy className="w-3.5 h-3.5 mr-1" />
                      Copy {count} Exercises
                    </Button>
                  </div>
                )
              })
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign or Create Plan Modal */}
      <AssignOrCreatePlanModal
        open={assignOrCreateModalOpen}
        onOpenChange={setAssignOrCreateModalOpen}
        userId={userId}
        memberName={user?.username || (user as any)?.name}
      />
    </div>
  )
}
