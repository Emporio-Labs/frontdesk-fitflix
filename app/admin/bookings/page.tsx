'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { IconTrash, IconRefresh, IconCalendar } from '@tabler/icons-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useBookings, useCreateBooking, useDeleteBooking, useChangeBookingStatus } from '@/hooks/use-bookings'
import { useSlots } from '@/hooks/use-slots'
import { useServices } from '@/hooks/use-services'
import { useTherapies } from '@/hooks/use-therapies'
import { useGroupClasses } from '@/hooks/use-group-classes'
import { useUsers } from '@/hooks/use-users'
import { useMemberships } from '@/hooks/use-memberships'
import { useTopUpUserCredits, useUserCreditBalance } from '@/hooks/use-credits'
import { BOOKING_STATUS, BookingStatusValue, Booking } from '@/lib/services/booking.service'
import { cn, toUtcDateKey } from '@/lib/utils'
import { toast } from 'sonner'

type BookableMode = 'all' | 'services' | 'therapies' | 'group-classes'
type BookableKind = 'service' | 'therapy' | 'group-class'

interface BookableItemOption {
  id: string
  name: string
  time: number
  creditCost: number
  slots: string[]
  kind: BookableKind
}

interface BookingWithNames extends Booking {
  userName: string
  serviceName: string
}

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent whitespace-nowrap',
  1: 'bg-green-100 text-green-800 hover:bg-green-100 border-transparent whitespace-nowrap',
  2: 'bg-red-100 text-red-800 hover:bg-red-100 border-transparent whitespace-nowrap',
  3: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-transparent whitespace-nowrap',
  4: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-transparent whitespace-nowrap',
}


const UTC_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

function getTodayDateKey() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function toUtcStartOfDayIso(dateKey: string) {
  if (!dateKey) return ''

  const parsed = new Date(`${dateKey}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

function formatDateForDisplay(value?: string) {
  if (!value) return '-'

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : UTC_DATE_FORMATTER.format(parsed)
}

function formatDateKey(value: string) {
  if (!value) return '-'

  return formatDateForDisplay(`${value}T00:00:00.000Z`)
}

function formatSlotWindowLabel(slot: {
  date?: string
  isDaily?: boolean
  startTime: string
  endTime: string
  remainingCapacity: number
  capacity: number
}) {
  const scheduleLabel =
    slot.isDaily || !slot.date
      ? 'Daily'
      : (() => {
          const parsed = new Date(slot.date)
          return Number.isNaN(parsed.getTime()) ? 'Daily' : UTC_DATE_FORMATTER.format(parsed)
        })()

  return `${scheduleLabel} - ${slot.startTime} to ${slot.endTime} (${slot.remainingCapacity}/${slot.capacity})`
}

export default function BookingsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [mode, setMode] = useState<BookableMode>('all')
  const [showFullSlots, setShowFullSlots] = useState(false)
  const [showTopUp, setShowTopUp] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState(1)
  const [topUpMembershipId, setTopUpMembershipId] = useState('')
  const [formData, setFormData] = useState(() => ({
    bookingDate: '',
    userId: '',
    slotId: '',
    serviceId: '',
    bypassCredits: false,
  }))
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const itemsPerPage = 12

  const { data: bookings = [], isLoading, isError, refetch } = useBookings()
  const { data: slots = [] } = useSlots()
  const { data: services = [] } = useServices()
  const { data: therapies = [] } = useTherapies()
  const { data: groupClasses = [] } = useGroupClasses()
  const { data: users = [] } = useUsers()
  const { data: allMemberships = [] } = useMemberships()
  const {
    data: userBalance,
    isLoading: isUserBalanceLoading,
    isFetching: isUserBalanceFetching,
    refetch: refetchUserBalance,
  } = useUserCreditBalance(formData.userId, Boolean(formData.userId))
  const createBooking = useCreateBooking()
  const deleteBooking = useDeleteBooking()
  const changeStatus = useChangeBookingStatus()
  const topUpCredits = useTopUpUserCredits()

  useEffect(() => {
    setFormData((prev) => {
      if (prev.bookingDate) return prev
      return { ...prev, bookingDate: getTodayDateKey() }
    })
  }, [])

  const selectedUser = useMemo(
    () => users.find((user) => user._id === formData.userId),
    [users, formData.userId]
  )

  const allBookableItems = useMemo(() => {
    const serviceItems: BookableItemOption[] = services.map((service) => ({
      id: service.id,
      name: service.name,
      time: service.time,
      creditCost: service.creditCost,
      slots: service.slots,
      kind: 'service',
    }))

    const therapyItems: BookableItemOption[] = therapies.map((therapy) => ({
      id: therapy.id,
      name: therapy.name,
      time: therapy.time,
      creditCost: therapy.creditCost,
      slots: therapy.slots,
      kind: 'therapy',
    }))

    const groupClassItems: BookableItemOption[] = groupClasses.map((gc) => ({
      id: gc.id,
      name: gc.name,
      time: gc.durationMinutes,
      creditCost: gc.creditsRequired,
      slots: gc.slots || [],
      kind: 'group-class',
    }))

    return [...serviceItems, ...therapyItems, ...groupClassItems]
  }, [services, therapies, groupClasses])

  const visibleBookableItems = useMemo(() => {
    const byMode = allBookableItems.filter((item) => {
      if (mode === 'services') return item.kind === 'service'
      if (mode === 'therapies') return item.kind === 'therapy'
      if (mode === 'group-classes') return item.kind === 'group-class'
      return true
    })

    const uniqueMap = new Map<string, BookableItemOption>()
    for (const item of byMode) {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item)
      }
    }

    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [allBookableItems, mode])

  const selectedItem = useMemo(
    () => allBookableItems.find((item) => item.id === formData.serviceId),
    [allBookableItems, formData.serviceId]
  )

  const isGroupClassTooFarInAdvance = useMemo(() => {
    if (selectedItem?.kind !== 'group-class' || !formData.bookingDate) return false
    const today = new Date(getTodayDateKey() + 'T00:00:00.000Z')
    const bookingDate = new Date(formData.bookingDate + 'T00:00:00.000Z')
    const diffDays = Math.round((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    // Block bookings more than 3 days (72 hours) in advance
    return diffDays > 3
  }, [selectedItem, formData.bookingDate])

  const selectedSlotRefs = useMemo(
    () => selectedItem?.slots || [],
    [selectedItem]
  )

  const matchedSlots = useMemo(() => {
    if (!formData.bookingDate || !formData.serviceId || selectedSlotRefs.length === 0) {
      return [] as typeof slots
    }

    const rawMatches = slots
      .filter((slot) => {
        const matchesBookableSlots =
          selectedSlotRefs.includes(slot._id) ||
          (slot.parentTemplate ? selectedSlotRefs.includes(slot.parentTemplate) : false)

        if (!matchesBookableSlots) return false

        const slotDateKey = toUtcDateKey(slot.date)
        return slot.isDaily || slotDateKey === formData.bookingDate
      })

    const concreteTemplates = new Set(
      rawMatches.filter(s => !s.isDaily && s.parentTemplate).map(s => s.parentTemplate)
    )

    return rawMatches
      .filter(s => {
         if (s.isDaily && concreteTemplates.has(s._id)) return false;
         return true;
      })
      .sort((a, b) => {
        const startCompare = a.startTime.localeCompare(b.startTime)
        if (startCompare !== 0) return startCompare
        return a.endTime.localeCompare(b.endTime)
      })
  }, [formData.bookingDate, formData.serviceId, selectedSlotRefs, slots])

  const availableSlots = useMemo(
    () => matchedSlots.filter((slot) => slot.remainingCapacity > 0),
    [matchedSlots]
  )

  const displayedSlots = useMemo(
    () => (showFullSlots ? matchedSlots : availableSlots),
    [showFullSlots, matchedSlots, availableSlots]
  )

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot._id === formData.slotId),
    [slots, formData.slotId]
  )

  useEffect(() => {
    if (!formData.slotId) return

    const selectedStillVisible = displayedSlots.some((slot) => slot._id === formData.slotId)
    if (!selectedStillVisible) {
      setFormData((prev) => ({ ...prev, slotId: '' }))
    }
  }, [displayedSlots, formData.slotId])

  const estimatedCredits = selectedItem?.creditCost ?? 0
  const currentCredits = userBalance?.totalRemaining ?? 0
  const hasBalance = typeof userBalance?.totalRemaining === 'number'
  const creditShortfall = hasBalance ? Math.max(0, estimatedCredits - currentCredits) : 0
  const projectedCredits = hasBalance ? currentCredits - estimatedCredits : null
  const isLowCredit = Boolean(
    formData.userId &&
      selectedItem &&
      !formData.bypassCredits &&
      hasBalance &&
      creditShortfall > 0
  )
  const isCheckingCredits = Boolean(
    formData.userId &&
      selectedItem &&
      !formData.bypassCredits &&
      !hasBalance &&
      (isUserBalanceLoading || isUserBalanceFetching)
  )

  // Active memberships from the credit ledger (accurate remaining counts for the balance panel).
  const memberships = userBalance?.memberships || []

  // ALL memberships for the selected user (including future ones), used in the top-up
  // target dropdown so admins can explicitly credit a not-yet-active bucket.
  const allUserMemberships = useMemo(
    () => allMemberships.filter((m) => m.userId === formData.userId),
    [allMemberships, formData.userId]
  )

  const userNameById = useMemo(
    () => new Map(users.map((user) => [user._id, user.username || user.email || 'Unknown User'])),
    [users]
  )

  const itemNameById = useMemo(
    () =>
      new Map([
        ...services.map((service) => [service.id, service.name] as const),
        ...therapies.map((therapy) => [therapy.id, therapy.name] as const),
      ]),
    [services, therapies]
  )

  const slotById = useMemo(() => new Map(slots.map((slot) => [slot._id, slot] as const)), [slots])

  const enrichedBookings = useMemo<BookingWithNames[]>(() => {
    const seen = new Set<string>()
    const uniqueBookings = bookings.filter((b) => {
      if (seen.has(b._id)) return false
      seen.add(b._id)
      return true
    })

    return uniqueBookings
      .map((booking) => ({
        ...booking,
        userName:
          booking.user?.username ||
          userNameById.get(booking.user?._id ?? '') ||
          'Unknown User',
        serviceName:
          booking.service?.serviceName ||
          itemNameById.get(booking.service?._id ?? '') ||
          'Unknown Service',
      }))
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || a.bookingDate).getTime()
        const bTime = new Date(b.createdAt || b.bookingDate).getTime()
        return bTime - aTime
      })
  }, [bookings, userNameById, itemNameById])

  const filtered = useMemo(
    () =>
      enrichedBookings.filter((booking) => {
        const query = searchTerm.toLowerCase()
        return (
          booking._id.toLowerCase().includes(query) ||
          booking.userName.toLowerCase().includes(query) ||
          booking.serviceName.toLowerCase().includes(query)
        )
      }),
    [enrichedBookings, searchTerm]
  )

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const activePage = Math.max(1, Math.min(currentPage, totalPages || 1))
  const startIndex = (activePage - 1) * itemsPerPage
  const paginatedBookings = filtered.slice(startIndex, startIndex + itemsPerPage)

  const todayDateKey = getTodayDateKey()

  const todaysUpcomingBookings = useMemo(
    () =>
      enrichedBookings
        .filter((booking) => toUtcDateKey(booking.bookingDate) === todayDateKey)
        .filter((booking) => Number(booking.status) === 0 || Number(booking.status) === 1)
        .sort((a, b) => {
          const aStart =
            a.slot?.startTime ?? slotById.get(a.slot?._id ?? '')?.startTime ?? '99:99'
          const bStart =
            b.slot?.startTime ?? slotById.get(b.slot?._id ?? '')?.startTime ?? '99:99'
          return aStart.localeCompare(bStart)
        }),
    [enrichedBookings, todayDateKey, slotById]
  )

  const selectedDate = useMemo(() => {
    if (!formData.bookingDate) return undefined
    const parsed = new Date(`${formData.bookingDate}T00:00:00.000Z`)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }, [formData.bookingDate])

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    const dateKey = localDate.toISOString().slice(0, 10)
    setFormData((prev) => ({
      ...prev,
      bookingDate: dateKey,
      slotId: '',
    }))
  }

  const canCreateBooking =
    Boolean(formData.bookingDate && formData.userId && formData.slotId && formData.serviceId) &&
    !createBooking.isPending &&
    !isCheckingCredits &&
    !isLowCredit &&
    !isGroupClassTooFarInAdvance

  const handleRefreshBoard = async () => {
    await refetch()
    if (formData.userId) {
      await refetchUserBalance()
    }
  }

  const handleOpenTopUp = () => {
    setShowTopUp(true)
    setTopUpAmount(Math.max(1, creditShortfall || estimatedCredits || 1))
  }

  const handleTopUp = async () => {
    if (!formData.userId) {
      toast.error('Select a member before topping up credits.')
      return
    }

    if (!Number.isFinite(topUpAmount) || topUpAmount <= 0) {
      toast.error('Top-up amount must be greater than 0.')
      return
    }

    await topUpCredits.mutateAsync({
      userId: formData.userId,
      payload: {
        amount: topUpAmount,
        membershipId: topUpMembershipId || undefined,
        reason: selectedItem
          ? `Spot booking top-up for ${selectedItem.name}`
          : 'Spot booking top-up',
      },
    })

    setShowTopUp(false)
    setTopUpAmount(1)
  }

  const handleCreate = async () => {
    if (!formData.bookingDate || !formData.userId || !formData.slotId || !formData.serviceId) {
      toast.error('Select date, member, item, and slot before creating a booking.')
      return
    }

    const bookingDateIso = toUtcStartOfDayIso(formData.bookingDate)
    if (!bookingDateIso) {
      toast.error('Invalid booking date selected.')
      return
    }

    if (isGroupClassTooFarInAdvance) {
      toast.error('Group classes can only be booked up to 3 days in advance.')
      return
    }

    const selectedSlot = slots.find((slot) => slot._id === formData.slotId)
    if (selectedSlot && selectedSlot.remainingCapacity <= 0) {
      toast.error('Selected slot is already full. Please choose another slot.')
      return
    }

    if (isLowCredit) {
      toast.error('Not enough credits for this booking. Top up or enable bypass credits.')
      return
    }

    try {
      await createBooking.mutateAsync({
        bookingDate: bookingDateIso,
        userId: formData.userId,
        slotId: formData.slotId,
        serviceId: formData.serviceId,
        bypassCredits: formData.bypassCredits,
        // Admins always bypass the backend booking-window check so they can
        // make spot bookings for any date the slot is scheduled on.
        bypassBookingWindow: true,
      })
      setFormData((prev) => ({ ...prev, slotId: '' }))
    } catch {
      // Error states are handled by mutation hooks.
    }
  }

  const handleDeleteBooking = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this booking? Credits will be refunded.')) return
    setDeletingId(id)
    try {
      await deleteBooking.mutateAsync(id)
    } catch {
      // Error toast handled by mutation hook
    } finally {
      setDeletingId(null)
    }
  }

  const handleStatusChange = (id: string, status: string) => {
    changeStatus.mutate({ id, status: Number(status) as BookingStatusValue })
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">Spot-booking desk and scheduling board with credit-aware actions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshBoard}>
            <IconRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)_340px] items-start w-full">
        <Card>
          <CardHeader>
            <CardTitle>Date-First Panel</CardTitle>
            <CardDescription>Set the day, member, and item before selecting a slot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 border border-border rounded-lg overflow-hidden bg-background shadow-sm">
              <div className="p-3 space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Booking Day</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 bg-transparent border-0 shadow-none p-0 text-xs hover:bg-transparent focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none",
                        !formData.bookingDate && "text-muted-foreground"
                      )}
                    >
                      <IconCalendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {formData.bookingDate ? (
                        formatDateKey(formData.bookingDate)
                      ) : (
                        <span className="text-muted-foreground">Pick date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="p-3 border-l border-border space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Member</label>
                <Select
                  value={formData.userId || '__none__'}
                  onValueChange={(value) => {
                    const nextUserId = value === '__none__' ? '' : value
                    setFormData((prev) => ({
                      ...prev,
                      userId: nextUserId,
                      serviceId: '',
                      slotId: '',
                      bypassCredits: false,
                    }))
                    setTopUpMembershipId('')
                    setShowTopUp(false)
                  }}
                >
                  <SelectTrigger className="h-8 pl-0 pr-6 text-xs border-0 shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none bg-transparent hover:bg-transparent [&>span]:truncate w-full">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select member</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user._id} value={user._id}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 border border-border rounded-lg overflow-hidden bg-background shadow-sm">
              <div className="p-3 space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Item Mode</label>
                <Select
                  value={mode}
                  onValueChange={(value) => {
                    setMode(value as BookableMode)
                    setFormData((prev) => ({ ...prev, serviceId: '', slotId: '' }))
                  }}
                  disabled={!formData.userId}
                >
                  <SelectTrigger className="h-8 pl-0 pr-6 text-xs border-0 shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none bg-transparent hover:bg-transparent [&>span]:truncate w-full disabled:opacity-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="therapies">Therapies</SelectItem>
                    <SelectItem value="group-classes">Group Classes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 border-l border-border space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Bookable Item</label>
                <Select
                  value={formData.serviceId || '__none__'}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      serviceId: value === '__none__' ? '' : value,
                      slotId: '',
                    }))
                  }
                  disabled={!formData.userId || visibleBookableItems.length === 0}
                >
                  <SelectTrigger className="h-8 pl-0 pr-6 text-xs border-0 shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none bg-transparent hover:bg-transparent [&>span]:truncate w-full disabled:opacity-50">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select item</SelectItem>
                    {visibleBookableItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.creditCost} cr)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-2 px-3 text-xs bg-muted/5">
              <span className="font-semibold text-muted-foreground">Show Full Slots</span>
              <Switch checked={showFullSlots} onCheckedChange={setShowFullSlots} className="scale-90" />
            </div>

            <div className="rounded-md border p-2.5 px-3 text-xs text-muted-foreground space-y-1 bg-muted/10">
              <div className="flex justify-between border-b pb-1 last:border-0 last:pb-0">
                <span>Day</span>
                <span className="font-medium text-foreground">{formatDateKey(formData.bookingDate)}</span>
              </div>
              <div className="flex justify-between border-b pb-1 last:border-0 last:pb-0">
                <span>Matched Windows</span>
                <span className="font-medium text-foreground">{matchedSlots.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Available Now</span>
                <span className="font-medium text-foreground">{availableSlots.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduling Board</CardTitle>
            <CardDescription>
              {formData.userId
                ? selectedItem
                  ? `Choose a slot for ${selectedItem.name} on ${formatDateKey(formData.bookingDate)}`
                  : 'Select a service, therapy, or group class to load matching slots'
                : 'Select a member first to start spot booking'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!formData.userId ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Pick a member in the left panel. Spot booking requires explicit member selection first.
              </div>
            ) : !formData.serviceId ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Choose a service, therapy, or group class in the left panel to view eligible windows.
              </div>
            ) : isGroupClassTooFarInAdvance ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-amber-600 dark:text-amber-500">
                Group classes can only be booked up to 3 days in advance. Please select an earlier date.
              </div>
            ) : displayedSlots.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                No slot windows match this date and item. Adjust date, item, or enable full-slot view.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                {displayedSlots.map((slot) => {
                  const isSelected = formData.slotId === slot._id
                  const isFull = slot.remainingCapacity <= 0

                  return (
                    <button
                      key={slot._id}
                      type="button"
                      disabled={isFull}
                      onClick={() => setFormData((prev) => ({ ...prev, slotId: slot._id }))}
                      className={cn(
                        'rounded-lg border p-3 text-left transition-colors w-full',
                        isSelected && 'border-primary bg-primary/5',
                        isFull && 'cursor-not-allowed border-muted bg-muted/40 opacity-70',
                        !isSelected && !isFull && 'hover:border-primary/40 hover:bg-accent/40'
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span className="font-semibold text-sm whitespace-nowrap">{slot.startTime} to {slot.endTime}</span>
                          <Badge variant={isFull ? 'secondary' : 'default'} className="text-[10px] h-5 px-1.5 shrink-0">
                            {slot.remainingCapacity}/{slot.capacity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {slot.isDaily || !slot.date
                            ? 'Daily template window'
                              : `Dated window: ${formatDateForDisplay(slot.date)}`}
                        </p>
                      </div>
                      {slot.parentTemplate ? (
                        <p className="text-[11px] text-muted-foreground mt-1.5">Template-linked inventory slot</p>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credit Impact Drawer</CardTitle>
            <CardDescription>Review balance impact before confirming the spot booking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-2.5 space-y-2 bg-muted/20 text-xs">
              <div className="flex justify-between items-start gap-2 border-b pb-1.5 last:border-b-0 last:pb-0">
                <span className="text-muted-foreground font-medium shrink-0">Member</span>
                <span className="font-semibold text-right truncate">
                  {selectedUser ? `${selectedUser.username}` : 'None selected'}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2 border-b pb-1.5 last:border-b-0 last:pb-0">
                <span className="text-muted-foreground font-medium shrink-0">Item</span>
                <span className="font-semibold text-right truncate">
                  {selectedItem ? `${selectedItem.name} (${selectedItem.time}m)` : 'None selected'}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-muted-foreground font-medium shrink-0">Slot</span>
                <span className="font-semibold text-right truncate" title={selectedSlot ? formatSlotWindowLabel(selectedSlot) : undefined}>
                  {selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : 'None selected'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-md border p-2 text-center bg-muted/10">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current</p>
                <p className="text-sm font-semibold mt-0.5">
                  {formData.userId
                    ? isUserBalanceLoading || isUserBalanceFetching
                      ? '...'
                      : hasBalance
                        ? currentCredits
                        : '-'
                    : '-'}
                </p>
              </div>
              <div className="rounded-md border p-2 text-center bg-muted/10">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Deduct</p>
                <p className="text-sm font-semibold mt-0.5">{estimatedCredits || '-'}</p>
              </div>
              <div className="rounded-md border p-2 text-center bg-primary/5 border-primary/20">
                <p className="text-[10px] uppercase tracking-wide text-primary">Projected</p>
                <p className="text-sm font-semibold mt-0.5 text-primary">
                  {projectedCredits === null ? '-' : projectedCredits}
                </p>
              </div>
            </div>

            {isLowCredit ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
                <p className="text-sm font-medium text-amber-900">Low credit balance</p>
                <p className="text-xs text-amber-900/80">
                  This member is short by {creditShortfall} credit{creditShortfall === 1 ? '' : 's'} for this booking.
                </p>
                <Button size="sm" variant="outline" onClick={handleOpenTopUp}>
                  Top up now
                </Button>
              </div>
            ) : null}

            {showTopUp ? (
              <div className="rounded-md border p-3 space-y-3">
                <p className="text-sm font-medium">Admin Top-Up</p>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Amount</label>
                  <Input
                    type="number"
                    min={1}
                    value={topUpAmount}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10)
                      if (Number.isNaN(parsed)) {
                        setTopUpAmount(1)
                        return
                      }
                      setTopUpAmount(Math.max(1, parsed))
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Membership target</label>
                  <Select
                    value={topUpMembershipId || '__auto__'}
                    onValueChange={(value) => setTopUpMembershipId(value === '__auto__' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto__">Auto (earliest eligible active)</SelectItem>
                      {allUserMemberships.map((membership) => {
                        const now = new Date()
                        const start = membership.startDate ? new Date(membership.startDate) : null
                        const isFuture = start && start > now
                        const statusLabel = isFuture
                          ? `Future – starts ${start.toLocaleDateString()}`
                          : membership.status !== 'Active'
                            ? membership.status
                            : null
                        return (
                          <SelectItem key={membership.id} value={membership.id}>
                            {membership.planName}
                            {statusLabel ? ` [${statusLabel}]` : ''}
                            {' '}({membership.creditsRemaining} credits)
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleTopUp}
                    disabled={topUpCredits.isPending || !formData.userId}
                  >
                    {topUpCredits.isPending ? 'Applying...' : 'Apply Top-Up'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowTopUp(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-md border p-2 px-3 text-xs">
              <span className="font-medium text-muted-foreground">Bypass Credits Override</span>
              <Switch
                checked={formData.bypassCredits}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, bypassCredits: checked }))}
                className="scale-90"
              />
            </div>

            <Button onClick={handleCreate} disabled={!canCreateBooking} className="w-full">
              {createBooking.isPending ? 'Booking spot...' : 'Create Spot Booking'}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center leading-tight">
              If the last seat is taken during submit, slot availability refreshes automatically.
            </p>
          </CardContent>
        </Card>
      </div>



      <Card>
        <CardHeader>
          <CardTitle>Today's Upcoming Bookings</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${todaysUpcomingBookings.length} upcoming for ${formatDateKey(todayDateKey)}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : todaysUpcomingBookings.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">No upcoming bookings for today.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaysUpcomingBookings.map((booking, index) => {
                    const slot =
                      booking.slot?.startTime && booking.slot?.endTime
                        ? booking.slot
                        : slotById.get(booking.slot?._id ?? '')
                    const timeLabel =
                      slot?.startTime && slot?.endTime
                        ? `${slot.startTime} to ${slot.endTime}`
                        : 'Time TBD'

                    return (
                      <TableRow key={`today-${booking._id}-${index}`}>
                        <TableCell>{timeLabel}</TableCell>
                        <TableCell className="font-medium text-sm">{booking.userName}</TableCell>
                        <TableCell className="text-sm">{booking.serviceName}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[booking.status as number] || 'bg-gray-100 text-gray-800'}>
                            {BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS] ?? booking.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>All Bookings</CardTitle>
            <CardDescription>{isLoading ? 'Loading...' : `${filtered.length} bookings (newest first)`}</CardDescription>
          </div>
          <Input
            placeholder="Search by booking ID, user name, or service..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          {isError && (
            <div className="text-center py-8 text-red-500">
              Failed to load bookings. Check credentials and API connectivity.
            </div>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Change Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No bookings found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedBookings.map((booking, index) => (
                        <TableRow key={`${booking._id}-${index}`}>
                          <TableCell className="font-mono text-xs">{booking._id.slice(-6)}</TableCell>
                          <TableCell className="font-medium text-sm">{booking.userName}</TableCell>
                          <TableCell className="text-sm">{booking.serviceName}</TableCell>
                          <TableCell>{formatDateForDisplay(booking.bookingDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs">
                                {typeof booking.creditCostSnapshot === 'number'
                                  ? `${booking.creditCostSnapshot} cr`
                                  : '-'}
                              </span>
                              {booking.creditsBypassed ? (
                                <Badge variant="outline" className="text-[10px]">
                                  Bypassed
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[booking.status as number] || 'bg-gray-100 text-gray-800'}>
                              {BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS] ?? booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select onValueChange={(v) => handleStatusChange(booking._id, v)}>
                              <SelectTrigger className="w-36 h-8 text-xs">
                                <SelectValue placeholder="Change status" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(BOOKING_STATUS).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right py-2 pr-6">
                            <div className="flex justify-end items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                onClick={() => handleDeleteBooking(booking._id)}
                                disabled={deletingId === booking._id}
                                title="Delete Booking"
                              >
                                <IconTrash className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} bookings
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={activePage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={activePage === page ? 'default' : 'outline'}
                        size="sm"
                        className="w-9 h-9 p-0 font-medium"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={activePage === totalPages}
                    >
                      Next page
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
