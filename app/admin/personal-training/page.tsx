'use client'

import { useState, useEffect } from 'react'
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconDeviceTv,
  IconDumbbell,
  IconPhoneCall,
  IconPlus,
  IconRefresh,
  IconUserCheck,
  IconUsers,
  IconVideo,
  IconX,
  IconTrash,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  useCompletePtBooking,
  usePtAdminBookings,
  usePtTrainers,
  useResolveTrainerChangeRequest,
  useTrainerChangeRequests,
  useTrainerSchedule,
  useUpdateTrainerSchedule,
} from '@/hooks/use-personal-training'
import { useLeads } from '@/hooks/use-leads'
import { UnifiedBookingDto } from '@/lib/services/personal-training.service'
import { getBookingJoinState } from '@/lib/booking-window'
import { toast } from 'sonner'
import Link from 'next/link'

import { useAuth } from '@/hooks/use-auth'

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export default function PersonalTrainingAdminPage() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'

  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })

  // Modals state
  const [completingBooking, setCompletingBooking] = useState<UnifiedBookingDto | null>(null)
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [exercises, setExercises] = useState([
    { name: '', sets: 3, reps: 10, weight: 0, notes: '' },
  ])

  // Data fetching
  const { data: trainers, isLoading: isTrainersLoading } = usePtTrainers()

  // Strict trainer identification: match by user id, email, or name
  const currentTrainer = (trainers || []).find(
    (t) =>
      t._id === user?.id ||
      t.email?.toLowerCase() === user?.email?.toLowerCase() ||
      t.name?.toLowerCase() === user?.name?.toLowerCase()
  ) || (trainers && trainers.find((t) => t._id === user?.id))

  const activeTrainerId = isTrainer
    ? (currentTrainer?._id || user?.id || '')
    : (selectedTrainerId || (trainers && trainers[0]?._id) || '')

  const { data: bookings, isLoading: isBookingsLoading, refetch: refetchBookings } =
    usePtAdminBookings({
      date: selectedDate,
      expertId: isTrainer ? activeTrainerId : (selectedTrainerId || undefined),
    })
  const { data: changeRequests, isLoading: isRequestsLoading } = useTrainerChangeRequests(!isTrainer)
  const { data: leads } = useLeads({ enabled: !isTrainer })

  // Schedule editor
  const { data: scheduleData, isLoading: isScheduleLoading } = useTrainerSchedule(activeTrainerId)
  const updateScheduleMutation = useUpdateTrainerSchedule()

  // Schedule editor state & shift helpers
  const [shiftDurationHours, setShiftDurationHours] = useState<number>(8)
  const [localWeeklySlots, setLocalWeeklySlots] = useState<
    Array<{
      dayOfWeek: number
      isAvailable: boolean
      shifts: Array<{ startTime: string; endTime: string }>
    }>
  >([])

  useEffect(() => {
    if (scheduleData?.weeklySlots && scheduleData.weeklySlots.length > 0) {
      const slots = [0, 1, 2, 3, 4, 5, 6].map((idx) => {
        const existing = scheduleData.weeklySlots.find((s) => s.dayOfWeek === idx)
        let shifts: Array<{ startTime: string; endTime: string }> = []
        if (existing?.shifts && existing.shifts.length > 0) {
          shifts = existing.shifts.map((st) => ({
            startTime: st.startTime || '07:00',
            endTime: st.endTime || '15:00',
          }))
        } else if (existing?.startTime && existing?.endTime) {
          shifts = [{ startTime: existing.startTime, endTime: existing.endTime }]
        } else {
          shifts = [{ startTime: idx === 0 ? '08:00' : '07:00', endTime: idx === 0 ? '14:00' : '15:00' }]
        }
        return {
          dayOfWeek: idx,
          isAvailable: existing ? existing.isAvailable : idx !== 0,
          shifts,
        }
      })
      setLocalWeeklySlots(slots)
    } else {
      setLocalWeeklySlots([
        { dayOfWeek: 1, isAvailable: true, shifts: [{ startTime: '07:00', endTime: '15:00' }] },
        { dayOfWeek: 2, isAvailable: true, shifts: [{ startTime: '07:00', endTime: '15:00' }] },
        { dayOfWeek: 3, isAvailable: true, shifts: [{ startTime: '07:00', endTime: '15:00' }] },
        { dayOfWeek: 4, isAvailable: true, shifts: [{ startTime: '07:00', endTime: '15:00' }] },
        { dayOfWeek: 5, isAvailable: true, shifts: [{ startTime: '07:00', endTime: '15:00' }] },
        { dayOfWeek: 6, isAvailable: true, shifts: [{ startTime: '08:00', endTime: '16:00' }] },
        { dayOfWeek: 0, isAvailable: false, shifts: [{ startTime: '08:00', endTime: '14:00' }] },
      ])
    }
  }, [scheduleData, activeTrainerId])

  const computeEndTimeFromStart = (startTimeStr: string, durationHours: number): string => {
    if (!startTimeStr) return '17:00'
    const [hStr, mStr] = startTimeStr.split(':')
    const h = parseInt(hStr || '0', 10)
    const m = parseInt(mStr || '0', 10)
    if (isNaN(h) || isNaN(m)) return '17:00'
    const totalMinutes = h * 60 + m + Math.round(durationHours * 60)
    const newH = Math.floor(totalMinutes / 60) % 24
    const newM = totalMinutes % 60
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
  }

  const computeDurationHours = (startStr: string, endStr: string): string => {
    if (!startStr || !endStr) return '0.0'
    const [sh, sm] = startStr.split(':').map(Number)
    const [eh, em] = endStr.split(':').map(Number)
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '0.0'
    let diffMin = eh * 60 + em - (sh * 60 + sm)
    if (diffMin < 0) diffMin += 24 * 60
    return (diffMin / 60).toFixed(1)
  }

  const computeDayTotalHours = (
    shifts: Array<{ startTime: string; endTime: string }>
  ): string => {
    let totalMin = 0
    shifts.forEach((st) => {
      const [sh, sm] = st.startTime.split(':').map(Number)
      const [eh, em] = st.endTime.split(':').map(Number)
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        let diff = eh * 60 + em - (sh * 60 + sm)
        if (diff < 0) diff += 24 * 60
        totalMin += diff
      }
    })
    return (totalMin / 60).toFixed(1)
  }

  const parseTimeToMins = (timeStr: string): number => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const getShiftValidationErrors = (
    shifts: Array<{ startTime: string; endTime: string }>
  ): string[] => {
    const errors: string[] = []
    const indexed = shifts.map((s, idx) => ({
      ...s,
      origIndex: idx,
      startMin: parseTimeToMins(s.startTime),
      endMin: parseTimeToMins(s.endTime),
    }))

    for (const item of indexed) {
      if (item.endMin <= item.startMin) {
        errors.push(`Shift ${item.origIndex + 1}: End time must be after start time`)
      }
    }

    const sorted = indexed.slice().sort((a, b) => a.startMin - b.startMin)
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1].startMin < sorted[i].endMin) {
        errors.push(
          `Overlap: Shift starting at ${sorted[i + 1].startTime} conflicts with shift ending at ${sorted[i].endTime}`
        )
      }
    }

    return errors
  }

  const handleToggleDay = (dayOfWeek: number, isAvailable: boolean) => {
    setLocalWeeklySlots((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, isAvailable } : s))
    )
  }

  const handleShiftStartTimeChange = (
    dayOfWeek: number,
    shiftIndex: number,
    newStart: string
  ) => {
    setLocalWeeklySlots((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek === dayOfWeek) {
          const newShifts = [...s.shifts]
          const calculatedEnd = computeEndTimeFromStart(newStart, shiftDurationHours)
          newShifts[shiftIndex] = { ...newShifts[shiftIndex], startTime: newStart, endTime: calculatedEnd }
          return { ...s, shifts: newShifts }
        }
        return s
      })
    )
  }

  const handleShiftEndTimeChange = (
    dayOfWeek: number,
    shiftIndex: number,
    newEnd: string
  ) => {
    setLocalWeeklySlots((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek === dayOfWeek) {
          const newShifts = [...s.shifts]
          newShifts[shiftIndex] = { ...newShifts[shiftIndex], endTime: newEnd }
          return { ...s, shifts: newShifts }
        }
        return s
      })
    )
  }

  const handleAddShiftWindow = (dayOfWeek: number) => {
    setLocalWeeklySlots((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek === dayOfWeek) {
          const lastShift = s.shifts[s.shifts.length - 1]
          let newStart = '18:00'
          if (lastShift?.endTime) {
            const [h, m] = lastShift.endTime.split(':').map(Number)
            const nextH = (h + 1) % 24
            newStart = `${String(nextH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
          }
          const newEnd = computeEndTimeFromStart(newStart, 3)
          return { ...s, shifts: [...s.shifts, { startTime: newStart, endTime: newEnd }] }
        }
        return s
      })
    )
  }

  const handleRemoveShiftWindow = (dayOfWeek: number, shiftIndex: number) => {
    setLocalWeeklySlots((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek === dayOfWeek && s.shifts.length > 1) {
          return { ...s, shifts: s.shifts.filter((_, idx) => idx !== shiftIndex) }
        }
        return s
      })
    )
  }

  const handleApplyPreset = (presetStart: string, presetEnd: string) => {
    setLocalWeeklySlots((prev) =>
      prev.map((s) =>
        s.isAvailable ? { ...s, shifts: [{ startTime: presetStart, endTime: presetEnd }] } : s
      )
    )
    toast.info(`Applied shift (${presetStart} - ${presetEnd}) to all working days`)
  }

  const handleShiftDurationChange = (newHours: number) => {
    const validHours = Math.max(1, Math.min(16, newHours))
    setShiftDurationHours(validHours)
    setLocalWeeklySlots((prev) =>
      prev.map((s) => {
        if (s.isAvailable) {
          const newShifts = s.shifts.map((st, idx) => {
            if (idx === 0 && st.startTime) {
              const newEnd = computeEndTimeFromStart(st.startTime, validHours)
              return { ...st, endTime: newEnd }
            }
            return st
          })
          return { ...s, shifts: newShifts }
        }
        return s
      })
    )
  }

  const handleSaveSchedule = async () => {
    if (!activeTrainerId) {
      toast.error('No trainer selected')
      return
    }

    // Pre-save conflict validation
    for (const slot of localWeeklySlots) {
      if (slot.isAvailable) {
        const errs = getShiftValidationErrors(slot.shifts)
        if (errs.length > 0) {
          toast.error(`${DAYS_OF_WEEK[slot.dayOfWeek]}: ${errs[0]}`)
          return
        }
      }
    }

    try {
      const payloadSlots = localWeeklySlots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        isAvailable: s.isAvailable,
        startTime: s.shifts[0]?.startTime || '07:00',
        endTime: s.shifts[0]?.endTime || '15:00',
        shifts: s.shifts,
      }))

      await updateScheduleMutation.mutateAsync({
        trainerId: activeTrainerId,
        data: {
          weeklySlots: payloadSlots,
          slotDurationMinutes: scheduleData?.slotDurationMinutes || 45,
          bufferMinutes: scheduleData?.bufferMinutes || 15,
        },
      })
      toast.success('Trainer working schedule saved successfully!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save trainer schedule')
    }
  }
  const completeBookingMutation = useCompletePtBooking()
  const resolveRequestMutation = useResolveTrainerChangeRequest()

  const pendingRequests = (changeRequests || []).filter((r) => r.status === 'PENDING')
  const fallbackLeads = (leads || []).filter(
    (l) => l.source === 'APP_PAYMENT_FALLBACK' || l.notes?.includes('APP_PAYMENT_FALLBACK')
  )

  const handleAddExercise = () => {
    setExercises([...exercises, { name: '', sets: 3, reps: 10, weight: 0, notes: '' }])
  }

  const handleExerciseChange = (index: number, field: string, value: any) => {
    const next = [...exercises]
    next[index] = { ...next[index], [field]: value }
    setExercises(next)
  }

  const handleSaveWorkout = async () => {
    if (!completingBooking) return
    const validExercises = exercises.filter((e) => e.name.trim().length > 0)
    await completeBookingMutation.mutateAsync({
      bookingId: completingBooking._id,
      data: {
        workoutNotes,
        exercisesCompleted: validExercises,
      },
    })
    setCompletingBooking(null)
    setWorkoutNotes('')
    setExercises([{ name: '', sets: 3, reps: 10, weight: 0, notes: '' }])
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Top Banner & KPI Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isTrainer ? 'My 1-on-1 Personal Training Hub' : 'Personal Training Management'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isTrainer
              ? 'Manage your 1-on-1 live video sessions, launch calls, log workouts, and set your weekly availability.'
              : 'Manage 1-on-1 live PT sessions, trainer schedules, member switch requests, and fallback leads.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchBookings()}>
            <IconRefresh className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          {!isTrainer && (
            <Link href="/admin/membership-plans">
              <Button size="sm">
                <IconPlus className="h-4 w-4 mr-1.5" />
                Configure PT Packages
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {isTrainer ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">My Sessions Today</CardTitle>
              <IconDumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Scheduled for {selectedDate}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed Sessions</CardTitle>
              <IconCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(bookings || []).filter((b) => b.status === 'COMPLETED').length}
              </div>
              <p className="text-xs text-muted-foreground">Logged & finished</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Coach Account</CardTitle>
              <IconUserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentTrainer?.name || user?.name || 'Coach'}</div>
              <p className="text-xs text-muted-foreground">{user?.email || 'Certified Personal Trainer'}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Sessions</CardTitle>
              <IconDumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Scheduled for {selectedDate}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Trainers</CardTitle>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trainers?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Certified coaching team</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Change Requests</CardTitle>
              <IconUserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground">Pending frontdesk review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Callback Leads</CardTitle>
              <IconPhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fallbackLeads.length}</div>
              <p className="text-xs text-muted-foreground">15-min SLA guaranteed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className={isTrainer ? "grid grid-cols-2 max-w-md" : "grid grid-cols-4 max-w-2xl"}>
          <TabsTrigger value="sessions">Live & Scheduled Sessions</TabsTrigger>
          <TabsTrigger value="schedule">
            {isTrainer ? 'My Weekly Schedule' : 'Trainer Schedules'}
          </TabsTrigger>
          {!isTrainer && (
            <TabsTrigger value="requests">
              Change Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          {!isTrainer && (
            <TabsTrigger value="inquiries">Callback Inquiries</TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Sessions */}
        <TabsContent value="sessions" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Sessions Schedule</CardTitle>
                <CardDescription>
                  Host enters up to 30 minutes before start. Member lobby opens 5 minutes before.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40"
                />
                {!isTrainer && (
                  <select
                    value={selectedTrainerId}
                    onChange={(e) => setSelectedTrainerId(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">All Trainers</option>
                    {(trainers || []).map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isBookingsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (bookings || []).length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <IconCalendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  No personal training sessions booked for this date.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Trainer</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bookings || []).map((b, idx) => {
                      const user =
                        typeof b.userId === 'object' && b.userId !== null
                          ? (b.userId as { username?: string; phone?: string; email?: string })
                          : { username: 'Member', phone: '' }
                      const expert =
                        typeof b.expertId === 'object' && b.expertId !== null
                          ? (b.expertId as { trainerName?: string; imageUrl?: string })
                          : { trainerName: 'Trainer' }
                      const bookingId =
                        (typeof b._id === 'object' && b._id !== null
                          ? (b._id as any).$oid || (b._id as any).toString()
                          : b._id) || (b as any).id || ''

                      return (
                        <TableRow key={bookingId || `booking-${idx}-${b.startTime}`}>
                          <TableCell className="font-medium">
                            {b.startTime} – {b.endTime}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{user.username || 'Member'}</div>
                            <div className="text-xs text-muted-foreground">{user.phone}</div>
                          </TableCell>
                          <TableCell>{expert.trainerName || b.assignedExpertName}</TableCell>
                          <TableCell>
                            <Badge variant={b.appointmentMode === 'ONLINE' ? 'default' : 'outline'}>
                              {b.appointmentMode === 'ONLINE' ? (
                                <IconVideo className="h-3 w-3 mr-1" />
                              ) : (
                                <IconDumbbell className="h-3 w-3 mr-1" />
                              )}
                              {b.appointmentMode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                b.status === 'CONFIRMED'
                                  ? 'default'
                                  : b.status === 'COMPLETED'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {b.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {b.appointmentMode === 'ONLINE' && b.status === 'CONFIRMED' && (() => {
                              const joinState = getBookingJoinState(b, new Date(), {
                                leadMinutes: 30,
                                graceMinutes: 30,
                              })
                              const isJoinDisabled =
                                joinState.state === 'too_early' || joinState.state === 'ended'

                              if (isJoinDisabled) {
                                return (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    disabled
                                    className="gap-1 bg-gray-400 text-gray-200 cursor-not-allowed opacity-60"
                                    title={joinState.label ?? 'Session video call window closed'}
                                  >
                                    <IconVideo className="h-3.5 w-3.5" />
                                    Start Video Call
                                  </Button>
                                )
                              }

                              return (
                                <Link href={`/admin/live-session/${bookingId}`}>
                                  <Button size="sm" variant="default" className="gap-1">
                                    <IconVideo className="h-3.5 w-3.5" />
                                    Start Video Call
                                  </Button>
                                </Link>
                              )
                            })()}
                            {b.status === 'CONFIRMED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCompletingBooking(b)}
                              >
                                Log Workout
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Trainer Schedule */}
        <TabsContent value="schedule" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>
                  {isTrainer ? 'My Weekly Schedule & Working Hours' : 'Trainer Weekly Schedule & Availability'}
                </CardTitle>
                <CardDescription>
                  Configure working hours, standard 8-hour trainer shifts, session durations (45 min), and buffer periods (15 min).
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {isTrainer ? (
                  <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
                    {currentTrainer?.name || user?.name || 'My Schedule'}
                  </Badge>
                ) : (
                  <select
                    value={activeTrainerId}
                    onChange={(e) => setSelectedTrainerId(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-medium"
                  >
                    {(trainers || []).map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  size="sm"
                  onClick={handleSaveSchedule}
                  disabled={updateScheduleMutation.isPending}
                  className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <IconCheck className="h-4 w-4" />
                  {updateScheduleMutation.isPending ? 'Saving...' : 'Save Schedule'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isScheduleLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Configuration Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30 border">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Slot Duration (Minutes)
                      </label>
                      <Input
                        type="number"
                        value={scheduleData?.slotDurationMinutes || 45}
                        disabled
                        className="mt-1 bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Buffer Between Slots (Minutes)
                      </label>
                      <Input
                        type="number"
                        value={scheduleData?.bufferMinutes || 15}
                        disabled
                        className="mt-1 bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Shift Duration (Hours)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={16}
                        value={shiftDurationHours}
                        onChange={(e) => handleShiftDurationChange(Number(e.target.value) || 8)}
                        className="mt-1 bg-background font-medium"
                        placeholder="8"
                      />
                    </div>
                  </div>

                  {/* Weekly Schedule Table */}
                  <div className="border rounded-md divide-y overflow-hidden">
                    {DAYS_OF_WEEK.map((dayName, idx) => {
                      const daySlot = localWeeklySlots.find((s) => s.dayOfWeek === idx) || {
                        dayOfWeek: idx,
                        isAvailable: idx !== 0,
                        shifts: [{ startTime: '07:00', endTime: '15:00' }],
                      }

                      const totalDuration = computeDayTotalHours(daySlot.shifts)
                      const validationErrors = daySlot.isAvailable ? getShiftValidationErrors(daySlot.shifts) : []

                      return (
                        <div
                          key={dayName}
                          className={`flex flex-col p-4 gap-3 transition-colors ${
                            validationErrors.length > 0
                              ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200'
                              : daySlot.isAvailable
                              ? 'bg-background'
                              : 'bg-muted/20 opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={daySlot.isAvailable}
                                onCheckedChange={(checked) => handleToggleDay(idx, checked)}
                              />
                              <span className="font-semibold text-sm">{dayName}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {daySlot.isAvailable && (
                                <Badge
                                  variant="outline"
                                  className="text-[11px] font-mono font-normal"
                                  title="Total calculated working hours for the day"
                                >
                                  {totalDuration} hrs ({daySlot.shifts.length} shift{daySlot.shifts.length > 1 ? 's' : ''})
                                </Badge>
                              )}
                              <Badge variant={daySlot.isAvailable ? (validationErrors.length > 0 ? 'destructive' : 'default') : 'secondary'}>
                                {daySlot.isAvailable ? (validationErrors.length > 0 ? 'Conflict' : 'Working') : 'Day Off'}
                              </Badge>
                            </div>
                          </div>

                          {validationErrors.length > 0 && (
                            <div className="pl-9 space-y-1">
                              {validationErrors.map((err, errIdx) => (
                                <div key={errIdx} className="text-xs text-red-600 dark:text-red-400 font-medium">
                                  ⚠️ {err}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Shifts list for this day */}
                          {daySlot.isAvailable && (
                            <div className="pl-9 space-y-2">
                              {daySlot.shifts.map((st, shiftIdx) => {
                                const shiftDur = computeDurationHours(st.startTime, st.endTime)
                                return (
                                  <div
                                    key={shiftIdx}
                                    className="flex flex-wrap items-center gap-3 p-2 rounded-md bg-muted/30 border border-muted/50 text-xs"
                                  >
                                    <span className="font-mono text-muted-foreground w-14">
                                      Shift {shiftIdx + 1}:
                                    </span>

                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Start:</span>
                                      <Input
                                        type="time"
                                        value={st.startTime}
                                        onChange={(e) =>
                                          handleShiftStartTimeChange(idx, shiftIdx, e.target.value)
                                        }
                                        className="w-32 h-8 text-xs font-mono bg-background"
                                      />
                                    </div>

                                    <span className="text-muted-foreground">to</span>

                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">End:</span>
                                      <Input
                                        type="time"
                                        value={st.endTime}
                                        onChange={(e) =>
                                          handleShiftEndTimeChange(idx, shiftIdx, e.target.value)
                                        }
                                        className="w-32 h-8 text-xs font-mono bg-background"
                                      />
                                    </div>

                                    <Badge variant="secondary" className="text-[10px] font-mono font-normal">
                                      {shiftDur} hrs
                                    </Badge>

                                    {daySlot.shifts.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 ml-auto"
                                        onClick={() => handleRemoveShiftWindow(idx, shiftIdx)}
                                        title="Remove split shift"
                                      >
                                        <IconTrash className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                )
                              })}

                              <div className="pt-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddShiftWindow(idx)}
                                  className="h-7 text-xs gap-1 border-dashed text-primary hover:bg-accent"
                                >
                                  <IconPlus className="h-3 w-3" />
                                  Add Split Shift Window
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Bottom Save Action Bar */}
                  <div className="flex justify-end pt-2">
                    <Button
                      size="default"
                      type="button"
                      onClick={handleSaveSchedule}
                      disabled={updateScheduleMutation.isPending}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    >
                      <IconCheck className="h-4 w-4" />
                      {updateScheduleMutation.isPending ? 'Saving Working Hours...' : 'Save Schedule Changes'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Change Requests */}
        <TabsContent value="requests" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Member Trainer Change Requests</CardTitle>
              <CardDescription>
                Option A Policy: Members submit in-app requests; Frontdesk confirms reassignment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRequestsLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (changeRequests || []).length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <IconUserCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  No trainer change requests pending.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Current Trainer</TableHead>
                      <TableHead>Requested Trainer</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(changeRequests || []).map((req, idx) => {
                      const reqId = req.id || req._id || ''
                      return (
                        <TableRow key={reqId || `req-${idx}`}>
                          <TableCell>
                            <div className="font-medium">{req.userId?.username || 'Member'}</div>
                            <div className="text-xs text-muted-foreground">{req.userId?.phone}</div>
                          </TableCell>
                          <TableCell>{req.currentTrainerId?.trainerName || 'None'}</TableCell>
                          <TableCell className="font-medium">
                            {req.requestedTrainerId?.trainerName}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                req.status === 'APPROVED'
                                  ? 'default'
                                  : req.status === 'PENDING'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {req.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {req.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={resolveRequestMutation.isPending || !reqId}
                                  onClick={() =>
                                    resolveRequestMutation.mutate({
                                      requestId: reqId,
                                      action: 'APPROVE',
                                      adminNotes: 'Approved by Frontdesk',
                                    })
                                  }
                                >
                                  <IconCheck className="h-3.5 w-3.5 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={resolveRequestMutation.isPending || !reqId}
                                  onClick={() =>
                                    resolveRequestMutation.mutate({
                                      requestId: reqId,
                                      action: 'REJECT',
                                      adminNotes: 'Declined due to trainer capacity',
                                    })
                                  }
                                >
                                  <IconX className="h-3.5 w-3.5 mr-1" />
                                  Decline
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Callback Inquiries */}
        <TabsContent value="inquiries" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Safe Fallback Callback Inquiries</CardTitle>
              <CardDescription>
                Members who tapped &quot;Request Callback&quot; when offline/fallback mode is active. Guaranteed 15-minute response SLA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fallbackLeads.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <IconPhoneCall className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  No pending callback inquiries.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Inquiry Notes</TableHead>
                      <TableHead>SLA Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fallbackLeads.map((lead, idx) => {
                      const leadId = lead.id || (lead as any)._id || `lead-${idx}-${lead.phone || ''}`
                      const leadName = lead.name || (lead as any).leadName || 'Member'
                      const isEscalated = (lead as any).isEscalated === true

                      return (
                        <TableRow key={leadId}>
                          <TableCell className="font-medium">{leadName}</TableCell>
                          <TableCell>
                            <div>{lead.phone}</div>
                            <div className="text-xs text-muted-foreground">{lead.email}</div>
                          </TableCell>
                          <TableCell className="max-w-sm truncate">{lead.notes}</TableCell>
                          <TableCell>
                            {isEscalated ? (
                              <Badge variant="destructive" className="animate-pulse">
                                OVERDUE (&gt;15m)
                              </Badge>
                            ) : (
                              <Badge variant="secondary">On Track (&lt;15m)</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <a href={`tel:${lead.phone}`}>
                              <Button size="sm" variant="outline">
                                <IconPhoneCall className="h-3.5 w-3.5 mr-1" />
                                Call Member
                              </Button>
                            </a>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workout Logger Dialog */}
      <Dialog open={Boolean(completingBooking)} onOpenChange={() => setCompletingBooking(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Workout & Complete Session</DialogTitle>
            <DialogDescription>
              Record exercises completed, sets, repetitions, and performance notes for the member&apos;s history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="text-sm font-medium">Session Overview Notes</label>
              <Textarea
                placeholder="e.g. Great intensity on compound lifts. Focused on eccentric control."
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Exercises Completed</label>
                <Button size="sm" variant="ghost" onClick={handleAddExercise}>
                  <IconPlus className="h-3.5 w-3.5 mr-1" />
                  Add Exercise
                </Button>
              </div>

              {exercises.map((ex, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/40 p-2.5 rounded-md">
                  <div className="col-span-5">
                    <Input
                      placeholder="Exercise Name (e.g. Barbell Squat)"
                      value={ex.name}
                      onChange={(e) => handleExerciseChange(idx, 'name', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Sets"
                      value={ex.sets}
                      onChange={(e) => handleExerciseChange(idx, 'sets', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Reps"
                      value={ex.reps}
                      onChange={(e) => handleExerciseChange(idx, 'reps', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Weight (kg)"
                      value={ex.weight}
                      onChange={(e) => handleExerciseChange(idx, 'weight', Number(e.target.value))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingBooking(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWorkout}>Save & Complete Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
