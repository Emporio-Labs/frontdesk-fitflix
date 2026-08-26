'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconCalendar,
  IconClock,
  IconSparkles,
  IconAlertTriangle,
  IconCheck,
  IconStethoscope,
  IconSalad,
  IconDroplet,
  IconMapPin,
  IconLayersIntersect,
  IconChecklist,
} from '@tabler/icons-react'
import {
  useSlots,
  useCreateSlot,
  useUpdateSlot,
  useGenerateSlots,
  useDeleteSlot,
  useBulkDeleteSlots,
  useBulkUpdateSlots,
} from '@/hooks/use-slots'
import { useTherapies } from '@/hooks/use-therapies'
import { useBookings } from '@/hooks/use-bookings'
import { useOptionalLocationScope } from '@/components/location-scope-provider'
import {
  RESOURCE_TYPE_OPTIONS,
  SlotResourceType,
  GenerateSlotsResult,
} from '@/lib/services/slot.service'
import { timeToMinutes, formatTimeRange } from '@/lib/time-utils'
import { toUtcDateKey } from '@/lib/utils'
import { getUserDisplayName } from '@/lib/populated'
import { toast } from 'sonner'

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120]
const BUFFER_PRESETS = [0, 5, 10, 15, 30]
const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
]

function formatSlotSchedule(date?: string, isDaily?: boolean) {
  if (isDaily || !date) {
    return 'Daily'
  }

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return 'Daily'
  }

  return parsed.toLocaleDateString()
}

function getResourceBadge(type: SlotResourceType) {
  switch (type) {
    case 'SPORTS_SCIENTIST':
      return (
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 gap-1">
          <IconStethoscope className="w-3 h-3" /> Sports Scientist
        </Badge>
      )
    case 'NUTRITIONIST':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1">
          <IconSalad className="w-3 h-3" /> Nutritionist
        </Badge>
      )
    case 'THERAPY':
      return (
        <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 gap-1">
          <IconDroplet className="w-3 h-3" /> Therapy
        </Badge>
      )
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

export default function UniversalSlotsPage() {
  const locationScope = useOptionalLocationScope()
  const selectedLocationId = locationScope?.selectedLocationId ?? null
  const locations = locationScope?.locations ?? []

  const [activeTab, setActiveTab] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Multi-Select State
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([])
  const [isBulkCapacityOpen, setIsBulkCapacityOpen] = useState(false)
  const [bulkCapacityValue, setBulkCapacityValue] = useState(1)

  // Confirmation Alert Dialog States
  const [isClearCategoryConfirmOpen, setIsClearCategoryConfirmOpen] = useState(false)
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false)
  const [isDiscardGeneratorConfirmOpen, setIsDiscardGeneratorConfirmOpen] = useState(false)
  const [isDiscardEditConfirmOpen, setIsDiscardEditConfirmOpen] = useState(false)
  const [slotToDelete, setSlotToDelete] = useState<any | null>(null)

  // Single Slot Modal State
  const [isSingleDialogOpen, setIsSingleDialogOpen] = useState(false)
  const [singleFormData, setSingleFormData] = useState<{
    startTime: string
    endTime: string
    capacity: number
    resourceType: SlotResourceType
    resourceId?: string
    isDaily: boolean
    date?: string
  }>({
    startTime: '09:00',
    endTime: '10:00',
    capacity: 1,
    resourceType: 'NUTRITIONIST',
    isDaily: true,
  })

  // Bulk Generator Modal State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [generatorData, setGeneratorData] = useState<{
    locationId: string | null
    resourceType: SlotResourceType
    resourceId: string | null
    slotDurationMinutes: number
    customDuration: string
    bufferMinutes: number
    capacity: number
    isDaily: boolean
    replaceExisting: boolean
    dateFrom: string
    dateTo: string
    daysOfWeek: number[]
    windows: Array<{ startTime: string; endTime: string }>
  }>({
    locationId: selectedLocationId,
    resourceType: 'NUTRITIONIST',
    resourceId: null,
    slotDurationMinutes: 30,
    customDuration: '',
    bufferMinutes: 0,
    capacity: 1,
    isDaily: true,
    replaceExisting: false,
    dateFrom: '',
    dateTo: '',
    daysOfWeek: [1, 2, 3, 4, 5],
    windows: [{ startTime: '09:30', endTime: '18:00' }],
  })

  const [previewResult, setPreviewResult] = useState<GenerateSlotsResult | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // Edit Slot Modal State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<{
    resourceType: SlotResourceType
    locationId: string | null
    resourceId?: string | null
    startTime: string
    endTime: string
    capacity: number
    remainingCapacity: number
    isDaily: boolean
    date?: string
  }>({
    resourceType: 'NUTRITIONIST',
    locationId: null,
    resourceId: null,
    startTime: '09:00',
    endTime: '10:00',
    capacity: 1,
    remainingCapacity: 1,
    isDaily: true,
  })

  // Query Hooks
  const effectiveResourceType = activeTab === 'ALL' ? undefined : (activeTab as SlotResourceType)
  const {
    data: slots = [],
    isLoading,
    isError,
    refetch,
  } = useSlots({
    locationId: selectedLocationId || undefined,
    resourceType: effectiveResourceType,
  })

  const { data: therapies = [] } = useTherapies()
  const { data: bookings = [] } = useBookings()
  const createSlot = useCreateSlot()
  const updateSlot = useUpdateSlot()
  const generateSlots = useGenerateSlots()
  const deleteSlot = useDeleteSlot()
  const bulkDelete = useBulkDeleteSlots()
  const bulkUpdate = useBulkUpdateSlots()

  // Filter slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchTime = slot.startTime.toLowerCase().includes(q) || slot.endTime.toLowerCase().includes(q)
        const matchId = slot._id.toLowerCase().includes(q)
        const matchType = slot.resourceType?.toLowerCase().includes(q)
        if (!matchTime && !matchId && !matchType) return false
      }
      return true
    })
  }, [slots, searchTerm])

  const totalPages = Math.ceil(filteredSlots.length / itemsPerPage)
  const activePage = Math.max(1, Math.min(currentPage, totalPages || 1))
  const startIndex = (activePage - 1) * itemsPerPage
  const paginatedSlots = filteredSlots.slice(startIndex, startIndex + itemsPerPage)

  const isAllSelected =
    filteredSlots.length > 0 && filteredSlots.every((s) => selectedSlotIds.includes(s._id))

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSlotIds([])
    } else {
      setSelectedSlotIds(filteredSlots.map((s) => s._id))
    }
  }

  const handleToggleSelectSlot = (slotId: string) => {
    setSelectedSlotIds((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    )
  }

  const handleExecuteBulkDelete = async () => {
    if (selectedSlotIds.length === 0) return
    await bulkDelete.mutateAsync(selectedSlotIds)
    setSelectedSlotIds([])
    setIsBulkDeleteConfirmOpen(false)
  }

  const handleExecuteClearCategoryGrid = async () => {
    if (filteredSlots.length === 0) return
    const allIds = filteredSlots.map((s) => s._id)
    await bulkDelete.mutateAsync(allIds)
    setSelectedSlotIds([])
    setIsClearCategoryConfirmOpen(false)
  }

  const handleExecuteSingleDelete = async () => {
    if (!slotToDelete) return
    await deleteSlot.mutateAsync(slotToDelete._id)
    setSlotToDelete(null)
  }

  const handleApplyBulkCapacity = async () => {
    if (selectedSlotIds.length === 0 || bulkCapacityValue < 1) return

    await bulkUpdate.mutateAsync({
      slotIds: selectedSlotIds,
      capacity: bulkCapacityValue,
    })
    setIsBulkCapacityOpen(false)
  }

  const getLinkedResourceName = (slot: any) => {
    if (!slot.resourceId) {
      return <span className="text-xs text-muted-foreground italic">Shared Pool</span>
    }
    if (slot.resourceType === 'THERAPY') {
      const found = therapies.find((t) => t.id === slot.resourceId || (t as any)._id === slot.resourceId)
      return found ? found.name : `Therapy (${slot.resourceId.slice(-6)})`
    }
    return `Dedicated ID ...${slot.resourceId.slice(-6)}`
  }

  const getSlotBookings = (slotId: string, slotDate?: string, isDaily?: boolean) => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    const todayDateKey = local.toISOString().slice(0, 10)

    const targetDateKey = isDaily || !slotDate ? todayDateKey : toUtcDateKey(slotDate)
    return bookings.filter((booking) => {
      const bookingSlotId = booking.slot?._id ?? booking.slot
      const bookingDateKey = toUtcDateKey(booking.bookingDate)
      const isSameSlot = bookingSlotId === slotId
      const isSameDate = bookingDateKey === targetDateKey
      const isActiveStatus =
        Number(booking.status) === 0 || Number(booking.status) === 1 || Number(booking.status) === 3

      return isSameSlot && isSameDate && isActiveStatus
    })
  }

  const handleSingleCreate = async () => {
    if (!singleFormData.startTime || !singleFormData.endTime) {
      toast.error('Start and end time are required')
      return
    }

    const startMinutes = timeToMinutes(singleFormData.startTime)
    const endMinutes = timeToMinutes(singleFormData.endTime)

    if (startMinutes === null || endMinutes === null) {
      toast.error('Please enter a valid start and end time')
      return
    }

    if (startMinutes >= endMinutes) {
      toast.error('End time must be after start time')
      return
    }

    await createSlot.mutateAsync({
      locationId: selectedLocationId,
      resourceType: singleFormData.resourceType,
      resourceId: singleFormData.resourceId || null,
      startTime: singleFormData.startTime,
      endTime: singleFormData.endTime,
      capacity: singleFormData.capacity,
      isDaily: singleFormData.isDaily,
      date: singleFormData.isDaily ? undefined : singleFormData.date,
    })
    setIsSingleDialogOpen(false)
  }

  const handleOpenEdit = (slot: any) => {
    setEditingSlotId(slot._id)
    setEditFormData({
      resourceType: slot.resourceType || 'NUTRITIONIST',
      locationId: slot.locationId || null,
      resourceId: slot.resourceId || null,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity ?? 1,
      remainingCapacity: slot.remainingCapacity ?? slot.capacity ?? 1,
      isDaily: Boolean(slot.isDaily),
      date: slot.date ? slot.date.slice(0, 10) : '',
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingSlotId) return

    if (!editFormData.startTime || !editFormData.endTime) {
      toast.error('Start and end time are required')
      return
    }

    const startMinutes = timeToMinutes(editFormData.startTime)
    const endMinutes = timeToMinutes(editFormData.endTime)

    if (startMinutes === null || endMinutes === null) {
      toast.error('Please enter valid start and end times')
      return
    }

    if (startMinutes >= endMinutes) {
      toast.error('End time must be after start time')
      return
    }

    if (!editFormData.capacity || editFormData.capacity < 1) {
      toast.error('Capacity must be at least 1')
      return
    }

    await updateSlot.mutateAsync({
      id: editingSlotId,
      payload: {
        resourceType: editFormData.resourceType,
        locationId: editFormData.locationId || null,
        resourceId: editFormData.resourceId || null,
        startTime: editFormData.startTime,
        endTime: editFormData.endTime,
        capacity: editFormData.capacity,
        remainingCapacity: Math.min(editFormData.remainingCapacity, editFormData.capacity),
        isDaily: editFormData.isDaily,
        date: editFormData.isDaily ? undefined : editFormData.date || undefined,
      },
    })
    setIsEditDialogOpen(false)
    setEditingSlotId(null)
  }

  const handleAddWindow = () => {
    setGeneratorData((prev) => ({
      ...prev,
      windows: [...prev.windows, { startTime: '14:00', endTime: '18:00' }],
    }))
  }

  const handleRemoveWindow = (index: number) => {
    setGeneratorData((prev) => ({
      ...prev,
      windows: prev.windows.filter((_, i) => i !== index),
    }))
  }

  const handleWindowChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setGeneratorData((prev) => {
      const updated = [...prev.windows]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, windows: updated }
    })
  }

  const handleToggleDayOfWeek = (dayVal: number) => {
    setGeneratorData((prev) => {
      const exists = prev.daysOfWeek.includes(dayVal)
      return {
        ...prev,
        daysOfWeek: exists
          ? prev.daysOfWeek.filter((d) => d !== dayVal)
          : [...prev.daysOfWeek, dayVal].sort((a, b) => a - b),
      }
    })
  }

  const handleRunPreview = async () => {
    const effectiveDuration = generatorData.customDuration
      ? parseInt(generatorData.customDuration, 10)
      : generatorData.slotDurationMinutes

    if (!effectiveDuration || effectiveDuration < 5) {
      toast.error('Slot duration must be at least 5 minutes')
      return
    }

    setIsPreviewLoading(true)
    try {
      const result = await generateSlots.mutateAsync({
        locationId: generatorData.locationId || selectedLocationId,
        resourceType: generatorData.resourceType,
        resourceId: generatorData.resourceId || null,
        slotDurationMinutes: effectiveDuration,
        bufferMinutes: generatorData.bufferMinutes,
        capacity: generatorData.capacity,
        isDaily: generatorData.isDaily,
        replaceExisting: generatorData.replaceExisting,
        dateFrom: generatorData.isDaily ? undefined : generatorData.dateFrom || undefined,
        dateTo: generatorData.isDaily ? undefined : generatorData.dateTo || undefined,
        daysOfWeek: generatorData.isDaily ? undefined : generatorData.daysOfWeek,
        windows: generatorData.windows,
        dryRun: true,
      })
      setPreviewResult(result)
      toast.info(`Preview calculated: ${result.proposedCount ?? 0} slots`)
    } catch {
      // Handled by mutation onError
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleCommitGeneration = async () => {
    const effectiveDuration = generatorData.customDuration
      ? parseInt(generatorData.customDuration, 10)
      : generatorData.slotDurationMinutes

    try {
      const result = await generateSlots.mutateAsync({
        locationId: generatorData.locationId || selectedLocationId,
        resourceType: generatorData.resourceType,
        resourceId: generatorData.resourceId || null,
        slotDurationMinutes: effectiveDuration,
        bufferMinutes: generatorData.bufferMinutes,
        capacity: generatorData.capacity,
        isDaily: generatorData.isDaily,
        replaceExisting: generatorData.replaceExisting,
        dateFrom: generatorData.isDaily ? undefined : generatorData.dateFrom || undefined,
        dateTo: generatorData.isDaily ? undefined : generatorData.dateTo || undefined,
        daysOfWeek: generatorData.isDaily ? undefined : generatorData.daysOfWeek,
        windows: generatorData.windows,
        dryRun: false,
      })
      toast.success(result.message || `Successfully created ${result.createdCount ?? 0} slots`)
      setIsGeneratorOpen(false)
      setPreviewResult(null)
      setSelectedSlotIds([])
      refetch()
    } catch {
      // Handled by mutation onError
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 text-white p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-medium backdrop-blur-sm">
              <IconMapPin className="w-3.5 h-3.5" />
              {locationScope?.selectedLocation?.name || 'All Locations (Branch Scoped)'}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Universal Slot Management</h2>
            <p className="max-w-2xl text-sm text-blue-50/90">
              One central grid for Sports Scientists, Nutritionists, and Therapies with configurable 15/30/45/60/90+ minute durations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              className="bg-white/90 text-blue-900 hover:bg-white font-medium shadow-sm"
              onClick={() => {
                setPreviewResult(null)
                setGeneratorData((prev) => ({
                  ...prev,
                  resourceType:
                    activeTab === 'ALL' ? 'NUTRITIONIST' : (activeTab as SlotResourceType),
                  locationId: selectedLocationId,
                }))
                setIsGeneratorOpen(true)
              }}
            >
              <IconSparkles className="w-4 h-4 mr-2 text-blue-600" />
              Generate Slot Grid
            </Button>

            <Dialog open={isSingleDialogOpen} onOpenChange={setIsSingleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/30">
                  <IconPlus className="w-4 h-4 mr-2" />
                  Quick Slot
                </Button>
              </DialogTrigger>
              <DialogContent
                className="sm:max-w-[480px]"
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>Create Individual Slot</DialogTitle>
                  <DialogDescription>Add a single custom time slot to the platform inventory.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={singleFormData.resourceType}
                      onValueChange={(val) => setSingleFormData({ ...singleFormData, resourceType: val as SlotResourceType })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOURCE_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Start Time</label>
                      <Input
                        type="time"
                        value={singleFormData.startTime}
                        onChange={(e) => setSingleFormData({ ...singleFormData, startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Time</label>
                      <Input
                        type="time"
                        value={singleFormData.endTime}
                        onChange={(e) => setSingleFormData({ ...singleFormData, endTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Capacity (Seats/Clients)</label>
                    <Input
                      type="number"
                      min={1}
                      value={singleFormData.capacity}
                      onChange={(e) => setSingleFormData({ ...singleFormData, capacity: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="single-is-daily"
                      checked={singleFormData.isDaily}
                      onCheckedChange={(checked) => setSingleFormData({ ...singleFormData, isDaily: Boolean(checked) })}
                    />
                    <label htmlFor="single-is-daily" className="text-sm font-medium cursor-pointer">
                      Daily Recurring Template
                    </label>
                  </div>

                  {!singleFormData.isDaily && (
                    <div>
                      <label className="text-sm font-medium">Specific Date</label>
                      <Input
                        type="date"
                        value={singleFormData.date || ''}
                        onChange={(e) => setSingleFormData({ ...singleFormData, date: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setIsSingleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSingleCreate} disabled={createSlot.isPending}>
                      {createSlot.isPending ? 'Creating...' : 'Create Slot'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v)
            setCurrentPage(1)
            setSelectedSlotIds([])
          }}
        >
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="ALL" className="text-xs sm:text-sm px-3 py-1.5">
              All Slots
            </TabsTrigger>
            <TabsTrigger value="SPORTS_SCIENTIST" className="text-xs sm:text-sm px-3 py-1.5 gap-1.5">
              <IconStethoscope className="w-3.5 h-3.5 text-purple-600" /> Sports Scientist
            </TabsTrigger>
            <TabsTrigger value="NUTRITIONIST" className="text-xs sm:text-sm px-3 py-1.5 gap-1.5">
              <IconSalad className="w-3.5 h-3.5 text-emerald-600" /> Nutritionist
            </TabsTrigger>
            <TabsTrigger value="THERAPY" className="text-xs sm:text-sm px-3 py-1.5 gap-1.5">
              <IconDroplet className="w-3.5 h-3.5 text-cyan-600" /> Therapies
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {filteredSlots.length > 0 && activeTab !== 'ALL' && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => setIsClearCategoryConfirmOpen(true)}
              disabled={bulkDelete.isPending}
            >
              <IconTrash className="w-3.5 h-3.5 mr-1" /> Clear {activeTab} Grid
            </Button>
          )}

          <Input
            placeholder="Search by time, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-56 h-9 text-sm"
          />
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 px-3">
            <IconRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Floating Bulk Actions Bar (Appears when 1+ rows are selected) */}
      {selectedSlotIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
              {selectedSlotIds.length}
            </div>
            <span className="text-sm font-semibold text-blue-950 dark:text-blue-200">
              slots selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-700"
              onClick={() => setIsBulkCapacityOpen(true)}
            >
              <IconChecklist className="w-3.5 h-3.5 mr-1 text-blue-600" /> Set Capacity
            </Button>

            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs"
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              disabled={bulkDelete.isPending}
            >
              <IconTrash className="w-3.5 h-3.5 mr-1" /> Delete Selected ({selectedSlotIds.length})
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedSlotIds([])}
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Slots Table Card */}
      <Card>
        <CardHeader className="py-4 px-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Inventory Grid</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading slots...' : `${filteredSlots.length} active time slots found`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isError && (
            <div className="text-center py-8 text-red-500">Failed to load slots from server.</div>
          )}

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleToggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Resource / Linked Item</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Time Window</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Today's Bookings</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSlots.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                          <IconLayersIntersect className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                          No time slots found for the selected category. Click &quot;Generate Slot Grid&quot; to populate.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedSlots.map((slot) => {
                        const isSelected = selectedSlotIds.includes(slot._id)
                        const slotBookings = getSlotBookings(slot._id, slot.date, slot.isDaily)
                        const duration = slot.durationMinutes || (
                          timeToMinutes(slot.endTime) && timeToMinutes(slot.startTime)
                            ? (timeToMinutes(slot.endTime)! - timeToMinutes(slot.startTime)!)
                            : 60
                        )

                        return (
                          <TableRow
                            key={slot._id}
                            className={`transition-colors ${
                              isSelected ? 'bg-blue-50/70 dark:bg-blue-950/30' : 'hover:bg-muted/40'
                            }`}
                          >
                            <TableCell className="text-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleSelectSlot(slot._id)}
                                aria-label={`Select slot ${slot.startTime}`}
                              />
                            </TableCell>
                            <TableCell>{getResourceBadge(slot.resourceType)}</TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm">
                              {getLinkedResourceName(slot)}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="font-normal">
                                {formatSlotSchedule(slot.date, slot.isDaily)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-sm">
                              {formatTimeRange(slot.startTime, slot.endTime)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {duration}m
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {slot.remainingCapacity} / {slot.capacity}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  slot.remainingCapacity <= 0
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                }
                              >
                                {slot.remainingCapacity <= 0 ? 'Full' : 'Open'}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs">
                              {slotBookings.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  {slotBookings.map((b) => (
                                    <span key={b._id} className="font-medium">
                                      {getUserDisplayName(b.user)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                  onClick={() => handleOpenEdit(slot)}
                                  title="Edit Slot"
                                >
                                  <IconEdit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                                  onClick={() => setSlotToDelete(slot)}
                                  title="Delete Slot"
                                >
                                  <IconTrash className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredSlots.length)} of{' '}
                    {filteredSlots.length} slots
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={activePage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <Button
                          key={pageNum}
                          variant={activePage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 h-8 p-0 text-xs"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={activePage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Set Capacity Dialog */}
      <Dialog open={isBulkCapacityOpen} onOpenChange={setIsBulkCapacityOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconChecklist className="w-5 h-5 text-blue-600" />
              Bulk Set Slot Capacity
            </DialogTitle>
            <DialogDescription>
              Update total capacity for all {selectedSlotIds.length} selected slots at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                New Capacity Per Slot
              </label>
              <Input
                type="number"
                min={1}
                value={bulkCapacityValue}
                onChange={(e) => setBulkCapacityValue(parseInt(e.target.value, 10) || 1)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsBulkCapacityOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleApplyBulkCapacity}
                disabled={bulkUpdate.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {bulkUpdate.isPending ? 'Updating...' : `Apply to ${selectedSlotIds.length} Slots`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Universal Bulk Slot Generator Modal */}
      <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
        <DialogContent
          className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <IconSparkles className="w-5 h-5 text-indigo-600" />
              Universal Slot Generator
            </DialogTitle>
            <DialogDescription>
              Generate branch-scoped recurring or dated slots with custom durations (15–120 min) and overlap checking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-3">
            {/* Category and Branch Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Resource Domain
                </label>
                <Select
                  value={generatorData.resourceType}
                  onValueChange={(val) =>
                    setGeneratorData({ ...generatorData, resourceType: val as SlotResourceType, resourceId: null })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Branch / Location
                </label>
                <Select
                  value={generatorData.locationId || 'DEFAULT'}
                  onValueChange={(val) =>
                    setGeneratorData({ ...generatorData, locationId: val === 'DEFAULT' ? null : val })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Active Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEFAULT">Active Location ({locationScope?.selectedLocation?.name || 'Main'})</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc._id} value={loc._id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Optional Specific Resource */}
            {generatorData.resourceType === 'THERAPY' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Specific Therapy Item (Optional)
                </label>
                <Select
                  value={generatorData.resourceId || 'SHARED'}
                  onValueChange={(val) =>
                    setGeneratorData({ ...generatorData, resourceId: val === 'SHARED' ? null : val })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Shared Pool" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHARED">Shared Pool (No Dedicated Item)</SelectItem>
                    {therapies.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.time}m)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Shared pools allow multiple treatments concurrently without overlap conflicts.
                </p>
              </div>
            )}

            {/* Slot Duration Configuration */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Slot Duration
                </label>
                <span className="text-xs font-medium text-indigo-600">
                  {generatorData.customDuration ? `${generatorData.customDuration}m (Custom)` : `${generatorData.slotDurationMinutes} mins`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((dur) => (
                  <Button
                    key={dur}
                    type="button"
                    size="sm"
                    variant={
                      !generatorData.customDuration && generatorData.slotDurationMinutes === dur
                        ? 'default'
                        : 'outline'
                    }
                    className="h-8 px-3 text-xs"
                    onClick={() => setGeneratorData({ ...generatorData, slotDurationMinutes: dur, customDuration: '' })}
                  >
                    {dur}m
                  </Button>
                ))}
                <Input
                  type="number"
                  placeholder="Custom"
                  min={5}
                  max={480}
                  value={generatorData.customDuration}
                  onChange={(e) => setGeneratorData({ ...generatorData, customDuration: e.target.value })}
                  className="w-24 h-8 text-xs"
                />
              </div>
            </div>

            {/* Buffer and Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Buffer / Gap Between Slots
                </label>
                <div className="flex gap-1.5 mt-1">
                  {BUFFER_PRESETS.map((buf) => (
                    <Button
                      key={buf}
                      type="button"
                      size="sm"
                      variant={generatorData.bufferMinutes === buf ? 'secondary' : 'outline'}
                      className={`h-8 px-2.5 text-xs ${generatorData.bufferMinutes === buf ? 'border-primary' : ''}`}
                      onClick={() => setGeneratorData({ ...generatorData, bufferMinutes: buf })}
                    >
                      {buf === 0 ? 'None' : `${buf}m`}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Capacity Per Slot
                </label>
                <Input
                  type="number"
                  min={1}
                  value={generatorData.capacity}
                  onChange={(e) =>
                    setGeneratorData({ ...generatorData, capacity: parseInt(e.target.value, 10) || 1 })
                  }
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            {/* Shift Time Windows */}
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Operating Time Windows (Shift Splits)
                </label>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-indigo-600" onClick={handleAddWindow}>
                  <IconPlus className="w-3.5 h-3.5 mr-1" /> Add Window
                </Button>
              </div>

              {generatorData.windows.map((win, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      type="time"
                      value={win.startTime}
                      onChange={(e) => handleWindowChange(idx, 'startTime', e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                    <Input
                      type="time"
                      value={win.endTime}
                      onChange={(e) => handleWindowChange(idx, 'endTime', e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  {generatorData.windows.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveWindow(idx)}
                    >
                      <IconTrash className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Daily Recurring vs Specific Date Range */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generator-is-daily"
                  checked={generatorData.isDaily}
                  onCheckedChange={(checked) => setGeneratorData({ ...generatorData, isDaily: Boolean(checked) })}
                />
                <label htmlFor="generator-is-daily" className="text-sm font-medium cursor-pointer">
                  Daily Recurring Grid (Template for all days)
                </label>
              </div>

              {/* Overwrite Existing Grid Checkbox */}
              {generatorData.isDaily && (
                <div className="flex items-center space-x-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/50">
                  <Checkbox
                    id="generator-replace-existing"
                    checked={generatorData.replaceExisting}
                    onCheckedChange={(checked) =>
                      setGeneratorData({ ...generatorData, replaceExisting: Boolean(checked) })
                    }
                  />
                  <label
                    htmlFor="generator-replace-existing"
                    className="text-xs font-semibold cursor-pointer text-amber-900 dark:text-amber-300"
                  >
                    Replace / overwrite existing daily slots for this category & branch
                  </label>
                </div>
              )}

              {!generatorData.isDaily && (
                <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">From Date</label>
                      <Input
                        type="date"
                        value={generatorData.dateFrom}
                        onChange={(e) => setGeneratorData({ ...generatorData, dateFrom: e.target.value })}
                        className="h-8 text-xs bg-background mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">To Date</label>
                      <Input
                        type="date"
                        value={generatorData.dateTo}
                        onChange={(e) => setGeneratorData({ ...generatorData, dateTo: e.target.value })}
                        className="h-8 text-xs bg-background mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                      Days of Week
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS_OF_WEEK.map((d) => {
                        const isSelected = generatorData.daysOfWeek.includes(d.value)
                        return (
                          <Button
                            key={d.value}
                            type="button"
                            size="sm"
                            variant={isSelected ? 'default' : 'outline'}
                            className="h-7 px-2.5 text-xs"
                            onClick={() => handleToggleDayOfWeek(d.value)}
                          >
                            {d.label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Section */}
            {previewResult && (
              <div className="space-y-3 p-4 rounded-lg border bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold">
                      Preview: {previewResult.proposedCount ?? 0} Slots to Create
                    </span>
                  </div>
                  {previewResult.conflictCount ? (
                    <Badge variant="destructive" className="text-xs">
                      {previewResult.conflictCount} Conflicts Skipped
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 text-xs">
                      0 Conflicts
                    </Badge>
                  )}
                </div>

                {previewResult.preview && previewResult.preview.length > 0 && (
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                    {previewResult.preview.slice(0, 8).map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 bg-background rounded border">
                        <span className="font-medium">
                          {s.startTime} – {s.endTime}
                        </span>
                        <span className="text-muted-foreground">
                          {s.isDaily ? 'Daily' : s.date} | Cap: {s.capacity}
                        </span>
                      </div>
                    ))}
                    {previewResult.preview.length > 8 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        ...and {previewResult.preview.length - 8} more slots
                      </p>
                    )}
                  </div>
                )}

                {previewResult.conflicts && previewResult.conflicts.length > 0 && (
                  <div className="p-2 rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="flex items-center gap-1 font-semibold">
                      <IconAlertTriangle className="w-3.5 h-3.5" /> Overlap / Duplicate Conflicts:
                    </div>
                    {previewResult.conflicts.slice(0, 3).map((c, idx) => (
                      <div key={idx}>
                        • {c.startTime}–{c.endTime}: {c.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleRunPreview}
                disabled={isPreviewLoading || generateSlots.isPending}
              >
                {isPreviewLoading ? 'Calculating...' : 'Preview Grid & Conflicts'}
              </Button>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsDiscardGeneratorConfirmOpen(true)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCommitGeneration}
                  disabled={generateSlots.isPending || (previewResult !== null && previewResult.proposedCount === 0)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {generateSlots.isPending ? 'Generating...' : 'Confirm & Create Slots'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Slot Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          className="sm:max-w-[480px]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <IconEdit className="w-5 h-5 text-blue-600" />
              Edit Time Slot
            </DialogTitle>
            <DialogDescription>Modify time window, capacity, or schedule for this slot.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category
              </label>
              <Select
                value={editFormData.resourceType}
                onValueChange={(val) =>
                  setEditFormData({ ...editFormData, resourceType: val as SlotResourceType, resourceId: null })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional Specific Resource for Therapy */}
            {editFormData.resourceType === 'THERAPY' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Specific Therapy Item
                </label>
                <Select
                  value={editFormData.resourceId || 'SHARED'}
                  onValueChange={(val) =>
                    setEditFormData({ ...editFormData, resourceId: val === 'SHARED' ? null : val })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Shared Pool" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHARED">Shared Pool (No Dedicated Item)</SelectItem>
                    {therapies.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.time}m)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Start Time
                </label>
                <Input
                  type="time"
                  value={editFormData.startTime}
                  onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  End Time
                </label>
                <Input
                  type="time"
                  value={editFormData.endTime}
                  onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Capacity
                </label>
                <Input
                  type="number"
                  min={1}
                  value={editFormData.capacity}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      capacity: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Available (Remaining)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={editFormData.capacity}
                  value={editFormData.remainingCapacity}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      remainingCapacity: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="edit-is-daily"
                checked={editFormData.isDaily}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, isDaily: Boolean(checked) })
                }
              />
              <label htmlFor="edit-is-daily" className="text-sm font-medium cursor-pointer">
                Daily Recurring Template
              </label>
            </div>

            {!editFormData.isDaily && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Specific Date
                </label>
                <Input
                  type="date"
                  value={editFormData.date || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  className="mt-1"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setIsDiscardEditConfirmOpen(true)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateSlot.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateSlot.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Category Confirmation Dialog */}
      <AlertDialog open={isClearCategoryConfirmOpen} onOpenChange={setIsClearCategoryConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <IconAlertTriangle className="w-5 h-5 text-red-600" />
              Clear {activeTab} Grid?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all <span className="font-semibold text-foreground">{filteredSlots.length} slots</span> for{' '}
              <span className="font-semibold text-foreground">{activeTab}</span> at{' '}
              <span className="font-semibold text-foreground">{locationScope?.selectedLocation?.name || 'this branch'}</span>?
              <br /><br />
              This action will wipe the daily recurring grid for this category and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteClearCategoryGrid}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {bulkDelete.isPending ? 'Clearing...' : 'Yes, Clear All Slots'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Selected Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <IconTrash className="w-5 h-5 text-red-600" />
              Delete Selected Slots?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the{' '}
              <span className="font-semibold text-foreground">{selectedSlotIds.length} selected time slots</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {bulkDelete.isPending ? 'Deleting...' : `Delete ${selectedSlotIds.length} Slots`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Slot Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(slotToDelete)} onOpenChange={(open) => !open && setSlotToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <IconTrash className="w-5 h-5 text-red-600" />
              Delete Time Slot?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the{' '}
              <span className="font-semibold text-foreground">
                {slotToDelete?.startTime} – {slotToDelete?.endTime}
              </span>{' '}
              slot? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSlotToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteSingleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSlot.isPending ? 'Deleting...' : 'Delete Slot'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Generator Settings Confirmation Dialog */}
      <AlertDialog open={isDiscardGeneratorConfirmOpen} onOpenChange={setIsDiscardGeneratorConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <IconAlertTriangle className="w-5 h-5 text-amber-500" />
              Exit Slot Generator?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved slot generator configurations. Are you sure you want to exit, or stay and keep editing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDiscardGeneratorConfirmOpen(false)}>
              Stay & Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsDiscardGeneratorConfirmOpen(false)
                setIsGeneratorOpen(false)
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Discard & Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Edit Slot Confirmation Dialog */}
      <AlertDialog open={isDiscardEditConfirmOpen} onOpenChange={setIsDiscardEditConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <IconAlertTriangle className="w-5 h-5 text-amber-500" />
              Discard Changes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard your edits for this time slot?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDiscardEditConfirmOpen(false)}>
              Stay & Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsDiscardEditConfirmOpen(false)
                setIsEditDialogOpen(false)
                setEditingSlotId(null)
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Discard & Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
