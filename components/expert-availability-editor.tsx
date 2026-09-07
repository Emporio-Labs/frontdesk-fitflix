'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  IconCalendarOff,
  IconCheck,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  useExpertSchedule,
  useUpdateExpertSchedule,
} from '@/hooks/use-expert-schedule'
import {
  APPOINTMENT_MODES,
  type AppointmentModeValue,
  type ExpertTypeValue,
} from '@/lib/services/expert-schedule.service'
import { toast } from 'sonner'

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

type LocalDay = {
  dayOfWeek: number
  isAvailable: boolean
  shifts: Array<{ startTime: string; endTime: string }>
}

const DEFAULT_DAYS: LocalDay[] = [
  { dayOfWeek: 1, isAvailable: true, shifts: [{ startTime: '07:00', endTime: '15:00' }] },
  { dayOfWeek: 2, isAvailable: true, shifts: [{ startTime: '07:00', endTime: '15:00' }] },
  { dayOfWeek: 3, isAvailable: true, shifts: [{ startTime: '07:00', endTime: '15:00' }] },
  { dayOfWeek: 4, isAvailable: true, shifts: [{ startTime: '07:00', endTime: '15:00' }] },
  { dayOfWeek: 5, isAvailable: true, shifts: [{ startTime: '07:00', endTime: '15:00' }] },
  { dayOfWeek: 6, isAvailable: true, shifts: [{ startTime: '08:00', endTime: '16:00' }] },
  { dayOfWeek: 0, isAvailable: false, shifts: [{ startTime: '08:00', endTime: '14:00' }] },
]

const parseTimeToMins = (timeStr: string): number => {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

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

const computeDayTotalHours = (shifts: Array<{ startTime: string; endTime: string }>): string => {
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

/**
 * The same overlap rules the backend enforces in `updateExpertSchedule`, run
 * locally so a conflict is visible while editing rather than only on save.
 */
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

const toDateInput = (value: string | Date): string => {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export interface ExpertAvailabilityEditorProps {
  expertType: ExpertTypeValue
  /** The expert's id, or "me" for the signed-in expert editing their own. */
  expertId: string
  expertName?: string
  title?: string
  description?: string
  /** Rendered in the header, e.g. an expert picker for admins. */
  headerAction?: React.ReactNode
  /** Slot duration and buffer are read-only for trainers today. */
  allowDurationEdit?: boolean
}

/**
 * Weekly working hours, split shifts, supported appointment modes and blackout
 * dates for one expert.
 *
 * Shared by the personal-training, nutritionist and sports-scientist pages —
 * they all edit the same `ExpertSchedule` document through the same
 * `/api/v1/experts/...` route, and the backend decides who may write which one
 * (admin and front desk edit anyone; everybody else only themselves).
 */
export function ExpertAvailabilityEditor({
  expertType,
  expertId,
  expertName,
  title,
  description,
  headerAction,
  allowDurationEdit = false,
}: ExpertAvailabilityEditorProps) {
  const { data: scheduleData, isLoading } = useExpertSchedule(expertType, expertId)
  const updateSchedule = useUpdateExpertSchedule(expertType)

  const [shiftDurationHours, setShiftDurationHours] = useState<number>(8)
  const [localWeeklySlots, setLocalWeeklySlots] = useState<LocalDay[]>(DEFAULT_DAYS)
  const [supportedModes, setSupportedModes] = useState<AppointmentModeValue[]>([
    'ONLINE',
    'IN_PERSON',
  ])
  const [blackoutDates, setBlackoutDates] = useState<string[]>([])
  const [newBlackoutDate, setNewBlackoutDate] = useState<string>('')
  const [slotDuration, setSlotDuration] = useState<number>(45)
  const [bufferMinutes, setBufferMinutes] = useState<number>(15)
  const [isActive, setIsActive] = useState<boolean>(true)

  useEffect(() => {
    if (!scheduleData) return

    if (scheduleData.weeklySlots?.length) {
      setLocalWeeklySlots(
        [0, 1, 2, 3, 4, 5, 6].map((idx) => {
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
            shifts = [
              {
                startTime: idx === 0 ? '08:00' : '07:00',
                endTime: idx === 0 ? '14:00' : '15:00',
              },
            ]
          }
          return {
            dayOfWeek: idx,
            isAvailable: existing ? existing.isAvailable : idx !== 0,
            shifts,
          }
        })
      )
    } else {
      setLocalWeeklySlots(DEFAULT_DAYS)
    }

    // A schedule written before supportedModes existed comes back with both,
    // which is the safe reading: it was never restricted.
    setSupportedModes(
      scheduleData.supportedModes?.length
        ? scheduleData.supportedModes
        : ['ONLINE', 'IN_PERSON']
    )
    setBlackoutDates((scheduleData.blackoutDates || []).map(toDateInput).filter(Boolean))
    setSlotDuration(scheduleData.slotDurationMinutes || 45)
    setBufferMinutes(scheduleData.bufferMinutes ?? 15)
    setIsActive(scheduleData.isActive !== false)
  }, [scheduleData, expertId])

  const handleToggleDay = (dayOfWeek: number, available: boolean) => {
    setLocalWeeklySlots((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, isAvailable: available } : s))
    )
  }

  const handleShiftStartTimeChange = (dayOfWeek: number, shiftIndex: number, newStart: string) => {
    setLocalWeeklySlots((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek !== dayOfWeek) return s
        const newShifts = [...s.shifts]
        newShifts[shiftIndex] = {
          ...newShifts[shiftIndex],
          startTime: newStart,
          endTime: computeEndTimeFromStart(newStart, shiftDurationHours),
        }
        return { ...s, shifts: newShifts }
      })
    )
  }

  const handleShiftEndTimeChange = (dayOfWeek: number, shiftIndex: number, newEnd: string) => {
    setLocalWeeklySlots((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek !== dayOfWeek) return s
        const newShifts = [...s.shifts]
        newShifts[shiftIndex] = { ...newShifts[shiftIndex], endTime: newEnd }
        return { ...s, shifts: newShifts }
      })
    )
  }

  const handleAddShiftWindow = (dayOfWeek: number) => {
    setLocalWeeklySlots((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek !== dayOfWeek) return s
        const lastShift = s.shifts[s.shifts.length - 1]
        let newStart = '18:00'
        if (lastShift?.endTime) {
          const [h, m] = lastShift.endTime.split(':').map(Number)
          const nextH = ((h || 0) + 1) % 24
          newStart = `${String(nextH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
        }
        return {
          ...s,
          shifts: [...s.shifts, { startTime: newStart, endTime: computeEndTimeFromStart(newStart, 3) }],
        }
      })
    )
  }

  const handleRemoveShiftWindow = (dayOfWeek: number, shiftIndex: number) => {
    setLocalWeeklySlots((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek && s.shifts.length > 1
          ? { ...s, shifts: s.shifts.filter((_, idx) => idx !== shiftIndex) }
          : s
      )
    )
  }

  const handleShiftDurationChange = (newHours: number) => {
    const validHours = Math.max(1, Math.min(16, newHours))
    setShiftDurationHours(validHours)
    setLocalWeeklySlots((prev) =>
      prev.map((s) => {
        if (!s.isAvailable) return s
        return {
          ...s,
          shifts: s.shifts.map((st, idx) =>
            idx === 0 && st.startTime
              ? { ...st, endTime: computeEndTimeFromStart(st.startTime, validHours) }
              : st
          ),
        }
      })
    )
  }

  const handleToggleMode = (mode: AppointmentModeValue, enabled: boolean) => {
    setSupportedModes((prev) => {
      const next = enabled ? [...new Set([...prev, mode])] : prev.filter((m) => m !== mode)
      // Turning off the last mode would make the expert unbookable in a way
      // that reads as a bug rather than a decision — `Accepting bookings` below
      // is the deliberate off switch.
      if (next.length === 0) {
        toast.error('At least one appointment mode must stay enabled')
        return prev
      }
      return next
    })
  }

  const handleAddBlackoutDate = () => {
    if (!newBlackoutDate) return
    if (blackoutDates.includes(newBlackoutDate)) {
      toast.info('That date is already blocked')
      return
    }
    setBlackoutDates((prev) => [...prev, newBlackoutDate].sort())
    setNewBlackoutDate('')
  }

  const hasErrors = useMemo(
    () =>
      localWeeklySlots.some(
        (s) => s.isAvailable && getShiftValidationErrors(s.shifts).length > 0
      ),
    [localWeeklySlots]
  )

  const handleSave = async () => {
    if (!expertId) {
      toast.error('No expert selected')
      return
    }

    for (const slot of localWeeklySlots) {
      if (!slot.isAvailable) continue
      const errs = getShiftValidationErrors(slot.shifts)
      if (errs.length > 0) {
        toast.error(`${DAYS_OF_WEEK[slot.dayOfWeek]}: ${errs[0]}`)
        return
      }
    }

    try {
      await updateSchedule.mutateAsync({
        expertId,
        data: {
          weeklySlots: localWeeklySlots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            isAvailable: s.isAvailable,
            // `startTime`/`endTime` mirror the first shift so a client reading
            // only the flat pair still sees the right window.
            startTime: s.shifts[0]?.startTime || '07:00',
            endTime: s.shifts[0]?.endTime || '15:00',
            shifts: s.shifts,
          })),
          slotDurationMinutes: slotDuration,
          bufferMinutes,
          supportedModes,
          blackoutDates,
          isActive,
        },
      })
      toast.success('Availability saved')
    } catch {
      // useUpdateExpertSchedule already surfaces the server's message.
    }
  }

  const saveButton = (
    <Button
      size="sm"
      onClick={handleSave}
      disabled={updateSchedule.isPending || hasErrors}
      className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
    >
      <IconCheck className="h-4 w-4" />
      {updateSchedule.isPending ? 'Saving...' : 'Save Availability'}
    </Button>
  )

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle>{title ?? 'Weekly Schedule & Availability'}</CardTitle>
          <CardDescription>
            {description ??
              'Working hours drive what members can book. Blocked dates and disabled modes remove times immediately.'}
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          {headerAction ??
            (expertName ? (
              <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
                {expertName}
              </Badge>
            ) : null)}
          {saveButton}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30 border">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Session Length (Minutes)
                </label>
                <Input
                  type="number"
                  min={15}
                  max={120}
                  value={slotDuration}
                  disabled={!allowDurationEdit}
                  onChange={(e) => setSlotDuration(Number(e.target.value) || 45)}
                  className="mt-1 bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Buffer Between Sessions (Minutes)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={bufferMinutes}
                  disabled={!allowDurationEdit}
                  onChange={(e) => setBufferMinutes(Number(e.target.value) || 0)}
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

            {/* Supported modes + master switch */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border space-y-3">
                <div>
                  <p className="text-sm font-semibold">Appointment modes offered</p>
                  <p className="text-xs text-muted-foreground">
                    A member asking for a mode this expert doesn&apos;t offer sees no
                    times from them at all.
                  </p>
                </div>
                {APPOINTMENT_MODES.map((mode) => (
                  <div key={mode.value} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{mode.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{mode.hint}</span>
                    </div>
                    <Switch
                      checked={supportedModes.includes(mode.value)}
                      onCheckedChange={(checked) => handleToggleMode(mode.value, checked)}
                    />
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Accepting bookings</p>
                    <p className="text-xs text-muted-foreground">
                      Turning this off hides every future time without touching the
                      weekly hours below.
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
            </div>

            {/* Blackout dates */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center gap-2">
                <IconCalendarOff className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">Blocked dates</p>
                  <p className="text-xs text-muted-foreground">
                    Leave and holidays. A blocked date returns no times for this
                    expert, whatever the weekly hours say.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={newBlackoutDate}
                  onChange={(e) => setNewBlackoutDate(e.target.value)}
                  className="w-44 h-9 bg-background"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBlackoutDate}
                  disabled={!newBlackoutDate}
                  className="gap-1"
                >
                  <IconPlus className="h-3.5 w-3.5" />
                  Block date
                </Button>
              </div>
              {blackoutDates.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {blackoutDates.map((d) => (
                    <Badge key={d} variant="secondary" className="gap-1 font-mono text-[11px]">
                      {d}
                      <button
                        type="button"
                        aria-label={`Unblock ${d}`}
                        onClick={() => setBlackoutDates((prev) => prev.filter((x) => x !== d))}
                        className="ml-1 text-muted-foreground hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No blocked dates.</p>
              )}
            </div>

            {/* Weekly grid */}
            <div className="border rounded-md divide-y overflow-hidden">
              {DAYS_OF_WEEK.map((dayName, idx) => {
                const daySlot =
                  localWeeklySlots.find((s) => s.dayOfWeek === idx) || {
                    dayOfWeek: idx,
                    isAvailable: idx !== 0,
                    shifts: [{ startTime: '07:00', endTime: '15:00' }],
                  }

                const totalDuration = computeDayTotalHours(daySlot.shifts)
                const validationErrors = daySlot.isAvailable
                  ? getShiftValidationErrors(daySlot.shifts)
                  : []

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
                            {totalDuration} hrs ({daySlot.shifts.length} shift
                            {daySlot.shifts.length > 1 ? 's' : ''})
                          </Badge>
                        )}
                        <Badge
                          variant={
                            daySlot.isAvailable
                              ? validationErrors.length > 0
                                ? 'destructive'
                                : 'default'
                              : 'secondary'
                          }
                        >
                          {daySlot.isAvailable
                            ? validationErrors.length > 0
                              ? 'Conflict'
                              : 'Working'
                            : 'Day Off'}
                        </Badge>
                      </div>
                    </div>

                    {validationErrors.length > 0 && (
                      <div className="pl-9 space-y-1">
                        {validationErrors.map((err, errIdx) => (
                          <div
                            key={errIdx}
                            className="text-xs text-red-600 dark:text-red-400 font-medium"
                          >
                            ⚠️ {err}
                          </div>
                        ))}
                      </div>
                    )}

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

                              <Badge
                                variant="secondary"
                                className="text-[10px] font-mono font-normal"
                              >
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

            <div className="flex justify-end pt-2">{saveButton}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
