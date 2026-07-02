import sys

def modify_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add icons
    icon_search = "IconToggleLeft,\n} from '@tabler/icons-react'"
    icon_replace = "IconToggleLeft,\n  IconCalendarEvent,\n  IconRepeat,\n  IconCalendarTime,\n  IconAlertTriangle,\n  IconChevronDown,\n} from '@tabler/icons-react'"
    content = content.replace(icon_search, icon_replace)

    # 2. Add types and helpers
    helpers = '''
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
  const d = new Date(f'{dateStr}T00:00:00')
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
    const d = new Date(f'{s.oneTimeDate}T00:00:00')
    if (!Number.isNaN(d.getTime())) results.push(d)
    return results
  }

  const absMax = s.limitMode === 'end-date'
    ? (s.endDate ? new Date(f'{s.endDate}T00:00:00') : maxDate)
    : maxDate
  const capDate = absMax < maxDate ? absMax : maxDate
  const maxOccurrences = s.limitMode === 'occurrences' ? Math.min(s.occurrences, 90) : 90

  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= capDate && len(results) < maxOccurrences) {
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
  const timeRange = f'{s.startTime} – {s.endTime}'
  if (s.mode === 'one-time') {
    const dateLabel = s.oneTimeDate ? formatDate(s.oneTimeDate) : 'TBD'
    return f'One-Time: {dateLabel} · {timeRange}'
  }
  const occurrences = computeOccurrences(s)
  const countLabel = occurrences.length > 0 ? f'{occurrences.length} occurrence{occurrences.length !== 1 ? "s" : ""}' : 'no occurrences'
  if (s.frequency === 'daily') {
    const limitLabel = s.limitMode === 'end-date' && s.endDate ? f'until {formatDate(s.endDate)}' : f'{s.occurrences} occurrence{s.occurrences !== 1 ? "s" : ""}'
    return f'Daily at {timeRange} · {limitLabel} ({countLabel})'
  }
  if (s.frequency === 'weekly') {
    const days = s.daysOfWeek.slice().sort((a, b) => a - b).map(d => DAY_LABELS[d]).join(', ')
    const limitLabel = s.limitMode === 'end-date' && s.endDate ? f'until {formatDate(s.endDate)}' : f'{s.occurrences} occurrence{s.occurrences !== 1 ? "s" : ""}'
    return f'Weekly on {days} at {timeRange} · {limitLabel} ({countLabel})'
  }
  const dayNum = s.daysOfWeek[0] ?? new Date().getDate()
  const limitLabel = s.limitMode === 'end-date' && s.endDate ? f'until {formatDate(s.endDate)}' : f'{s.occurrences} occurrence{s.occurrences !== 1 ? "s" : ""}'
  return f'Monthly on day {dayNum} at {timeRange} · {limitLabel} ({countLabel})'
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
'''
    content = content.replace('function formatSlotDate(rawDate?: string, isDaily = false) {', helpers.replace('len(results)', 'results.length').replace("f'", "").replace("'", "'").replace('f"', ''))

    # 3. Add State
    state_search = "const [gcForm, setGcForm] = useState(defaultGcForm)"
    state_replace = "const [gcForm, setGcForm] = useState(defaultGcForm)\n  const [gcSchedule, setGcSchedule] = useState<GcSchedule>(DEFAULT_SCHEDULE)\n  const [showPreview, setShowPreview] = useState(false)"
    content = content.replace(state_search, state_replace)

    # 4. resetGcForm
    reset_search = "setGcForm(defaultGcForm)\n    setSelectedSlotIds"
    reset_replace = "setGcForm(defaultGcForm)\n    setGcSchedule(DEFAULT_SCHEDULE)\n    setShowPreview(false)\n    setSelectedSlotIds"
    content = content.replace(reset_search, reset_replace)

    # 5. openEditGcDialog
    edit_search = "isActive: gc.isActive,\n    })\n    setSelectedSlotIds"
    edit_replace = '''isActive: gc.isActive,
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
    setSelectedSlotIds'''
    content = content.replace(edit_search, edit_replace)

    # 6. handleSaveGc
    save_search = "if (gcForm.maxParticipants <= 0) { toast.error('Max participants must be greater than 0'); return }\n\n    const mergedSlotIds"
    save_replace = '''if (gcForm.maxParticipants <= 0) { toast.error('Max participants must be greater than 0'); return }

    if (gcSchedule.mode === 'one-time') {
      if (!gcSchedule.oneTimeDate) { toast.error('Please select a class date'); return }
      const st = timeToMinutes(gcSchedule.startTime)
      const et = timeToMinutes(gcSchedule.endTime)
      if (st === null || et === null) { toast.error('Please enter valid start and end times'); return }
      if (st >= et) { toast.error('End time must be after start time'); return }
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

    const mergedSlotIds'''
    content = content.replace(save_search, save_replace)

    # 7. handleSaveGc payload
    payload_search = "scheduleInfo: gcForm.scheduleInfo.trim(),\n      slots: mergedSlotIds"
    payload_replace = "scheduleInfo: compiledScheduleInfo,\n      slots: mergedSlotIds"
    content = content.replace(payload_search, payload_replace)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

modify_file(r'd:\frontdesk-fitflix\app\admin\therapies\page.tsx')
