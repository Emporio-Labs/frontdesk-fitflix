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
  IconMapPin,
  IconWorld,
  IconCoins,
  IconToggleRight,
  IconToggleLeft,
} from '@tabler/icons-react'
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
} from '@/hooks/use-group-classes'
import { useSlots } from '@/hooks/use-slots'
import type { TherapyCatalogItem } from '@/lib/services/therapy.service'
import type { GroupClass, GroupClassMode } from '@/lib/services/group-class.service'
import { slotService, type Slot } from '@/lib/services/slot.service'

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

export default function TherapiesPage() {
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
  const defaultGcForm = {
    name: '',
    description: '',
    mode: 'offline' as GroupClassMode,
    instructor: '',
    durationMinutes: 60,
    creditsRequired: 1,
    maxParticipants: 20,
    tags: '',
    scheduleInfo: '',
    isActive: true,
  }
  const [gcForm, setGcForm] = useState(defaultGcForm)

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

  const createTherapy = useCreateTherapy()
  const updateTherapy = useUpdateTherapy()
  const deleteTherapy = useDeleteTherapy()
  const createGroupClass = useCreateGroupClass()
  const updateGroupClass = useUpdateGroupClass()
  const deleteGroupClass = useDeleteGroupClass()

  const items = therapies

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (item.tags.some(t => t.toLowerCase() === '__group_class__')) return false
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
    setSelectedSlotIds([])
    setSlotSearchTerm('')
    setManualSlotIds('')
    setShowManualSlotInput(false)
    setSlotPlan({ startTime: '09:00', endTime: '17:00', capacityPerHour: 1 })
  }

  const openCreateGcDialog = () => {
    setEditingGc(null)
    resetGcForm()
    setGcDialogOpen(true)
  }

  const openEditGcDialog = (gc: GroupClass) => {
    setEditingGc(gc)
    setGcForm({
      name: gc.name,
      description: gc.description,
      mode: gc.mode,
      instructor: gc.instructor,
      durationMinutes: gc.durationMinutes,
      creditsRequired: gc.creditsRequired,
      maxParticipants: gc.maxParticipants,
      tags: gc.tags.join(', '),
      scheduleInfo: gc.scheduleInfo,
      isActive: gc.isActive,
    })
    setSelectedSlotIds(gc.slots || [])
    setSlotSearchTerm('')
    setManualSlotIds('')
    setShowManualSlotInput(false)
    setSlotPlan({ startTime: '09:00', endTime: '17:00', capacityPerHour: 1 })
    setGcDialogOpen(true)
  }

  const handleSaveGc = async () => {
    if (!gcForm.name.trim()) { toast.error('Class name is required'); return }
    if (!gcForm.instructor.trim()) { toast.error('Instructor name is required'); return }
    if (!gcForm.description.trim()) { toast.error('Description is required'); return }
    if (gcForm.durationMinutes <= 0) { toast.error('Duration must be greater than 0'); return }
    if (gcForm.creditsRequired <= 0) { toast.error('Credits required must be greater than 0'); return }
    if (gcForm.maxParticipants <= 0) { toast.error('Max participants must be greater than 0'); return }

    const mergedSlotIds = Array.from(new Set([...selectedSlotIds, ...parseCsvTags(manualSlotIds)]))
    if (mergedSlotIds.length === 0) {
      toast.error('At least one booking slot is required for the class. Use "Generate Slots" or select from the list.')
      return
    }

    const payload = {
      name: gcForm.name.trim(),
      description: gcForm.description.trim(),
      mode: gcForm.mode,
      instructor: gcForm.instructor.trim(),
      durationMinutes: gcForm.durationMinutes,
      creditsRequired: gcForm.creditsRequired,
      maxParticipants: gcForm.maxParticipants,
      tags: parseCsvTags(gcForm.tags),
      scheduleInfo: gcForm.scheduleInfo.trim(),
      slots: mergedSlotIds,
      isActive: gcForm.isActive,
    }

    if (editingGc) {
      await updateGroupClass.mutateAsync({ id: editingGc.id, payload })
    } else {
      await createGroupClass.mutateAsync(payload)
    }

    setGcDialogOpen(false)
    setEditingGc(null)
    resetGcForm()
  }

  const handleDeleteGc = (id: string) => deleteGroupClass.mutate(id)

  const filteredGroupClasses = useMemo(() => {
    const q = gcSearchTerm.toLowerCase()
    if (!q) return groupClasses
    return groupClasses.filter(
      (gc) =>
        gc.name.toLowerCase().includes(q) ||
        gc.instructor.toLowerCase().includes(q) ||
        gc.description.toLowerCase().includes(q) ||
        gc.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [groupClasses, gcSearchTerm])

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
    const query = slotSearchTerm.trim().toLowerCase()
    if (!query) return slotOptions

    return slotOptions.filter((slot) => {
      const slotDate = formatSlotDate(slot.date, slot.isDaily).toLowerCase()
      return (
        slot.startTime.toLowerCase().includes(query) ||
        slot.endTime.toLowerCase().includes(query) ||
        slotDate.includes(query) ||
        slot._id.toLowerCase().includes(query)
      )
    })
  }, [slotOptions, slotSearchTerm])

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
    <div className="flex-1 space-y-6 p-6 md:p-8">
      {/* ── Hero Banner: rotating Therapies ↔ Group Classes ── */}
      <style>{`
        @keyframes slide-fade-in {
          0%   { opacity: 1; }
          42%  { opacity: 1; }
          50%  { opacity: 0; }
          92%  { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes slide-fade-out {
          0%   { opacity: 0; }
          42%  { opacity: 0; }
          50%  { opacity: 1; }
          92%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      <div className="relative overflow-hidden rounded-xl shadow-lg" style={{ minHeight: '120px' }}>
        {/* Slide 1 — Therapies */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-500 text-white rounded-xl"
          style={{ animation: 'slide-fade-in 10s ease-in-out infinite' }}
        >
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

        {/* Slide 2 — Group Classes */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-500 text-white rounded-xl"
          style={{ animation: 'slide-fade-out 10s ease-in-out infinite' }}
        >
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
                  <p className="text-xl font-semibold">{groupClasses.length}</p>
                </div>
                <div>
                  <p className="text-xs text-purple-50/90">Active</p>
                  <p className="text-xl font-semibold">{groupClasses.filter(gc => gc.isActive).length}</p>
                </div>
                <div>
                  <p className="text-xs text-purple-50/90">Modes</p>
                  <p className="text-xl font-semibold">{new Set(groupClasses.map(gc => gc.mode)).size}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invisible spacer to set the container height */}
        <div className="invisible p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="h-12 w-12" />
              <h2 className="text-4xl font-bold tracking-tight">Placeholder</h2>
              <p className="max-w-2xl text-sm">Placeholder description to set height</p>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4">
              <div><p className="text-xs">x</p><p className="text-xl font-semibold">0</p></div>
              <div><p className="text-xs">x</p><p className="text-xl font-semibold">0</p></div>
              <div><p className="text-xs">x</p><p className="text-xl font-semibold">0</p></div>
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
          <Dialog open={gcDialogOpen} onOpenChange={setGcDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateGcDialog}>
                <IconPlus className="mr-2 h-4 w-4" />
                Add Group Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>{editingGc ? 'Edit Group Class' : 'Create Group Class'}</DialogTitle>
                <DialogDescription>
                  Configure session details, delivery mode, capacity, and credit cost.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-sm font-medium">Class Name <span className="text-red-500">*</span></label>
                  <Input
                    value={gcForm.name}
                    onChange={(e) => setGcForm({ ...gcForm, name: e.target.value })}
                    placeholder="Morning Yoga Flow"
                  />
                </div>

                {/* Instructor */}
                <div>
                  <label className="text-sm font-medium">Instructor <span className="text-red-500">*</span></label>
                  <Input
                    value={gcForm.instructor}
                    onChange={(e) => setGcForm({ ...gcForm, instructor: e.target.value })}
                    placeholder="e.g. Coach Arjun"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium">Description <span className="text-red-500">*</span></label>
                  <Textarea
                    value={gcForm.description}
                    onChange={(e) => setGcForm({ ...gcForm, description: e.target.value })}
                    placeholder="Describe what participants will experience in this class."
                    className="min-h-20 resize-none"
                  />
                </div>

                {/* Mode */}
                <div>
                  <label className="text-sm font-medium">Delivery Mode</label>
                  <Select
                    value={gcForm.mode}
                    onValueChange={(val) => setGcForm({ ...gcForm, mode: val as GroupClassMode })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offline"><span className="flex items-center gap-2"><IconMapPin className="h-4 w-4 text-amber-600" /> In-Person</span></SelectItem>
                      <SelectItem value="online"><span className="flex items-center gap-2"><IconVideo className="h-4 w-4 text-blue-600" /> Online</span></SelectItem>
                      <SelectItem value="hybrid"><span className="flex items-center gap-2"><IconWorld className="h-4 w-4 text-purple-600" /> Hybrid</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration + Credits + Max Participants */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium">Duration (mins)</label>
                    <Input
                      type="number"
                      min={1}
                      value={gcForm.durationMinutes}
                      onChange={(e) => setGcForm({ ...gcForm, durationMinutes: Number.parseInt(e.target.value, 10) || 0 })}
                      placeholder="60"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Credits Required</label>
                    <Input
                      type="number"
                      min={0}
                      value={gcForm.creditsRequired}
                      onChange={(e) => setGcForm({ ...gcForm, creditsRequired: Number.parseInt(e.target.value, 10) || 0 })}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Participants</label>
                    <Input
                      type="number"
                      min={1}
                      value={gcForm.maxParticipants}
                      onChange={(e) => setGcForm({ ...gcForm, maxParticipants: Number.parseInt(e.target.value, 10) || 0 })}
                      placeholder="20"
                    />
                  </div>
                </div>

                {/* Schedule Info */}
                <div>
                  <label className="text-sm font-medium">Schedule / Timing Info</label>
                  <Input
                    value={gcForm.scheduleInfo}
                    onChange={(e) => setGcForm({ ...gcForm, scheduleInfo: e.target.value })}
                    placeholder="e.g. Mon, Wed, Fri — 7:00 AM"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="text-sm font-medium">Tags (comma separated)</label>
                  <Input
                    value={gcForm.tags}
                    onChange={(e) => setGcForm({ ...gcForm, tags: e.target.value })}
                    placeholder="yoga, morning, beginner"
                  />
                </div>

                {/* Active toggle */}
                <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
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
                  </button>
                </div>

                {/* Slot Generation & Selection for Group Classes */}
                <div className="space-y-3 rounded-lg border border-dashed p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Generate Hourly Slots For This Class</label>
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
                    {isGeneratingSlots ? 'Generating Slots...' : 'Generate Slots For This Class'}
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Booking Windows For This Class
                      {!editingGc && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    <Badge variant={selectedSlotIds.length === 0 ? 'destructive' : 'secondary'} className="rounded-full">
                      {selectedSlotIds.length} linked
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Select which time windows this class can be booked in. At least one slot is required.
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

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setGcDialogOpen(false); setEditingGc(null); resetGcForm() }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveGc} disabled={isGcPending}>
                    {isGcPending ? 'Saving...' : editingGc ? 'Save Changes' : 'Create Class'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search classes by name, instructor, or tags..."
            value={gcSearchTerm}
            onChange={(e) => setGcSearchTerm(e.target.value)}
            className="max-w-sm"
          />
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
                        {!gc.isActive && (
                          <Badge variant="outline" className="rounded-full text-xs text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-base font-semibold tracking-tight">{gc.name}</h4>
                      <p className="text-xs text-muted-foreground">by {gc.instructor}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <IconClock className="h-3.5 w-3.5" /> {gc.durationMinutes} mins
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <IconCoins className="h-3.5 w-3.5" /> {gc.creditsRequired} credit{gc.creditsRequired !== 1 ? 's' : ''}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <IconUsers className="h-3.5 w-3.5" /> Max {gc.maxParticipants}
                        </span>
                      </div>
                    </div>

                    <CardContent className="space-y-3 p-4">
                      {/* Mode badge */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${gcModeBadgeClass[gc.mode]}`}>
                          {gcModeIcon[gc.mode]} {gcModeLabel[gc.mode]}
                        </span>
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
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditGcDialog(gc)}>
                          <IconEdit className="mr-1 h-4 w-4" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteGc(gc.id)}
                          disabled={isGcPending}
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
    </div>
  )
}
