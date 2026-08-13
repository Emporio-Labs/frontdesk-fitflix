'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VideoConferenceModal } from '@/components/video-conference/video-conference-modal'
import {
  IconClock,
  IconDroplet,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconTrash,
  IconUsers,
  IconVideo,
  IconCopy,
  IconCheck,
  IconMapPin,
  IconWorld,
  IconCoins,
  IconToggleRight,
  IconToggleLeft,
  IconCalendarEvent,
  IconRepeat,
  IconCalendarTime,
  IconAlertTriangle,
  IconChevronDown,
  IconLoader2,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  useCreateTherapy,
  useDeleteTherapy,
  useTherapies,
  useUpdateTherapy,
} from '@/hooks/use-therapies'
import {
  useGroupClasses,
  useCreateGroupClass,
  useUpdateGroupClass,
  useDeleteGroupClass,
  useTogglePublishGroupClass,
} from '@/hooks/use-group-classes'
import { useSlots } from '@/hooks/use-slots'
import type { TherapyCatalogItem } from '@/lib/services/therapy.service'
import type { GroupClass, GroupClassMode } from '@/lib/services/group-class.service'
import { slotService, type Slot } from '@/lib/services/slot.service'
import { LiveSessionsPanel } from '@/components/live-sessions/live-sessions-panel'
import { useLiveSessions, useAllScheduledSessions } from '@/hooks/use-live-sessions'
import { resolveBookingWindow } from '@/lib/booking-window'
import GroupClassBookingsPanel from './group-class-bookings-panel'

type ScheduleMode = 'one-time' | 'recurring'
type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly'
type RecurrenceLimit = 'end-date' | 'occurrences'

interface GcSchedule {
  mode: ScheduleMode
  oneTimeDate: string
  startTime: string
  endTime: string
  frequency: RecurrenceFrequency
  daysOfWeek: number[]
  limitMode: RecurrenceLimit
  endDate: string
  occurrences: number
}

const DEFAULT_SCHEDULE: GcSchedule = {
  mode: 'recurring',
  oneTimeDate: '',
  startTime: '07:00',
  endTime: '08:00',
  frequency: 'weekly',
  daysOfWeek: [1, 3, 5],
  limitMode: 'occurrences',
  endDate: '',
  occurrences: 12,
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function maxEndDate(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 3)
  return d.toISOString().slice(0, 10)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function computeOccurrences(s: GcSchedule): Date[] {
  const maxDate = new Date(maxEndDate() + 'T00:00:00')
  const results: Date[] = []

  if (s.mode === 'one-time') {
    if (!s.oneTimeDate) return []
    const d = new Date(`${s.oneTimeDate}T00:00:00`)
    if (!Number.isNaN(d.getTime())) results.push(d)
    return results
  }

  const absMax = s.limitMode === 'end-date'
    ? (s.endDate ? new Date(`${s.endDate}T00:00:00`) : maxDate)
    : maxDate
  const capDate = absMax < maxDate ? absMax : maxDate
  const maxOccurrences = s.limitMode === 'occurrences' ? Math.min(s.occurrences, 90) : 90

  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= capDate && results.length < maxOccurrences) {
    const dayOfWeek = cursor.getDay()
    const dayOfMonth = cursor.getDate()

    if (s.frequency === 'daily') {
      results.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    } else if (s.frequency === 'weekly') {
      if (s.daysOfWeek.includes(dayOfWeek)) {
        results.push(new Date(cursor))
      }
      cursor.setDate(cursor.getDate() + 1)
    } else if (s.frequency === 'monthly') {
      const targetDay = s.daysOfWeek.length > 0 ? s.daysOfWeek[0] : new Date().getDate()
      if (dayOfMonth === targetDay) {
        results.push(new Date(cursor))
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  return results
}

function compileScheduleInfo(s: GcSchedule): string {
  const timeRange = `${s.startTime} – ${s.endTime}`
  if (s.mode === 'one-time') {
    const dateLabel = s.oneTimeDate ? formatDate(s.oneTimeDate) : 'TBD'
    return `One-Time: ${dateLabel} · ${timeRange}`
  }
  const occurrences = computeOccurrences(s)
  const countLabel = occurrences.length > 0 ? `${occurrences.length} occurrence${occurrences.length !== 1 ? 's' : ''}` : 'no occurrences'
  if (s.frequency === 'daily') {
    const limitLabel = s.limitMode === 'end-date' && s.endDate ? `until ${formatDate(s.endDate)}` : `${s.occurrences} occurrence${s.occurrences !== 1 ? 's' : ''}`
    return `Daily at ${timeRange} · ${limitLabel} (${countLabel})`
  }
  if (s.frequency === 'weekly') {
    const days = s.daysOfWeek.slice().sort((a, b) => a - b).map(d => DAY_LABELS[d]).join(', ')
    const limitLabel = s.limitMode === 'end-date' && s.endDate ? `until ${formatDate(s.endDate)}` : `${s.occurrences} occurrence${s.occurrences !== 1 ? 's' : ''}`
    return `Weekly on ${days} at ${timeRange} · ${limitLabel} (${countLabel})`
  }
  const dayNum = s.daysOfWeek[0] ?? new Date().getDate()
  const limitLabel = s.limitMode === 'end-date' && s.endDate ? `until ${formatDate(s.endDate)}` : `${s.occurrences} occurrence${s.occurrences !== 1 ? 's' : ''}`
  return `Monthly on day ${dayNum} at ${timeRange} · ${limitLabel} (${countLabel})`
}

function parseTimeFromScheduleInfo(info: string): { start: string; end: string } | null {
  const match = info.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/)
  if (!match) return null
  return { start: match[1], end: match[2] }
}

function detectTrainerConflicts(
  instructor: string,
  schedule: GcSchedule,
  allClasses: GroupClass[],
  editingId?: string,
): string[] {
  if (!instructor.trim()) return []
  const conflicts: string[] = []
  const newStart = timeToMinutes(schedule.startTime)
  const newEnd = timeToMinutes(schedule.endTime)
  if (newStart === null || newEnd === null) return []
  for (const gc of allClasses) {
    if (gc.id === editingId || !gc.isActive || gc.instructor.trim().toLowerCase() !== instructor.trim().toLowerCase()) continue
    const parsed = parseTimeFromScheduleInfo(gc.scheduleInfo)
    if (!parsed) continue
    const existStart = timeToMinutes(parsed.start)
    const existEnd = timeToMinutes(parsed.end)
    if (existStart === null || existEnd === null) continue
    if (!(newEnd <= existStart || newStart >= existEnd)) {
      conflicts.push(gc.name)
    }
  }
  return conflicts
}

function formatSlotDate(rawDate?: string, isDaily = false) {
  if (isDaily || !rawDate) {
    return 'Daily'
  }

  const parsed = new Date(rawDate)
  if (Number.isNaN(parsed.getTime())) {
    return 'Daily'
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function timeToMinutes(value: string): number | null {
  const [hoursRaw, minutesRaw] = value.split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return hours * 60 + minutes
}

function minutesToTime(value: number): string {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMins = timeToMinutes(startTime)
  if (startMins === null) return '10:00'
  const dur = Math.max(1, Number(durationMinutes) || 60)
  const totalEndMins = (startMins + dur) % (24 * 60)
  return minutesToTime(totalEndMins)
}

export default function TherapiesPage() {
  const [activeTab, setActiveTab] = useState('therapies')
  const [selectedClassFilter, setSelectedClassFilter] = useState<{ id: string; name: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TherapyCatalogItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    time: 60,
    creditCost: 1,
    description: '',
    tags: '',
  })
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([])
  const [slotSearchTerm, setSlotSearchTerm] = useState('')
  const [manualSlotIds, setManualSlotIds] = useState('')
  const [showManualSlotInput, setShowManualSlotInput] = useState(false)
  const [slotPlan, setSlotPlan] = useState({
    startTime: '09:00',
    endTime: '17:00',
    capacityPerHour: 1,
  })
  const [isGeneratingSlots, setIsGeneratingSlots] = useState(false)

  // ── Group Classes state ───────────────────────────────────────────────────
  const [gcDialogOpen, setGcDialogOpen] = useState(false)
  const [editingGc, setEditingGc] = useState<GroupClass | null>(null)
  const [gcSearchTerm, setGcSearchTerm] = useState('')
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean
    sessionId: string
    roomID: string
    sessionTitle: string
    mode?: 'VideoConference' | 'LiveStreaming'
  }>({
    isOpen: false,
    sessionId: '',
    roomID: '',
    sessionTitle: '',
    mode: 'VideoConference',
  })
  const defaultGcForm = {
    name: '',
    description: '',
    mode: 'offline' as GroupClassMode,
    sessionType: '' as 'group_class' | 'live_stream' | '',
    access: 'members_only' as 'members_only' | 'open_to_all',
    bookingRequirement: 'credits_required' as 'free' | 'credits_required',
    instructor: '',
    durationMinutes: 60,
    creditsRequired: 1,
    maxParticipants: 20,
    tags: '',
    scheduleInfo: '',
    isActive: true,
    locationAddress: '',
    streamRoomId: '',
    enableWaitlist: false,
    isPublished: true,
    bookingWindowValue: 72,
    bookingWindowUnit: 'hours' as 'hours' | 'days',
    bookingCloseValue: '' as string | number,
    bookingCloseUnit: 'minutes' as 'minutes' | 'hours' | 'days',
  }
  const [gcForm, setGcForm] = useState(defaultGcForm)
  const [gcSchedule, setGcSchedule] = useState<GcSchedule>(DEFAULT_SCHEDULE)
  const [showPreview, setShowPreview] = useState(false)
  const [gcErrors, setGcErrors] = useState<Record<string, string>>({})
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<string | null>(null)
  const [use12HourFormat, setUse12HourFormat] = useState(true)
  const [capacityConfirmOpen, setCapacityConfirmOpen] = useState(false)
  const [capacityWarnInfo, setCapacityWarnInfo] = useState<{ payload: any; maxBooked: number; gcSlots: Slot[] } | null>(null)
  const [publishWarnOpen, setPublishWarnOpen] = useState(false)
  const [pendingPublishGc, setPendingPublishGc] = useState<{ id: string; isPublished: boolean } | null>(null)
  const [gcPublishFilter, setGcPublishFilter] = useState<'all' | 'published' | 'unpublished' | 'retired' | 'completed'>('all')
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)

  const isFormDirty = () => {
    if (editingGc) {
      const anyFieldChanged = (Object.keys(defaultGcForm) as Array<keyof typeof defaultGcForm>).some((key) => isFieldChanged(key))
      if (anyFieldChanged) return true

      const currentScheduleInfo = compileScheduleInfo(gcSchedule)
      return currentScheduleInfo !== (editingGc.scheduleInfo || '')
    }

    const isScheduleChanged =
      gcSchedule.mode !== DEFAULT_SCHEDULE.mode ||
      gcSchedule.frequency !== DEFAULT_SCHEDULE.frequency ||
      gcSchedule.oneTimeDate !== DEFAULT_SCHEDULE.oneTimeDate ||
      gcSchedule.startTime !== DEFAULT_SCHEDULE.startTime ||
      gcSchedule.daysOfWeek.length > 0 ||
      gcSchedule.occurrences !== DEFAULT_SCHEDULE.occurrences

    return (
      gcForm.name.trim() !== '' ||
      gcForm.description.trim() !== '' ||
      gcForm.instructor.trim() !== '' ||
      gcForm.locationAddress.trim() !== '' ||
      gcForm.streamRoomId !== '' ||
      gcForm.tags.trim() !== '' ||
      gcForm.creditsRequired !== 1 ||
      gcForm.durationMinutes !== 60 ||
      gcForm.maxParticipants !== 20 ||
      gcForm.access !== 'members_only' ||
      gcForm.bookingWindowValue !== 72 ||
      gcForm.bookingCloseValue !== '' ||
      isScheduleChanged
    )
  }

  const handleGcDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (isFormDirty()) {
        setDiscardConfirmOpen(true)
      } else {
        setGcDialogOpen(false)
        resetGcForm()
      }
    } else {
      setGcDialogOpen(true)
    }
  }

  const isFieldChanged = (fieldName: keyof typeof gcForm) => {
    if (!editingGc) return false
    const currentValue = gcForm[fieldName]
    const originalValue = editingGc[fieldName]
    if (fieldName === 'tags') {
      const currentTags = String(gcForm.tags).split(',').map((t) => t.trim()).filter(Boolean).sort().join(',')
      const originalTags = (editingGc.tags || []).map((t) => t.trim()).filter(Boolean).sort().join(',')
      return currentTags !== originalTags
    }
    return currentValue !== originalValue
  }

  const renderModifiedBadge = (fieldName: keyof typeof gcForm) => {
    if (isFieldChanged(fieldName)) {
      return (
        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/50 ml-2 animate-pulse">
          Modified
        </span>
      )
    }
    return null
  }

  const formatTimeTo12Hour = (time24: string): string => {
    const [hoursRaw, minutesRaw] = time24.split(':')
    let hours = parseInt(hoursRaw, 10)
    const minutes = parseInt(minutesRaw, 10)
    if (isNaN(hours) || isNaN(minutes)) return time24
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    const minutesStr = minutes < 10 ? '0' + minutes : minutes
    return `${hours}:${minutesStr} ${ampm}`
  }

  const {
    data: therapies = [],
    isLoading,
    isError,
    refetch: refetchTherapies,
  } = useTherapies()
  const {
    data: slots = [],
    isLoading: isLoadingSlots,
    isError: isSlotsError,
    refetch: refetchSlots,
  } = useSlots()
  const {
    data: groupClasses = [],
    isLoading: isLoadingGc,
    refetch: refetchGc,
  } = useGroupClasses()

  // GCLS: "Host Session" on a class card must join the same ZEGOCLOUD room as the
  // member's User App. The User App joins the per-occurrence ScheduledSession room
  // (session.videoConferenceId), not the Class template id — so resolve the class's
  // live/next scheduled session here instead of falling back to gc.id.
  //
  // getAll() returns ALL sessions (incl. past) sorted ascending, so we can't just
  // take the first per class — that could be last week's occurrence, whose room the
  // members booking THIS week never join. Pick the occurrence closest to "now":
  // currently-live first, else the soonest upcoming, else the most recent past.
  const { data: liveSessionsForHosting = [] } = useLiveSessions()
  const nextSessionByClassId = useMemo(() => {
    const sessionBounds = (s: (typeof liveSessionsForHosting)[number]) => {
      const day = (s.sessionDate || '').split('T')[0]
      const start = new Date(`${day}T${s.startTime || '00:00'}`).getTime()
      const end = new Date(`${day}T${s.endTime || s.startTime || '23:59'}`).getTime()
      return { start, end }
    }
    // Lower rank = better host candidate: 0 live/ready now (including 30 min pre-activation window), 1 upcoming, 2 already ended.
    const rankOf = (s: (typeof liveSessionsForHosting)[number], now: number) => {
      const { start, end } = sessionBounds(s)
      const leadMs = 30 * 60 * 1000 // 30 minutes pre-activation lead time
      if (Number.isNaN(start)) return { rank: 3, distance: Infinity }
      if (now >= start - leadMs && now <= end) return { rank: 0, distance: 0 }
      if (start > now) return { rank: 1, distance: start - now }
      return { rank: 2, distance: now - end }
    }
    const now = Date.now()
    const best = new Map<
      string,
      { session: (typeof liveSessionsForHosting)[number]; rank: number; distance: number }
    >()
    for (const s of liveSessionsForHosting) {
      if (s.status === 'CANCELLED' || s.status === 'COMPLETED') continue
      const { rank, distance } = rankOf(s, now)
      const current = best.get(s.classId)
      if (
        !current ||
        rank < current.rank ||
        (rank === current.rank && distance < current.distance)
      ) {
        best.set(s.classId, { session: s, rank, distance })
      }
    }
    const m = new Map<string, (typeof liveSessionsForHosting)[number]>()
    best.forEach((v, k) => m.set(k, v.session))
    return m
  }, [liveSessionsForHosting])

  // Group Classes "Completed" tab: a class is completed once it has at least
  // one scheduled occurrence and every non-cancelled occurrence has finished
  // (backend status COMPLETED, or its end instant has passed — reusing
  // resolveBookingWindow, the same source of truth already used for booking
  // join windows elsewhere in the app). Classes with zero sessions are never
  // auto-completed — nothing has finished for them yet.
  const { data: allScheduledSessions = [] } = useAllScheduledSessions()
  const completedClassIds = useMemo(() => {
    const now = new Date()
    const hasSession = new Set<string>()
    const hasUnfinished = new Set<string>()
    for (const s of allScheduledSessions) {
      if (!s.classId) continue
      if (s.status === 'CANCELLED') continue
      hasSession.add(s.classId)
      if (s.status === 'COMPLETED') continue
      const window = resolveBookingWindow({
        startsAtUtc: s.startsAtUtc,
        endsAtUtc: s.endsAtUtc,
        date: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
      })
      if (!window || now < window.endsAt) {
        hasUnfinished.add(s.classId)
      }
    }
    const result = new Set<string>()
    hasSession.forEach((id) => {
      if (!hasUnfinished.has(id)) result.add(id)
    })
    return result
  }, [allScheduledSessions])

  const createTherapy = useCreateTherapy()
  const updateTherapy = useUpdateTherapy()
  const deleteTherapy = useDeleteTherapy()
  const createGroupClass = useCreateGroupClass()
  const updateGroupClass = useUpdateGroupClass()
  const deleteGroupClass = useDeleteGroupClass()
  const togglePublishGroupClass = useTogglePublishGroupClass()

  const handleTogglePublish = async (gc: GroupClass, targetStatus: boolean) => {
    if (targetStatus) {
      const gcSlots = slots.filter((slot) => gc.slots?.includes(slot._id))
      const isIncomplete =
        !gc.instructor.trim() ||
        gc.instructor === 'Staff' ||
        gc.maxParticipants <= 0 ||
        gcSlots.length === 0

      if (isIncomplete) {
        setPendingPublishGc({ id: gc.id, isPublished: true })
        setPublishWarnOpen(true)
        return
      }
    }
    await togglePublishGroupClass.mutateAsync({ id: gc.id, isPublished: targetStatus })
  }

  const items = therapies

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const query = searchTerm.toLowerCase()
        return (
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query))
        )
      }),
    [items, searchTerm]
  )

  const parseCsvInput = (value: string) => {
    const tags = value
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean)
    // Deduplicate tags
    return [...new Set(tags)]
  }

  const resetForm = () => {
    setFormData({
      name: '',
      time: 60,
      creditCost: 1,
      description: '',
      tags: '',
    })
    setSelectedSlotIds([])
    setSlotSearchTerm('')
    setManualSlotIds('')
    setShowManualSlotInput(false)
    setSlotPlan({
      startTime: '09:00',
      endTime: '17:00',
      capacityPerHour: 1,
    })
  }

  const openCreateDialog = () => {
    setEditingItem(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (item: TherapyCatalogItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      time: item.time,
      creditCost: item.creditCost,
      description: item.description,
      tags: item.tags.join(', '),
    })
    setSelectedSlotIds(item.slots)
    setSlotSearchTerm('')
    setManualSlotIds('')
    setShowManualSlotInput(false)
    setSlotPlan((current) => ({
      ...current,
      capacityPerHour: 1,
    }))
    setIsDialogOpen(true)
  }

  const handleGenerateSlots = async () => {
    const startInMinutes = timeToMinutes(slotPlan.startTime)
    const endInMinutes = timeToMinutes(slotPlan.endTime)

    if (startInMinutes === null || endInMinutes === null) {
      toast.error('Please choose valid start and end times')
      return
    }

    if (startInMinutes >= endInMinutes) {
      toast.error('End time must be after start time')
      return
    }

    if (startInMinutes % 60 !== 0 || endInMinutes % 60 !== 0) {
      toast.error('Hourly slot generation requires full-hour times (for example, 09:00 to 17:00)')
      return
    }

    if (!Number.isInteger(slotPlan.capacityPerHour) || slotPlan.capacityPerHour <= 0) {
      toast.error('Capacity per hour must be at least 1')
      return
    }

    const hourlyRanges: Array<{ startTime: string; endTime: string }> = []
    for (let cursor = startInMinutes; cursor + 60 <= endInMinutes; cursor += 60) {
      hourlyRanges.push({
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(cursor + 60),
      })
    }

    if (!hourlyRanges.length) {
      toast.error('No hourly slots can be generated from this time range')
      return
    }

    setIsGeneratingSlots(true)
    try {
      const requests = hourlyRanges.map((range) =>
        slotService.create({
          startTime: range.startTime,
          endTime: range.endTime,
          isDaily: true,
          capacity: slotPlan.capacityPerHour,
        })
      )

      const results = await Promise.allSettled(requests)
      const createdSlotIds: string[] = []
      let failedCount = 0

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const createdId = result.value?.slot?._id
          if (createdId) {
            createdSlotIds.push(createdId)
          }
        } else {
          failedCount += 1
        }
      }

      if (createdSlotIds.length > 0) {
        setSelectedSlotIds((current) => Array.from(new Set([...current, ...createdSlotIds])))
        await refetchSlots()
      }

      if (createdSlotIds.length > 0) {
        toast.success(
          `Created ${createdSlotIds.length} daily hourly slots with ${slotPlan.capacityPerHour} capacity each and attached them to this therapy`
        )
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} hourly slots could not be created. Check for duplicate or invalid times.`)
      }

      if (createdSlotIds.length === 0 && failedCount === 0) {
        toast.error('No slots were created')
      }
    } catch {
      toast.error('Failed to generate slots')
    } finally {
      setIsGeneratingSlots(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Description is required')
      return
    }

    if (!Number.isFinite(formData.time) || formData.time <= 0) {
      toast.error('Please enter a valid duration greater than 0')
      return
    }

    if (!Number.isFinite(formData.creditCost) || formData.creditCost <= 0) {
      toast.error('Please enter a valid credit cost greater than 0')
      return
    }

    const mergedSlotIds = Array.from(new Set([...selectedSlotIds, ...parseCsvInput(manualSlotIds)]))

    if (mergedSlotIds.length === 0) {
      toast.error('At least one booking slot is required. Use "Generate Slots" or select from the list.')
      return
    }

    const payload = {
      name: formData.name.trim(),
      time: formData.time,
      creditCost: formData.creditCost,
      description: formData.description.trim(),
      tags: parseCsvInput(formData.tags),
      slots: mergedSlotIds,
    }

    if (editingItem) {
      await updateTherapy.mutateAsync({ id: editingItem.id, payload })
    } else {
      await createTherapy.mutateAsync(payload)
    }

    setEditingItem(null)
    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    deleteTherapy.mutate(id)
  }

  const handleRefresh = () => {
    refetchTherapies()
  }

  // ── Group Class handlers ───────────────────────────────────────────
  const parseCsvTags = (value: string) =>
    [...new Set(value.split(',').map((t) => t.trim()).filter(Boolean))]

  const resetGcForm = () => {
    setGcForm(defaultGcForm)
    setGcSchedule(DEFAULT_SCHEDULE)
    setShowPreview(false)
    setSelectedSlotIds([])
    setSlotSearchTerm('')
    setManualSlotIds('')
    setShowManualSlotInput(false)
    setSlotPlan({ startTime: '09:00', endTime: '17:00', capacityPerHour: 1 })
    setGcErrors({})
  }

  const openCreateGcDialog = () => {
    setEditingGc(null)
    resetGcForm()
    setGcDialogOpen(true)
  }

  const openEditGcDialog = (gc: GroupClass) => {
    setGcErrors({})
    setEditingGc(gc)
    setGcForm({
      name: gc.name,
      description: gc.description,
      mode: gc.mode,
      sessionType: gc.sessionType || '',
      access: gc.access || 'members_only',
      bookingRequirement: gc.bookingRequirement || (gc.creditsRequired === 0 ? 'free' : 'credits_required'),
      instructor: gc.instructor,
      durationMinutes: gc.durationMinutes,
      creditsRequired: gc.creditsRequired,
      maxParticipants: gc.maxParticipants,
      tags: gc.tags.join(', '),
      scheduleInfo: gc.scheduleInfo,
      isActive: gc.isActive,
      locationAddress: gc.locationAddress ?? '',
      streamRoomId: gc.streamRoomId ?? '',
      enableWaitlist: gc.enableWaitlist ?? false,
      isPublished: gc.isPublished ?? gc.isActive ?? true,
      bookingWindowValue: (gc as any).bookingWindowValue ?? 72,
      bookingWindowUnit: (gc as any).bookingWindowUnit ?? 'hours',
      bookingCloseValue: (gc as any).bookingCloseValue ?? '',
      bookingCloseUnit: (gc as any).bookingCloseUnit ?? 'minutes',
    })
    const info = gc.scheduleInfo || ''
    if (info.startsWith('One-Time:')) {
      const timeMatch = info.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/)
      setGcSchedule({
        ...DEFAULT_SCHEDULE,
        mode: 'one-time',
        startTime: timeMatch?.[1] ?? '07:00',
        endTime: timeMatch?.[2] ?? '08:00',
        oneTimeDate: '',
      })
    } else {
      const timeMatch = info.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/)
      setGcSchedule({
        ...DEFAULT_SCHEDULE,
        startTime: timeMatch?.[1] ?? DEFAULT_SCHEDULE.startTime,
        endTime: timeMatch?.[2] ?? DEFAULT_SCHEDULE.endTime,
      })
    }
    setShowPreview(false)
    setSelectedSlotIds(gc.slots || [])
    setSlotSearchTerm('')
    setManualSlotIds('')
    setShowManualSlotInput(false)
    setSlotPlan({ startTime: '09:00', endTime: '17:00', capacityPerHour: 1 })
    setGcDialogOpen(true)
  }

  const executeSave = async (payload: any, gcSlotsToUpdate: Slot[]) => {
    if (editingGc) {
      if (gcSlotsToUpdate.length > 0) {
        await Promise.all(
          gcSlotsToUpdate.map((slot) => {
            const confirmedBookings = slot.capacity - slot.remainingCapacity
            const newRemaining = Math.max(0, payload.maxParticipants - confirmedBookings)
            return slotService.update(slot._id, {
              capacity: payload.maxParticipants,
              remainingCapacity: newRemaining,
            })
          })
        )
      }
      await updateGroupClass.mutateAsync({ id: editingGc.id, payload })
    } else {
      await createGroupClass.mutateAsync(payload)
    }

    setGcDialogOpen(false)
    setEditingGc(null)
    resetGcForm()
  }

  const handleSaveGc = async () => {
    const errors: Record<string, string> = {}
    if (!gcForm.name.trim()) {
      errors.name = 'Class name is required'
    }
    if (!gcForm.instructor.trim()) {
      errors.instructor = 'Instructor name is required'
    }
    if (!gcForm.description.trim()) {
      errors.description = 'Description is required'
    }
    if (gcForm.durationMinutes <= 0) {
      errors.durationMinutes = 'Duration must be greater than 0'
    }
    const isFree = gcForm.access === 'open_to_all' && gcForm.bookingRequirement === 'free'
    if (!isFree && gcForm.creditsRequired < 1) {
      errors.creditsRequired = 'Credits required must be at least 1 (positive integer)'
    }
    if (gcForm.maxParticipants <= 0) {
      errors.maxParticipants = 'Max participants must be greater than 0'
    }
    if ((gcForm.mode === 'offline' || gcForm.mode === 'hybrid') && !gcForm.locationAddress.trim()) {
      errors.locationAddress = 'Location address is required'
    }
    if ((gcForm.mode === 'online' || gcForm.mode === 'hybrid') && !gcForm.streamRoomId) {
      errors.streamRoomId = 'Session Layout Template is required'
    }
    if (gcForm.mode === 'online' && !gcForm.sessionType) {
      errors.sessionType = 'Session Type is required when Online mode is selected'
    }

    if (Object.keys(errors).length > 0) {
      setGcErrors(errors)
      toast.error('Please fix the validation errors before saving')
      return
    }

    if (gcSchedule.mode === 'one-time') {
      if (!gcSchedule.oneTimeDate) { toast.error('Please select a class date'); return }
      if (gcSchedule.oneTimeDate < todayStr()) { toast.error('Class date must be today or in the future'); return }
      
      const st = timeToMinutes(gcSchedule.startTime)
      const et = timeToMinutes(gcSchedule.endTime)
      if (st === null || et === null) { toast.error('Please enter valid start and end times'); return }
      if (st >= et) { toast.error('End time must be after start time'); return }

      if (gcSchedule.oneTimeDate === todayStr()) {
        const now = new Date()
        const currentMinutes = now.getHours() * 60 + now.getMinutes()
        if (st < currentMinutes) {
          toast.error('Start time cannot be in the past'); return
        }
      }
    } else {
      const st = timeToMinutes(gcSchedule.startTime)
      const et = timeToMinutes(gcSchedule.endTime)
      if (st === null || et === null) { toast.error('Please enter valid start and end times'); return }
      if (st >= et) { toast.error('End time must be after start time'); return }
      if (gcSchedule.frequency === 'weekly' && gcSchedule.daysOfWeek.length === 0) {
        toast.error('Please select at least one day of the week'); return
      }
      if (gcSchedule.limitMode === 'end-date') {
        if (!gcSchedule.endDate) { toast.error('Please set an end date for the recurring series'); return }
        if (gcSchedule.endDate < todayStr()) { toast.error('End date must be in the future'); return }
        if (gcSchedule.endDate > maxEndDate()) { toast.error('End date cannot exceed 3 months from today'); return }
      } else {
        if (!Number.isInteger(gcSchedule.occurrences) || gcSchedule.occurrences < 1) {
          toast.error('Number of occurrences must be at least 1'); return
        }
      }
    }

    const compiledScheduleInfo = compileScheduleInfo(gcSchedule)

    const conflicts = detectTrainerConflicts(gcForm.instructor, gcSchedule, groupClasses, editingGc?.id)
    if (conflicts.length > 0) {
      toast.error(`Trainer Scheduling Conflict! ${gcForm.instructor || 'This instructor'} is already teaching: ${conflicts.join(', ')} during these times.`)
      return
    }

    const recurrenceRule = gcSchedule.mode === 'recurring'
      ? (gcSchedule.frequency === 'daily' ? 'DAILY' : gcSchedule.frequency === 'weekly' ? 'WEEKLY' : 'MONTHLY')
      : 'NONE'

    const scheduleType = gcSchedule.mode === 'recurring'
      ? (gcSchedule.frequency === 'daily' ? 'Daily Recurring' : gcSchedule.frequency === 'weekly' ? 'Weekly Recurring' : 'Monthly Recurring')
      : 'Fixed Session'

    const daysStr = gcSchedule.frequency === 'weekly' && gcSchedule.daysOfWeek.length > 0
      ? gcSchedule.daysOfWeek.slice().sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(', ')
      : ''

    const schedulePattern = gcSchedule.mode === 'recurring'
      ? (gcSchedule.frequency === 'weekly' && daysStr ? `Weekly on ${daysStr}` : (gcSchedule.frequency === 'daily' ? 'Daily' : 'Monthly'))
      : undefined

    const payload = {
      name: gcForm.name.trim(),
      description: gcForm.description.trim(),
      mode: gcForm.mode,
      deliveryType: gcForm.mode,
      sessionType: gcForm.mode === 'online' ? gcForm.sessionType : '',
      access: gcForm.access,
      bookingRequirement: gcForm.access === 'open_to_all' ? gcForm.bookingRequirement : 'credits_required',
      instructor: gcForm.instructor.trim(),
      durationMinutes: gcForm.durationMinutes,
      creditsRequired: gcForm.access === 'open_to_all' && gcForm.bookingRequirement === 'free' ? 0 : gcForm.creditsRequired,
      maxParticipants: gcForm.maxParticipants,
      tags: parseCsvTags(gcForm.tags),
      scheduleInfo: compiledScheduleInfo,
      recurrenceRule,
      scheduleType,
      schedulePattern,
      daysOfWeek: gcSchedule.daysOfWeek,
      slots: [],
      isActive: gcForm.isActive,
      locationAddress: gcForm.locationAddress,
      streamRoomId: gcForm.streamRoomId,
      enableWaitlist: gcForm.enableWaitlist,
      bookingWindowValue: gcForm.bookingWindowValue,
      bookingWindowUnit: gcForm.bookingWindowUnit,
      bookingCloseValue: gcForm.bookingCloseValue === '' ? null : Number(gcForm.bookingCloseValue),
      bookingCloseUnit: gcForm.bookingCloseValue === '' ? null : gcForm.bookingCloseUnit,
      isPublished: gcForm.isPublished,
    }

    try {
      await executeSave(payload, [])
    } catch {
      // Mutation's onError already raised the toast with the real reason;
      // keep the dialog open so the admin can correct and resubmit.
      return
    }
  }

  const handleDeleteGc = (id: string) => deleteGroupClass.mutate(id)

  const filteredGroupClasses = useMemo(() => {
    let list = groupClasses
    if (gcPublishFilter === 'retired') {
      list = list.filter((gc) => gc.isRetired)
    } else if (gcPublishFilter === 'completed') {
      list = list.filter((gc) => !gc.isRetired && completedClassIds.has(gc.id))
    } else {
      list = list.filter((gc) => !gc.isRetired && !completedClassIds.has(gc.id))
      if (gcPublishFilter === 'published') {
        list = list.filter((gc) => gc.isPublished)
      } else if (gcPublishFilter === 'unpublished') {
        list = list.filter((gc) => !gc.isPublished)
      }
    }
    const q = gcSearchTerm.toLowerCase()
    if (!q) return list
    return list.filter(
      (gc) =>
        gc.name.toLowerCase().includes(q) ||
        gc.instructor.toLowerCase().includes(q) ||
        gc.description.toLowerCase().includes(q) ||
        gc.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [groupClasses, gcSearchTerm, gcPublishFilter, completedClassIds])

  const gcModeLabel: Record<GroupClassMode, string> = { online: 'Online', offline: 'In-Person', hybrid: 'Hybrid' }
  const gcModeIcon: Record<GroupClassMode, React.ReactElement> = {
    online: <IconVideo className="h-3.5 w-3.5" />,
    offline: <IconMapPin className="h-3.5 w-3.5" />,
    hybrid: <IconWorld className="h-3.5 w-3.5" />,
  }
  const gcModeBadgeClass: Record<GroupClassMode, string> = {
    online: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    offline: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    hybrid: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  }

  const isGcPending = createGroupClass.isPending || updateGroupClass.isPending || deleteGroupClass.isPending

  const isPending = createTherapy.isPending || updateTherapy.isPending || deleteTherapy.isPending

  const slotOptions = useMemo(() => {
    return [...slots].sort((a, b) => {
      const aIsDaily = a.isDaily || !a.date
      const bIsDaily = b.isDaily || !b.date

      if (aIsDaily !== bIsDaily) {
        return aIsDaily ? -1 : 1
      }

      if (!aIsDaily && !bIsDaily) {
        const aTime = new Date(a.date || '').getTime()
        const bTime = new Date(b.date || '').getTime()
        const dateDelta = aTime - bTime
        if (Number.isFinite(dateDelta) && dateDelta !== 0) {
          return dateDelta
        }
      }

      const startDelta = a.startTime.localeCompare(b.startTime)
      if (startDelta !== 0) return startDelta
      return a.endTime.localeCompare(b.endTime)
    })
  }, [slots])

  const filteredSlotOptions = useMemo(() => {
    let filtered = slotOptions.filter((slot) => {
      if (!slot.isDaily && slot.date && slot.date < todayStr()) {
        return false
      }
      return true
    })

    const genStart = timeToMinutes(slotPlan.startTime)
    const genEnd = timeToMinutes(slotPlan.endTime)
    if (genStart !== null && genEnd !== null) {
      filtered = filtered.filter((slot) => {
        const slotStart = timeToMinutes(slot.startTime)
        const slotEnd = timeToMinutes(slot.endTime)
        if (slotStart !== null && slotEnd !== null) {
          return slotStart >= genStart && slotEnd <= genEnd
        }
        return true
      })
    }

    const query = slotSearchTerm.trim().toLowerCase()
    if (!query) return filtered

    return filtered.filter((slot) => {
      const slotDate = formatSlotDate(slot.date, slot.isDaily).toLowerCase()
      return (
        slot.startTime.toLowerCase().includes(query) ||
        slot.endTime.toLowerCase().includes(query) ||
        slotDate.includes(query) ||
        slot._id.toLowerCase().includes(query)
      )
    })
  }, [slotOptions, slotSearchTerm, slotPlan.startTime, slotPlan.endTime])

  const knownSlotIds = useMemo(() => new Set(slotOptions.map((slot) => slot._id)), [slotOptions])

  const missingSelectedSlotCount = useMemo(
    () => selectedSlotIds.filter((slotId) => !knownSlotIds.has(slotId)).length,
    [selectedSlotIds, knownSlotIds]
  )

  const toggleSlotSelection = (slotId: string) => {
    setSelectedSlotIds((current) =>
      current.includes(slotId)
        ? current.filter((id) => id !== slotId)
        : [...current, slotId]
    )
  }

  const averageDuration = useMemo(() => {
    if (!items.length) return 0
    const total = items.reduce((sum, item) => sum + item.time, 0)
    return Math.round(total / items.length)
  }, [items])

  const totalSlotsReferenced = useMemo(
    () => items.reduce((sum, item) => sum + item.slots.length, 0),
    [items]
  )

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Services</h2>
        <p className="text-sm text-muted-foreground">
          Manage therapies catalog and group classes scheduling
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="therapies" className="text-sm px-4 py-2">Therapies</TabsTrigger>
          <TabsTrigger value="group-classes" className="text-sm px-4 py-2">Group Classes</TabsTrigger>
          <TabsTrigger value="group-class-bookings" className="text-sm px-4 py-2">Bookings</TabsTrigger>
          <TabsTrigger value="live-sessions" className="text-sm px-4 py-2">Live Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="therapies" className="mt-6 space-y-6">
          {/* Static Hero Banner: Therapies */}
          <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-500 text-white">
            <div className="p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/25">
                    <IconDroplet className="h-6 w-6" />
                  </div>
                  <h2 className="text-4xl font-bold tracking-tight">Therapies</h2>
                  <p className="max-w-2xl text-sm text-cyan-50/95">
                    Curate the therapy catalog, tune durations, and keep booking slots synchronized in one place.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                  <div>
                    <p className="text-xs text-cyan-50/90">Catalog</p>
                    <p className="text-xl font-semibold">{items.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-cyan-50/90">Avg Time</p>
                    <p className="text-xl font-semibold">{averageDuration}m</p>
                  </div>
                  <div>
                    <p className="text-xs text-cyan-50/90">Slot Links</p>
                    <p className="text-xl font-semibold">{totalSlotsReferenced}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Therapy Catalog</h3>
          <p className="text-muted-foreground">Search, edit, and publish therapies available for bookings.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <IconRefresh className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <IconPlus className="mr-2 h-4 w-4" />
                Add Therapy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Therapy' : 'Create Therapy'}</DialogTitle>
                <DialogDescription>Set up the details that members and staff will see during booking.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="NAD+ IV Drip"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Time (minutes)</label>
                  <Input
                    type="number"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: Number.parseInt(e.target.value, 10) || 0 })}
                    placeholder="120"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Credit Cost</label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.creditCost}
                    onChange={(e) =>
                      setFormData({ ...formData, creditCost: Number.parseInt(e.target.value, 10) || 0 })
                    }
                    placeholder="2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description <span className="text-red-500">*</span></label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe why this therapy helps and when it should be recommended."
                    className="min-h-24 resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tags (comma separated)</label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="iv, energy boost, anti-aging"
                  />
                </div>
                <div className="space-y-3 rounded-lg border border-dashed p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Generate Hourly Slots For This Therapy</label>
                    <Badge variant="outline" className="rounded-full">Hourly</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Daily recurring slots are created for each hour in this range.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Capacity Per Hour</label>
                      <Input
                        type="number"
                        min={1}
                        value={slotPlan.capacityPerHour}
                        onChange={(e) =>
                          setSlotPlan({
                            ...slotPlan,
                            capacityPerHour: Number.parseInt(e.target.value, 10) || 1,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Start Hour</label>
                      <Input
                        type="time"
                        step={3600}
                        value={slotPlan.startTime}
                        onChange={(e) => setSlotPlan({ ...slotPlan, startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">End Hour</label>
                      <Input
                        type="time"
                        step={3600}
                        value={slotPlan.endTime}
                        onChange={(e) => setSlotPlan({ ...slotPlan, endTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateSlots}
                    disabled={isGeneratingSlots}
                  >
                    {isGeneratingSlots ? 'Generating Slots...' : 'Generate Slots For This Therapy'}
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Booking Windows For This Therapy
                      {!editingItem && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    <Badge variant={selectedSlotIds.length === 0 ? 'destructive' : 'secondary'} className="rounded-full">
                      {selectedSlotIds.length} linked
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Select which time windows this therapy can be booked in. At least one slot is required.
                    Only linked windows appear during booking.
                  </p>

                  <Input
                    value={slotSearchTerm}
                    onChange={(e) => setSlotSearchTerm(e.target.value)}
                    placeholder="Filter slots by schedule, time, or ID"
                  />

                  <div className="rounded-md border">
                    <ScrollArea className="h-44">
                      <div className="space-y-2 p-2">
                        {isLoadingSlots ? (
                          [...Array(4)].map((_, index) => (
                            <Skeleton key={index} className="h-14 w-full" />
                          ))
                        ) : isSlotsError ? (
                          <p className="p-2 text-sm text-red-500">
                            Failed to load slots. You can still add IDs manually.
                          </p>
                        ) : filteredSlotOptions.length === 0 ? (
                          <p className="p-2 text-sm text-muted-foreground">No slots match this filter.</p>
                        ) : (
                          filteredSlotOptions.map((slot: Slot) => (
                            <label
                              key={slot._id}
                              className="flex cursor-pointer items-start gap-3 rounded-md border p-2 hover:bg-muted/40"
                            >
                              <Checkbox
                                checked={selectedSlotIds.includes(slot._id)}
                                onCheckedChange={() => toggleSlotSelection(slot._id)}
                                className="mt-0.5"
                              />
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {formatSlotDate(slot.date, slot.isDaily)} - {slot.startTime} to {slot.endTime}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Badge variant={slot.remainingCapacity <= 0 ? 'destructive' : 'secondary'}>
                                    {slot.remainingCapacity <= 0 ? 'Full' : `Open ${slot.remainingCapacity}/${slot.capacity}`}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">ID ...{slot._id.slice(-8)}</span>
                                </div>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Use Generate Slots above for new windows, or link existing windows from this list.
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowManualSlotInput((current) => !current)}
                    >
                      {showManualSlotInput ? 'Hide Advanced IDs' : 'Advanced: Manual IDs'}
                    </Button>
                  </div>

                  {showManualSlotInput && (
                    <Input
                      value={manualSlotIds}
                      onChange={(e) => setManualSlotIds(e.target.value)}
                      placeholder="Advanced only: paste slot IDs separated by commas"
                    />
                  )}

                  {missingSelectedSlotCount > 0 && (
                    <p className="text-xs text-amber-600">
                      {missingSelectedSlotCount} previously selected slot IDs are not in the current slot list and will still be saved.
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setEditingItem(null)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Therapy'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search therapies, tags, or descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconSparkles className="h-4 w-4 text-teal-600" />
            Active Therapies
          </CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `${filteredItems.length} therapies found`}</CardDescription>
        </CardHeader>
        <CardContent>
          {isError && (
            <div className="py-8 text-center text-red-500">
              Failed to load therapies. Please check API connectivity.
            </div>
          )}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.length === 0 ? (
                <Card className="sm:col-span-2 xl:col-span-3">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No therapies found for your current search.
                  </CardContent>
                </Card>
              ) : (
                filteredItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden rounded-2xl border border-slate-200/80">
                    <div className="bg-gradient-to-r from-teal-500/15 to-cyan-500/10 p-4">
                      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-700">
                        <IconDroplet className="h-4 w-4" />
                      </div>
                      <h4 className="text-base font-semibold tracking-tight">{item.name}</h4>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <IconClock className="h-3.5 w-3.5" /> {item.time} mins
                        </span>
                        <span>{item.creditCost} credit{item.creditCost > 1 ? 's' : ''}</span>
                        <span>{item.slots.length} slot links</span>
                      </div>
                    </div>

                    <CardContent className="space-y-4 p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.length ? (
                          [...new Set(item.tags)].map((tag) => (
                            <Badge key={tag} variant="secondary" className="rounded-full">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="rounded-full text-muted-foreground">
                            No tags
                          </Badge>
                        )}
                      </div>

                      <p className="min-h-12 text-sm text-muted-foreground">
                        {item.description || 'No description added yet.'}
                      </p>

                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                          <IconEdit className="mr-1 h-4 w-4" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(item.id)}
                          disabled={isPending}
                        >
                          <IconTrash className="mr-1 h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="group-classes" className="mt-6 space-y-6">
          {/* Static Hero Banner: Group Classes */}
          <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-500 text-white">
            <div className="p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/25">
                    <IconUsers className="h-6 w-6" />
                  </div>
                  <h2 className="text-4xl font-bold tracking-tight">Group Classes</h2>
                  <p className="max-w-2xl text-sm text-purple-50/95">
                    Schedule and manage group sessions — online, in-person, or hybrid — with credit-based access.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                  <div>
                    <p className="text-xs text-purple-50/90">Classes</p>
                    <p className="text-xl font-semibold">{groupClasses.filter(gc => !gc.isRetired).length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-50/90">Active</p>
                    <p className="text-xl font-semibold">{groupClasses.filter(gc => !gc.isRetired && gc.isActive).length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-50/90">Modes</p>
                    <p className="text-xl font-semibold">{new Set(groupClasses.filter(gc => !gc.isRetired).map(gc => gc.mode)).size}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

      {/* ═══════════════ GROUP CLASSES WIDGET ═══════════════ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Group Classes</h3>
          <p className="text-muted-foreground">Manage scheduled group sessions — online, in-person, or hybrid.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchGc()}>
            <IconRefresh className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={gcDialogOpen} onOpenChange={handleGcDialogOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={openCreateGcDialog}>
                <IconPlus className="mr-2 h-4 w-4" />
                Add Group Class
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]"
              onPointerDownOutside={(e) => {
                if (isFormDirty()) {
                  e.preventDefault()
                  setDiscardConfirmOpen(true)
                }
              }}
              onInteractOutside={(e) => {
                if (isFormDirty()) {
                  e.preventDefault()
                  setDiscardConfirmOpen(true)
                }
              }}
              onEscapeKeyDown={(e) => {
                if (isFormDirty()) {
                  e.preventDefault()
                  setDiscardConfirmOpen(true)
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>{editingGc ? 'Edit Group Class' : 'Create Group Class'}</DialogTitle>
                <DialogDescription>
                  Configure session details, delivery mode, capacity, and credit cost.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-sm font-medium">
                    Class Name <span className="text-red-500">*</span>
                    {renderModifiedBadge('name')}
                  </label>
                  <Input
                    value={gcForm.name}
                    onChange={(e) => {
                      setGcForm({ ...gcForm, name: e.target.value })
                      if (gcErrors.name) setGcErrors({ ...gcErrors, name: '' })
                    }}
                    placeholder="Morning Yoga Flow"
                    className={cn(
                      gcErrors.name && "border-rose-500 focus-visible:ring-rose-500",
                      isFieldChanged('name') && !gcErrors.name && "border-amber-500 ring-amber-500/20 focus-visible:ring-amber-500"
                    )}
                    disabled={isGcPending}
                  />
                  {gcErrors.name && (
                    <p className="text-xs text-rose-500 mt-1">{gcErrors.name}</p>
                  )}
                </div>

                {/* Instructor */}
                <div>
                  <label className="text-sm font-medium">
                    Instructor <span className="text-red-500">*</span>
                    {renderModifiedBadge('instructor')}
                  </label>
                  <Input
                    value={gcForm.instructor}
                    onChange={(e) => {
                      setGcForm({ ...gcForm, instructor: e.target.value })
                      if (gcErrors.instructor) setGcErrors({ ...gcErrors, instructor: '' })
                    }}
                    placeholder="e.g. Coach Arjun"
                    className={cn(
                      gcErrors.instructor && "border-rose-500 focus-visible:ring-rose-500",
                      isFieldChanged('instructor') && !gcErrors.instructor && "border-amber-500 ring-amber-500/20 focus-visible:ring-amber-500"
                    )}
                    disabled={isGcPending}
                  />
                  {gcErrors.instructor && (
                    <p className="text-xs text-rose-500 mt-1">{gcErrors.instructor}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium">
                    Description <span className="text-red-500">*</span>
                    {renderModifiedBadge('description')}
                  </label>
                  <Textarea
                    value={gcForm.description}
                    onChange={(e) => {
                      setGcForm({ ...gcForm, description: e.target.value })
                      if (gcErrors.description) setGcErrors({ ...gcErrors, description: '' })
                    }}
                    placeholder="Describe what participants will experience in this class."
                    className={cn(
                      "min-h-20 resize-none",
                      gcErrors.description && "border-rose-500 focus-visible:ring-rose-500",
                      isFieldChanged('description') && !gcErrors.description && "border-amber-500 ring-amber-500/20 focus-visible:ring-amber-500"
                    )}
                    disabled={isGcPending}
                  />
                  {gcErrors.description && (
                    <p className="text-xs text-rose-500 mt-1">{gcErrors.description}</p>
                  )}
                </div>

                {/* Mode */}
                <div>
                  <label className="text-sm font-medium">
                    Delivery Mode
                    {renderModifiedBadge('mode')}
                  </label>
                  <Select
                    value={gcForm.mode}
                    onValueChange={(val) => setGcForm({ ...gcForm, mode: val as GroupClassMode })}
                    disabled={isGcPending}
                  >
                    <SelectTrigger className={cn(
                      "w-full",
                      isFieldChanged('mode') && "border-amber-500 ring-amber-500/20 focus-visible:ring-amber-500"
                    )}>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offline"><span className="flex items-center gap-2"><IconMapPin className="h-4 w-4 text-amber-600" /> In-Person</span></SelectItem>
                      <SelectItem value="online"><span className="flex items-center gap-2"><IconVideo className="h-4 w-4 text-blue-600" /> Online</span></SelectItem>
                      <SelectItem value="hybrid"><span className="flex items-center gap-2"><IconWorld className="h-4 w-4 text-purple-600" /> Hybrid</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Session Type */}
                {gcForm.mode === 'online' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-sm font-medium">
                      Session Type <span className="text-red-500">*</span>
                      {renderModifiedBadge('sessionType')}
                    </label>
                    <div className="flex items-center gap-6 mt-1.5 p-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sessionType"
                          className="accent-primary w-3.5 h-3.5 cursor-pointer"
                          checked={gcForm.sessionType === 'group_class'}
                          onChange={() => {
                            setGcForm({ ...gcForm, sessionType: 'group_class' })
                            if (gcErrors.sessionType) setGcErrors({ ...gcErrors, sessionType: '' })
                          }}
                          disabled={isGcPending}
                        />
                        <span className="text-sm font-medium text-foreground">Group Class</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sessionType"
                          className="accent-primary w-3.5 h-3.5 cursor-pointer"
                          checked={gcForm.sessionType === 'live_stream'}
                          onChange={() => {
                            setGcForm({ ...gcForm, sessionType: 'live_stream' })
                            if (gcErrors.sessionType) setGcErrors({ ...gcErrors, sessionType: '' })
                          }}
                          disabled={isGcPending}
                        />
                        <span className="text-sm font-medium text-foreground">Live Stream</span>
                      </label>
                    </div>
                    {gcErrors.sessionType && (
                      <p className="text-xs text-rose-500 mt-1">{gcErrors.sessionType}</p>
                    )}
                  </div>
                )}

                {/* Access Control */}
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-sm font-medium">
                    Access
                    {renderModifiedBadge('access')}
                  </label>
                  <div className="flex items-center gap-6 mt-1.5 p-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="access"
                        className="accent-primary w-3.5 h-3.5 cursor-pointer"
                        checked={gcForm.access === 'members_only'}
                        onChange={() => {
                          setGcForm({ ...gcForm, access: 'members_only', bookingRequirement: 'credits_required', creditsRequired: gcForm.creditsRequired || 1 })
                        }}
                        disabled={isGcPending}
                      />
                      <span className="text-sm font-medium text-foreground">Members Only</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="access"
                        className="accent-primary w-3.5 h-3.5 cursor-pointer"
                        checked={gcForm.access === 'open_to_all'}
                        onChange={() => {
                          setGcForm({ ...gcForm, access: 'open_to_all' })
                        }}
                        disabled={isGcPending}
                      />
                      <span className="text-sm font-medium text-foreground">Open to Everyone</span>
                    </label>
                  </div>
                </div>

                {/* Booking Requirement (Conditionally shown when Open to Everyone) */}
                {gcForm.access === 'open_to_all' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-sm font-medium">
                      Booking Requirement
                      {renderModifiedBadge('bookingRequirement')}
                    </label>
                    <div className="flex items-center gap-6 mt-1.5 p-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="bookingRequirement"
                          className="accent-primary w-3.5 h-3.5 cursor-pointer"
                          checked={gcForm.bookingRequirement === 'free'}
                          onChange={() => {
                            setGcForm({ ...gcForm, bookingRequirement: 'free', creditsRequired: 0 })
                            if (gcErrors.creditsRequired) setGcErrors({ ...gcErrors, creditsRequired: '' })
                          }}
                          disabled={isGcPending}
                        />
                        <span className="text-sm font-medium text-foreground">Free</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="bookingRequirement"
                          className="accent-primary w-3.5 h-3.5 cursor-pointer"
                          checked={gcForm.bookingRequirement === 'credits_required'}
                          onChange={() => {
                            setGcForm({ ...gcForm, bookingRequirement: 'credits_required', creditsRequired: gcForm.creditsRequired || 1 })
                          }}
                          disabled={isGcPending}
                        />
                        <span className="text-sm font-medium text-foreground">Credits Required</span>
                      </label>
                    </div>
                  </div>
                )}
                {(gcForm.mode === 'offline' || gcForm.mode === 'hybrid') && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-sm font-medium">
                      Location Address <span className="text-red-500">*</span>
                      {renderModifiedBadge('locationAddress')}
                    </label>
                    <Input
                      value={gcForm.locationAddress}
                      onChange={(e) => {
                        setGcForm({ ...gcForm, locationAddress: e.target.value })
                        if (gcErrors.locationAddress) setGcErrors({ ...gcErrors, locationAddress: '' })
                      }}
                      placeholder="e.g. Studio A, 3rd Floor, Fitflix Gym"
                      className={cn(
                        gcErrors.locationAddress && "border-rose-500 focus-visible:ring-rose-500",
                        isFieldChanged('locationAddress') && !gcErrors.locationAddress && "border-amber-500 ring-amber-500/20 focus-visible:ring-amber-500"
                      )}
                      disabled={isGcPending}
                    />
                    {gcErrors.locationAddress && (
                      <p className="text-xs text-rose-500 mt-1">{gcErrors.locationAddress}</p>
                    )}
                  </div>
                )}

                {(gcForm.mode === 'online' || gcForm.mode === 'hybrid') && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-1.5">
                      <label className="text-sm font-medium">
                        Session Layout Template <span className="text-red-500">*</span>
                      </label>
                      <span
                        className="cursor-help text-xs text-muted-foreground underline decoration-dotted"
                        title="The actual conference room is generated automatically per session."
                      >
                        (Auto-room generated)
                      </span>
                      {renderModifiedBadge('streamRoomId')}
                    </div>
                    <Select
                      value={gcForm.streamRoomId}
                      onValueChange={(val) => {
                        setGcForm({ ...gcForm, streamRoomId: val })
                        if (gcErrors.streamRoomId) setGcErrors({ ...gcErrors, streamRoomId: '' })
                      }}
                      disabled={isGcPending}
                    >
                      <SelectTrigger className={cn(
                        "w-full",
                        gcErrors.streamRoomId && "border-rose-500 focus-visible:ring-rose-500",
                        isFieldChanged('streamRoomId') && !gcErrors.streamRoomId && "border-amber-500 ring-amber-500/20 focus-visible:ring-amber-500"
                      )}>
                        <SelectValue placeholder="Select session layout template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interactive_class">Interactive Video Class (1-on-many)</SelectItem>
                        <SelectItem value="large_event">Large Event Webcast (100+ members)</SelectItem>
                        <SelectItem value="standard_meeting">Standard Video Meeting (Group)</SelectItem>
                      </SelectContent>
                    </Select>
                    {gcErrors.streamRoomId && (
                      <p className="text-xs text-rose-500 mt-1">{gcErrors.streamRoomId}</p>
                    )}
                  </div>
                )}

                {/* Duration + Credits + Max Participants */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium">
                      Duration (mins)
                      {renderModifiedBadge('durationMinutes')}
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={gcForm.durationMinutes}
                      onChange={(e) => {
                        const val = Number.parseInt(e.target.value, 10) || 0
                        setGcForm({ ...gcForm, durationMinutes: val })
                        setGcSchedule((prev) => ({
                          ...prev,
                          endTime: calculateEndTime(prev.startTime, val),
                        }))
                        if (gcErrors.durationMinutes) setGcErrors({ ...gcErrors, durationMinutes: '' })
                      }}
                      placeholder="60"
                      className={cn(
                        gcErrors.durationMinutes && "border-rose-500 focus-visible:ring-rose-500",
                        isFieldChanged('durationMinutes') && !gcErrors.durationMinutes && "border-amber-500 ring-amber-500/20 focus-visible:ring-amber-500"
                      )}
                      disabled={isGcPending}
                    />
                    {gcErrors.durationMinutes && (
                      <p className="text-xs text-rose-500 mt-1">{gcErrors.durationMinutes}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Credits Required
                      {renderModifiedBadge('creditsRequired')}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={gcForm.creditsRequired}
                      onChange={(e) => {
                        setGcForm({ ...gcForm, creditsRequired: Number.parseInt(e.target.value, 10) || 0 })
                        if (gcErrors.creditsRequired) setGcErrors({ ...gcErrors, creditsRequired: '' })
                      }}
                      placeholder="1"
                      disabled={isGcPending || (gcForm.access === 'open_to_all' && gcForm.bookingRequirement === 'free')}
                      className={cn(
                        gcErrors.creditsRequired && "border-rose-500 focus-visible:ring-rose-500",
                        isFieldChanged('creditsRequired') && !gcErrors.creditsRequired && "border-amber-500 ring-amber-500/20 focus-visible:ring-amber-500",
                        gcForm.access === 'open_to_all' && gcForm.bookingRequirement === 'free' && "bg-muted text-muted-foreground"
                      )}
                    />
                    {gcForm.access === 'open_to_all' && gcForm.bookingRequirement === 'free' && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                        Free access — 0 credits debited
                      </p>
                    )}
                    {gcErrors.creditsRequired && (
                      <p className="text-xs text-rose-500 mt-1">{gcErrors.creditsRequired}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Max Capacity (Seats)
                      {renderModifiedBadge('maxParticipants')}
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={gcForm.maxParticipants}
                      onChange={(e) => {
                        const val = Number.parseInt(e.target.value, 10) || 0
                        setGcForm({ ...gcForm, maxParticipants: val })
                        setSlotPlan((prev) => ({ ...prev, capacityPerHour: val }))
                        if (gcErrors.maxParticipants) setGcErrors({ ...gcErrors, maxParticipants: '' })
                      }}
                      placeholder="20"
                      className={cn(
                        gcErrors.maxParticipants && "border-rose-500 focus-visible:ring-rose-500",
                        isFieldChanged('maxParticipants') && !gcErrors.maxParticipants && "border-amber-500 ring-amber-500/20 focus-visible:ring-amber-500"
                      )}
                      disabled={isGcPending}
                    />
                    {gcErrors.maxParticipants && (
                      <p className="text-xs text-rose-500 mt-1">{gcErrors.maxParticipants}</p>
                    )}
                  </div>
                </div>

                {/* Booking Window Configuration */}
                <div className="grid grid-cols-2 gap-4 border rounded-lg p-3 bg-muted/20">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold block">
                      Booking Opens
                      {renderModifiedBadge('bookingWindowValue')}
                    </label>
                    <div className="flex gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        className={cn(
                          "h-8 text-xs w-20",
                          isFieldChanged('bookingWindowValue') && "border-amber-500 ring-amber-500/20 focus-visible:ring-amber-500"
                        )}
                        value={gcForm.bookingWindowValue}
                        onChange={(e) => setGcForm({ ...gcForm, bookingWindowValue: parseInt(e.target.value) || 0 })}
                        disabled={isGcPending}
                      />
                      <select
                        className="h-8 text-xs border rounded bg-transparent px-2 dark:bg-zinc-950"
                        value={gcForm.bookingWindowUnit}
                        onChange={(e) => setGcForm({ ...gcForm, bookingWindowUnit: e.target.value as any })}
                        disabled={isGcPending}
                      >
                        <option value="hours">Hours prior</option>
                        <option value="days">Days prior</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Default is 72 hours</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold block">
                      Booking Closes
                      {renderModifiedBadge('bookingCloseValue')}
                    </label>
                    <div className="flex gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        className={cn(
                          "h-8 text-xs w-20",
                          isFieldChanged('bookingCloseValue') && "border-amber-500 ring-amber-500/20 focus-visible:ring-amber-500"
                        )}
                        value={gcForm.bookingCloseValue}
                        onChange={(e) => setGcForm({ ...gcForm, bookingCloseValue: e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0) })}
                        disabled={isGcPending}
                      />
                      <select
                        className="h-8 text-xs border rounded bg-transparent px-2 dark:bg-zinc-950"
                        value={gcForm.bookingCloseUnit}
                        onChange={(e) => setGcForm({ ...gcForm, bookingCloseUnit: e.target.value as any })}
                        disabled={isGcPending}
                      >
                        <option value="minutes">Minutes prior</option>
                        <option value="hours">Hours prior</option>
                        <option value="days">Days prior</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Default is 15 minutes (Set to 0 to keep open until start time)</p>
                  </div>
                </div>

                {/* Waitlist Toggle */}
                <div className="flex items-center space-x-2.5 rounded-lg border p-3 bg-muted/20">
                  <Checkbox
                    id="enableWaitlist"
                    checked={gcForm.enableWaitlist}
                    onCheckedChange={(checked) => setGcForm({ ...gcForm, enableWaitlist: !!checked })}
                    disabled={isGcPending}
                  />
                  <div className="grid gap-1 leading-none">
                    <label
                      htmlFor="enableWaitlist"
                      className="text-xs font-semibold leading-none cursor-pointer"
                    >
                      Enable Waitlist Features
                      {renderModifiedBadge('enableWaitlist')}
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Allow members to queue for waitlist if class capacity is reached.
                    </p>
                  </div>
                </div>

                {/* Publish Status Toggle */}
                <div className="flex items-center space-x-2.5 rounded-lg border p-3 bg-muted/20">
                  <Checkbox
                    id="isPublished"
                    checked={gcForm.isPublished}
                    onCheckedChange={(checked) => setGcForm({ ...gcForm, isPublished: !!checked })}
                    disabled={isGcPending}
                  />
                  <div className="grid gap-1 leading-none">
                    <label
                      htmlFor="isPublished"
                      className="text-xs font-semibold leading-none cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Publish Immediately to Members</span>
                      {gcForm.isPublished ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[10px] py-0 px-1.5 font-bold">Published</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-amber-600 border-amber-300">Unpublished</Badge>
                      )}
                      {renderModifiedBadge('isPublished')}
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Controls whether this class is visible and bookable for members in the app.
                    </p>
                  </div>
                </div>

                {/* Schedule Info */}
                <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
                  <div className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Schedule / Timing Info (Auto-Compiled)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Pattern</span>
                      <span className="font-medium text-foreground">
                        {gcSchedule.mode === 'one-time'
                          ? `One-Time Class (${gcSchedule.oneTimeDate ? formatDate(gcSchedule.oneTimeDate) : 'Select Date'})`
                          : `${gcSchedule.frequency.charAt(0).toUpperCase() + gcSchedule.frequency.slice(1)}${
                              gcSchedule.frequency === 'weekly' && gcSchedule.daysOfWeek.length > 0
                                ? ` on ${gcSchedule.daysOfWeek.map((d) => DAY_LABELS[d].slice(0, 3)).join(', ')}`
                                : ''
                            }`}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Time Range</span>
                      <span className="font-medium text-foreground">
                        {use12HourFormat
                          ? `${formatTimeTo12Hour(gcSchedule.startTime)} - ${formatTimeTo12Hour(gcSchedule.endTime)}`
                          : `${gcSchedule.startTime} - ${gcSchedule.endTime}`}
                      </span>
                    </div>
                    {gcSchedule.mode === 'recurring' && (
                      <div className="col-span-2 border-t pt-1.5 mt-0.5">
                        <span className="text-muted-foreground block text-[10px]">Limit / Duration</span>
                        <span className="font-medium text-foreground">
                          {gcSchedule.limitMode === 'occurrences'
                            ? `${gcSchedule.occurrences} classes total`
                            : `Until ${gcSchedule.endDate ? formatDate(gcSchedule.endDate) : 'future date'}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ═══════════════ SCHEDULING CONFIGURATION ═══════════════ */}
                <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-2 border-b border-border/40 pb-3">
                    <IconCalendarEvent className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Schedule Configuration</h4>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Schedule Mode</label>
                    <div className="flex bg-muted/60 p-1 rounded-md max-w-fit">
                      <button
                        type="button"
                        onClick={() => { setGcSchedule({ ...gcSchedule, mode: 'one-time' }); setShowPreview(true) }}
                        className={`text-xs px-3 py-1.5 rounded-sm transition-colors ${gcSchedule.mode === 'one-time' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        One-Time Class
                      </button>
                      <button
                        type="button"
                        onClick={() => { setGcSchedule({ ...gcSchedule, mode: 'recurring' }); setShowPreview(true) }}
                        className={`text-xs px-3 py-1.5 rounded-sm transition-colors ${gcSchedule.mode === 'recurring' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Recurring Series
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {gcSchedule.mode === 'one-time' ? (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Class Date</label>
                        <Input
                          type="date"
                          value={gcSchedule.oneTimeDate}
                          min={todayStr()}
                          onChange={(e) => { setGcSchedule({ ...gcSchedule, oneTimeDate: e.target.value }); setShowPreview(true) }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Recurrence</label>
                        <Select
                          value={gcSchedule.frequency}
                          onValueChange={(val: RecurrenceFrequency) => { setGcSchedule({ ...gcSchedule, frequency: val }); setShowPreview(true) }}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex gap-2 items-end">
                      <div className="w-full">
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Time</label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="time"
                            value={gcSchedule.startTime}
                            onChange={(e) => {
                              const newStart = e.target.value
                              setGcSchedule((prev) => ({
                                ...prev,
                                startTime: newStart,
                                endTime: calculateEndTime(newStart, gcForm.durationMinutes),
                              }))
                            }}
                            className="bg-background px-2"
                          />
                          <span className="text-muted-foreground text-xs">-</span>
                          <Input
                            type="time"
                            value={gcSchedule.endTime}
                            readOnly
                            disabled
                            className="bg-muted text-muted-foreground px-2 cursor-not-allowed opacity-90"
                            title="Auto-calculated from Start Time + Duration"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {gcSchedule.mode === 'recurring' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      {gcSchedule.frequency === 'weekly' && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">Days of the Week</label>
                          <div className="flex flex-wrap gap-2">
                            {DAY_LABELS.map((label, idx) => {
                              const isSelected = gcSchedule.daysOfWeek.includes(idx)
                              return (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => {
                                    const curr = new Set(gcSchedule.daysOfWeek)
                                    if (curr.has(idx)) curr.delete(idx)
                                    else curr.add(idx)
                                    setGcSchedule({ ...gcSchedule, daysOfWeek: Array.from(curr).sort((a, b) => a - b) })
                                    setShowPreview(true)
                                  }}
                                  className={`h-8 w-10 text-xs rounded-md border transition-all ${isSelected ? 'bg-primary border-primary text-primary-foreground font-medium shadow-sm' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                >
                                  {label.charAt(0)}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {gcSchedule.frequency === 'monthly' && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">Day of the Month</label>
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            placeholder="e.g. 15"
                            className="w-24 bg-background"
                            value={gcSchedule.daysOfWeek[0] || ''}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10)
                              if (!isNaN(v) && v >= 1 && v <= 31) {
                                setGcSchedule({ ...gcSchedule, daysOfWeek: [v] })
                                setShowPreview(true)
                              } else {
                                setGcSchedule({ ...gcSchedule, daysOfWeek: [] })
                              }
                            }}
                          />
                        </div>
                      )}

                      <div className="p-3 bg-background rounded-lg border flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              className="accent-primary w-3.5 h-3.5"
                              checked={gcSchedule.limitMode === 'occurrences'}
                              onChange={() => { setGcSchedule({ ...gcSchedule, limitMode: 'occurrences' }); setShowPreview(true) }}
                            />
                            <span className="text-sm font-medium text-muted-foreground">Fixed amount</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              className="accent-primary w-3.5 h-3.5"
                              checked={gcSchedule.limitMode === 'end-date'}
                              onChange={() => { setGcSchedule({ ...gcSchedule, limitMode: 'end-date' }); setShowPreview(true) }}
                            />
                            <span className="text-sm font-medium text-muted-foreground">Until date</span>
                          </label>
                        </div>
                        <div className="flex items-center pl-6">
                          {gcSchedule.limitMode === 'occurrences' ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                max={90}
                                className="w-20 h-8"
                                value={gcSchedule.occurrences}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10)
                                  setGcSchedule({ ...gcSchedule, occurrences: isNaN(v) ? 1 : v })
                                  setShowPreview(true)
                                }}
                              />
                              <span className="text-xs text-muted-foreground">occurrences (max 90)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                className="w-36 h-8"
                                min={todayStr()}
                                max={maxEndDate()}
                                value={gcSchedule.endDate}
                                onChange={(e) => { setGcSchedule({ ...gcSchedule, endDate: e.target.value }); setShowPreview(true) }}
                              />
                              <span className="text-xs text-muted-foreground">max 3 months</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Will be saved as:</p>
                    <p className="text-xs font-mono text-foreground/80">{compileScheduleInfo(gcSchedule)}</p>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-sm font-medium">
                    Tags (comma separated)
                    {renderModifiedBadge('tags')}
                  </label>
                  <Input
                    value={gcForm.tags}
                    onChange={(e) => setGcForm({ ...gcForm, tags: e.target.value })}
                    placeholder="yoga, morning, beginner"
                    className={cn(
                      isFieldChanged('tags') && "border-amber-500 ring-amber-500/20 focus-visible:ring-amber-500"
                    )}
                  />
                </div>

                {/* Active toggle */}
                <div className={cn(
                  "flex items-center gap-3 rounded-lg border border-dashed p-3 transition-colors",
                  isFieldChanged('isActive') && "border-amber-500 bg-amber-50/10 dark:bg-amber-500/5"
                )}>
                  <button
                    type="button"
                    onClick={() => setGcForm({ ...gcForm, isActive: !gcForm.isActive })}
                    className="flex items-center gap-2 text-sm"
                  >
                    {gcForm.isActive
                      ? <IconToggleRight className="h-6 w-6 text-teal-600" />
                      : <IconToggleLeft className="h-6 w-6 text-muted-foreground" />}
                    <span className={gcForm.isActive ? 'font-medium text-teal-700 dark:text-teal-400' : 'text-muted-foreground'}>
                      {gcForm.isActive ? 'Active — visible for booking' : 'Inactive — hidden from booking'}
                    </span>
                    {renderModifiedBadge('isActive')}
                  </button>
                </div>



                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isFormDirty()) {
                        setDiscardConfirmOpen(true)
                      } else {
                        setGcDialogOpen(false)
                        setEditingGc(null)
                        resetGcForm()
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveGc} disabled={isGcPending}>
                    {isGcPending ? (
                      <span className="flex items-center gap-2">
                        <IconLoader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : editingGc ? (
                      'Save Changes'
                    ) : (
                      'Create Class'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Delete Group Class</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this class? This will prevent any future bookings.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteConfirmOpen(false)
                    setClassToDelete(null)
                  }}
                  disabled={isGcPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (classToDelete) {
                      await deleteGroupClass.mutateAsync(classToDelete)
                      setDeleteConfirmOpen(false)
                      setClassToDelete(null)
                    }
                  }}
                  disabled={isGcPending}
                >
                  {isGcPending ? (
                    <span className="flex items-center gap-2">
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </span>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={capacityConfirmOpen} onOpenChange={setCapacityConfirmOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-amber-600 dark:text-amber-500 flex items-center gap-2">
                  <IconAlertTriangle className="h-5 w-5" /> Confirm Capacity Reduction
                </DialogTitle>
                <DialogDescription className="pt-2 text-sm text-foreground">
                  You are reducing the max capacity to <strong>{capacityWarnInfo?.payload?.maxParticipants}</strong>, but some active sessions already have up to <strong>{capacityWarnInfo?.maxBooked}</strong> confirmed booking(s).
                  <br /><br />
                  Lowering capacity will limit new bookings for these sessions.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCapacityConfirmOpen(false)
                    setCapacityWarnInfo(null)
                  }}
                  disabled={isGcPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (capacityWarnInfo) {
                      setCapacityConfirmOpen(false)
                      await executeSave(capacityWarnInfo.payload, capacityWarnInfo.gcSlots)
                      setCapacityWarnInfo(null)
                    }
                  }}
                  disabled={isGcPending}
                >
                  Proceed & Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={publishWarnOpen} onOpenChange={setPublishWarnOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-amber-600 dark:text-amber-500 flex items-center gap-2">
                  <IconAlertTriangle className="h-5 w-5" /> Incomplete Class Details Warning
                </DialogTitle>
                <DialogDescription className="pt-2 text-sm text-foreground">
                  This class has incomplete details (unassigned trainer, zero capacity, or missing booking slots).
                  <br /><br />
                  Are you sure you want to publish this session to members now?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPublishWarnOpen(false)
                    setPendingPublishGc(null)
                  }}
                  disabled={togglePublishGroupClass.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
                  onClick={async () => {
                    if (pendingPublishGc) {
                      setPublishWarnOpen(false)
                      await togglePublishGroupClass.mutateAsync(pendingPublishGc)
                      setPendingPublishGc(null)
                    }
                  }}
                  disabled={togglePublishGroupClass.isPending}
                >
                  Proceed & Publish
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Input
              placeholder="Search classes by name, instructor, or tags..."
              value={gcSearchTerm}
              onChange={(e) => setGcSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex items-center space-x-1 rounded-xl border bg-muted/40 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setGcPublishFilter('all')}
                className={cn(
                  "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                  gcPublishFilter === 'all'
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({groupClasses.filter((g) => !g.isRetired && !completedClassIds.has(g.id)).length})
              </button>
              <button
                type="button"
                onClick={() => setGcPublishFilter('published')}
                className={cn(
                  "px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                  gcPublishFilter === 'published'
                    ? "bg-emerald-600 text-white shadow-sm font-semibold"
                    : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/50"
                )}
              >
                Published ({groupClasses.filter((g) => !g.isRetired && !completedClassIds.has(g.id) && g.isPublished).length})
              </button>
              <button
                type="button"
                onClick={() => setGcPublishFilter('unpublished')}
                className={cn(
                  "px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                  gcPublishFilter === 'unpublished'
                    ? "bg-amber-600 text-white shadow-sm font-semibold"
                    : "text-amber-700 dark:text-amber-400 hover:bg-amber-100/50"
                )}
              >
                Unpublished ({groupClasses.filter((g) => !g.isRetired && !completedClassIds.has(g.id) && !g.isPublished).length})
              </button>
              <button
                type="button"
                onClick={() => setGcPublishFilter('retired')}
                className={cn(
                  "px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                  gcPublishFilter === 'retired'
                    ? "bg-slate-600 text-white shadow-sm font-semibold"
                    : "text-slate-700 dark:text-slate-400 hover:bg-slate-100/50"
                )}
              >
                Retired ({groupClasses.filter((g) => g.isRetired).length})
              </button>
              <button
                type="button"
                onClick={() => setGcPublishFilter('completed')}
                className={cn(
                  "px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                  gcPublishFilter === 'completed'
                    ? "bg-indigo-600 text-white shadow-sm font-semibold"
                    : "text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100/50"
                )}
              >
                Completed ({groupClasses.filter((g) => !g.isRetired && completedClassIds.has(g.id)).length})
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <IconVideo className="h-3 w-3" /> Online
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <IconMapPin className="h-3 w-3" /> In-Person
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <IconWorld className="h-3 w-3" /> Hybrid
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Group Classes cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUsers className="h-4 w-4 text-indigo-600" />
            Group Classes
          </CardTitle>
          <CardDescription>
            {isLoadingGc ? 'Loading...' : `${filteredGroupClasses.length} class${filteredGroupClasses.length !== 1 ? 'es' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingGc ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-52 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredGroupClasses.length === 0 ? (
                <Card className="sm:col-span-2 xl:col-span-3">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No group classes yet. Click &quot;Add Group Class&quot; to create your first one.
                  </CardContent>
                </Card>
              ) : (
                filteredGroupClasses.map((gc) => (
                  <Card key={gc.id} className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                    {/* Header strip with mode colour */}
                    <div className={`p-4 ${
                      gc.mode === 'online'
                        ? 'bg-gradient-to-r from-blue-500/15 to-indigo-500/10'
                        : gc.mode === 'offline'
                        ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10'
                        : 'bg-gradient-to-r from-purple-500/15 to-violet-500/10'
                    }`}>
                      <div className="mb-2 flex items-start justify-between">
                        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                          gc.mode === 'online'
                            ? 'bg-blue-500/20 text-blue-700'
                            : gc.mode === 'offline'
                            ? 'bg-amber-500/20 text-amber-700'
                            : 'bg-purple-500/20 text-purple-700'
                        }`}>
                          {gcModeIcon[gc.mode]}
                        </div>
                        <div className="flex items-center gap-2">
                          {gc.isRetired ? (
                            <div
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-500/15 text-slate-700 border-slate-300 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800"
                            >
                              <IconAlertTriangle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              <span>Retired</span>
                            </div>
                          ) : completedClassIds.has(gc.id) ? (
                            <div
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-indigo-500/15 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                              title="All scheduled sessions for this class have finished"
                            >
                              <IconCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              <span>Completed</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(gc, !gc.isPublished)}
                              disabled={togglePublishGroupClass.isPending || isGcPending}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-sm cursor-pointer border",
                                gc.isPublished
                                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-300 hover:bg-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                  : "bg-amber-500/15 text-amber-800 border-amber-300 hover:bg-amber-500/25 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                              )}
                              title={gc.isPublished ? "Click to unpublish class" : "Click to publish class"}
                            >
                              {gc.isPublished ? (
                                <>
                                  <IconToggleRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  <span>Published</span>
                                </>
                              ) : (
                                <>
                                  <IconToggleLeft className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                  <span>Unpublished</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="text-base font-semibold tracking-tight">{gc.name}</h4>
                      <p className="text-xs text-muted-foreground">by {gc.instructor}</p>

                      {(gc.mode === 'online' || gc.mode === 'hybrid') && Boolean(nextSessionByClassId.get(gc.id)) && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg w-fit text-indigo-700 dark:text-indigo-300">
                          <span className="font-semibold">Room ID:</span>
                          {/* Same id VideoConferenceModal joins on "Host Session" — the
                              per-occurrence ScheduledSession id, matching the User App. */}
                          <span className="truncate max-w-[140px]">{(nextSessionByClassId.get(gc.id)?.videoConferenceId || '').slice(-6).toUpperCase()}</span>
                          <button
                            type="button"
                            className="ml-1 hover:text-indigo-900 dark:hover:text-white cursor-pointer"
                            title="Copy Room ID"
                            onClick={(e) => {
                              e.stopPropagation()
                              const realRoomId = nextSessionByClassId.get(gc.id)?.videoConferenceId || ''
                              navigator.clipboard.writeText(realRoomId)
                              toast.success('Video Room ID copied to clipboard!')
                            }}
                          >
                            <IconCopy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <IconClock className="h-3.5 w-3.5" /> {gc.durationMinutes} mins
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <IconCoins className="h-3.5 w-3.5" /> {gc.creditsRequired} credit{gc.creditsRequired !== 1 ? 's' : ''}
                        </span>
                        {(() => {
                          const gcSlots = slots.filter((slot) => gc.slots?.includes(slot._id))
                          const totalCap = gcSlots.reduce((sum, s) => sum + (s.capacity || 0), 0)
                          const totalRem = gcSlots.reduce((sum, s) => sum + (s.remainingCapacity || 0), 0)
                          const filled = totalCap - totalRem
                          const isFull = totalCap > 0 && totalRem <= 0

                          if (totalCap > 0) {
                            return (
                              <span className="inline-flex items-center gap-1">
                                <IconUsers className="h-3.5 w-3.5 text-indigo-600" />
                                {isFull ? (
                                  <Badge variant="destructive" className="h-5 text-[10px] px-1.5 py-0 font-bold uppercase">
                                    Full ({totalCap})
                                  </Badge>
                                ) : (
                                  <span className="font-medium text-slate-700 dark:text-slate-200">
                                    {filled} / {totalCap} filled
                                  </span>
                                )}
                              </span>
                            )
                          }
                          return (
                            <span className="inline-flex items-center gap-1">
                              <IconUsers className="h-3.5 w-3.5" /> 0 / {gc.maxParticipants} filled
                            </span>
                          )
                        })()}
                      </div>
                    </div>

                    <CardContent className="space-y-3 p-4">
                      {/* Mode badge */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${gcModeBadgeClass[gc.mode]}`}>
                          {gcModeIcon[gc.mode]} {gcModeLabel[gc.mode]}
                        </span>
                        {gc.mode === 'online' && gc.sessionType && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                            {gc.sessionType === 'group_class' ? 'Group Class' : 'Live Stream'}
                          </span>
                        )}
                        {gc.access === 'open_to_all' && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                            Open to All
                          </span>
                        )}
                        {gc.creditsRequired === 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Free
                          </span>
                        )}
                        {gc.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="rounded-full">{tag}</Badge>
                        ))}
                      </div>

                      {/* Description */}
                      <p className="min-h-10 text-sm text-muted-foreground">
                        {gc.description || 'No description provided.'}
                      </p>

                      {/* Schedule info */}
                      {gc.scheduleInfo && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <IconClock className="h-3.5 w-3.5 shrink-0" />
                          {gc.scheduleInfo}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end gap-2 flex-wrap">
                        {(gc.mode === 'online' || gc.mode === 'hybrid') && (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
                            disabled={gc.isRetired || isGcPending}
                            onClick={() => {
                              // Must join the same room as the member's User App: that's the
                              // per-occurrence ScheduledSession id (session.videoConferenceId),
                              // never the Class template id — joining gc.id would silently put
                              // the host in an empty room the member can't reach.
                              const matchedSession = nextSessionByClassId.get(gc.id)
                              if (!matchedSession) {
                                toast.error('No scheduled session found to host — schedule an occurrence for this class first.')
                                return
                              }
                              setVideoModal({
                                isOpen: true,
                                sessionId: matchedSession.id,
                                roomID: matchedSession.videoConferenceId || '',
                                sessionTitle: `${gc.name} (Live Host)`,
                                mode: (matchedSession.sessionType || gc.sessionType) === 'live_stream' ? 'LiveStreaming' : 'VideoConference',
                              })
                            }}
                          >
                            <IconVideo className="mr-1 h-3.5 w-3.5" /> Host Session
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-medium"
                          disabled={isGcPending}
                          onClick={() => {
                            setSelectedClassFilter({ id: gc.id, name: gc.name })
                            setActiveTab('group-class-bookings')
                          }}
                        >
                          <IconUsers className="mr-1 h-3.5 w-3.5" /> View Bookings
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditGcDialog(gc)}
                          disabled={gc.isRetired || isGcPending}
                        >
                          <IconEdit className="mr-1 h-4 w-4" /> Edit
                        </Button>
                        {!gc.isRetired && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              setClassToDelete(gc.id)
                              setDeleteConfirmOpen(true)
                            }}
                            disabled={isGcPending}
                          >
                            <IconTrash className="mr-1 h-4 w-4" /> Delete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="group-class-bookings" className="mt-6">
          <GroupClassBookingsPanel
            selectedClassFilter={selectedClassFilter}
            onClearClassFilter={() => setSelectedClassFilter(null)}
          />
        </TabsContent>

        <TabsContent value="live-sessions" className="mt-6 space-y-6">
          <LiveSessionsPanel />
        </TabsContent>
      </Tabs>

      <VideoConferenceModal
        open={videoModal.isOpen}
        onOpenChange={(open) => setVideoModal((prev) => ({ ...prev, isOpen: open }))}
        sessionId={videoModal.sessionId}
        roomID={videoModal.roomID}
        sessionTitle={videoModal.sessionTitle}
        mode={videoModal.mode}
      />
      {/* Unsaved Changes Confirmation Modal */}
      <Dialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Discard Unsaved Changes?</DialogTitle>
            <DialogDescription>
              Are you sure you want to go back? Your entered information will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDiscardConfirmOpen(false)}
            >
              Stay
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDiscardConfirmOpen(false)
                setGcDialogOpen(false)
                resetGcForm()
              }}
            >
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
