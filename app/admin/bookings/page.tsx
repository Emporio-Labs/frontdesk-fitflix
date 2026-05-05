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
import { IconTrash, IconRefresh } from '@tabler/icons-react'
import { useBookings, useCreateBooking, useDeleteBooking, useChangeBookingStatus } from '@/hooks/use-bookings'
import { useSlots } from '@/hooks/use-slots'
import { useServices } from '@/hooks/use-services'
import { useTherapies } from '@/hooks/use-therapies'
import { useUsers } from '@/hooks/use-users'
import { useTopUpUserCredits, useUserCreditBalance } from '@/hooks/use-credits'
import { BOOKING_STATUS, BookingStatusValue } from '@/lib/services/booking.service'
import { cn, toUtcDateKey } from '@/lib/utils'
import { toast } from 'sonner'

type BookableMode = 'all' | 'services' | 'therapies'
type BookableKind = 'service' | 'therapy'

interface BookableItemOption {
  id: string
  name: string
  time: number
  creditCost: number
  slots: string[]
  kind: BookableKind
}

interface BookingWithNames {
  _id: string
  bookingDate: string
  status: BookingStatusValue
  user: string
  slot: string
  service: string
  creditCostSnapshot?: number
  creditsBypassed?: boolean
  report?: string
  createdAt: string
  updatedAt: string
  userName: string
  serviceName: string
}

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-blue-100 text-blue-800',
  1: 'bg-green-100 text-green-800',
  2: 'bg-red-100 text-red-800',
  3: 'bg-emerald-100 text-emerald-800',
  4: 'bg-gray-100 text-gray-800',
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

  const { data: bookings = [], isLoading, isError, refetch } = useBookings()
  const { data: slots = [] } = useSlots()
  const { data: services = [] } = useServices()
  const { data: therapies = [] } = useTherapies()
  const { data: users = [] } = useUsers()
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

    return [...serviceItems, ...therapyItems]
  }, [services, therapies])

  const visibleBookableItems = useMemo(() => {
    const byMode = allBookableItems.filter((item) => {
      if (mode === 'services') return item.kind === 'service'
      if (mode === 'therapies') return item.kind === 'therapy'
      return true
    })

    return byMode.sort((a, b) => a.name.localeCompare(b.name))
  }, [allBookableItems, mode])

  const selectedItem = useMemo(
    () => allBookableItems.find((item) => item.id === formData.serviceId),
    [allBookableItems, formData.serviceId]
  )

  const selectedSlotRefs = useMemo(
    () => selectedItem?.slots || [],
    [selectedItem]
  )

  const matchedSlots = useMemo(() => {
    if (!formData.bookingDate || !formData.serviceId || selectedSlotRefs.length === 0) {
      return [] as typeof slots
    }

    return slots
      .filter((slot) => {
        const matchesBookableSlots =
          selectedSlotRefs.includes(slot._id) ||
          (slot.parentTemplate ? selectedSlotRefs.includes(slot.parentTemplate) : false)

        if (!matchesBookableSlots) return false

        const slotDateKey = toUtcDateKey(slot.date)
        return slot.isDaily || slotDateKey === formData.bookingDate
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

  const memberships = userBalance?.memberships || []

  const userNameById = useMemo(
    () => new Map(users.map((user) => [user._id, user.name || user.username || user.email || 'Unknown User'])),
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

  const enrichedBookings = useMemo<BookingWithNames[]>(
    () =>
      bookings
        .map((booking) => ({
          ...booking,
          userName: userNameById.get(booking.user) || 'Unknown User',
          serviceName: itemNameById.get(booking.service) || 'Unknown Service',
        }))
        .sort((a, b) => {
          const aTime = new Date(a.bookingDate || a.createdAt).getTime()
          const bTime = new Date(b.bookingDate || b.createdAt).getTime()
          return bTime - aTime
        }),
    [bookings, userNameById, itemNameById]
  )

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

  const todayDateKey = getTodayDateKey()

  const todaysUpcomingBookings = useMemo(
    () =>
      enrichedBookings
        .filter((booking) => toUtcDateKey(booking.bookingDate) === todayDateKey)
        .filter((booking) => booking.status === 0 || booking.status === 1)
        .sort((a, b) => {
          const aStart = slotById.get(a.slot)?.startTime || '99:99'
          const bStart = slotById.get(b.slot)?.startTime || '99:99'
          return aStart.localeCompare(bStart)
        }),
    [enrichedBookings, todayDateKey, slotById]
  )

  const canCreateBooking =
    Boolean(formData.bookingDate && formData.userId && formData.slotId && formData.serviceId) &&
    !createBooking.isPending &&
    !isCheckingCredits &&
    !isLowCredit

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
      })
      setFormData((prev) => ({ ...prev, slotId: '' }))
    } catch {
      // Error states are handled by mutation hooks.
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

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Date-First Panel</CardTitle>
            <CardDescription>Set the day, member, and item before selecting a slot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Booking Day</label>
              <Input
                type="date"
                value={formData.bookingDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bookingDate: e.target.value,
                    slotId: '',
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Member (required first)</label>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select member</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.username} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Item Mode</label>
              <Select
                value={mode}
                onValueChange={(value) => {
                  setMode(value as BookableMode)
                  setFormData((prev) => ({ ...prev, serviceId: '', slotId: '' }))
                }}
                disabled={!formData.userId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Services + Therapies</SelectItem>
                  <SelectItem value="services">Services only</SelectItem>
                  <SelectItem value="therapies">Therapies only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bookable Item</label>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select service or therapy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select item</SelectItem>
                  {visibleBookableItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.creditCost} credit{item.creditCost === 1 ? '' : 's'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Show Full Slots</p>
                <p className="text-xs text-muted-foreground">Useful for availability auditing</p>
              </div>
              <Switch checked={showFullSlots} onCheckedChange={setShowFullSlots} />
            </div>

            <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
              <p>Day: {formatDateKey(formData.bookingDate)}</p>
              <p>Matched windows: {matchedSlots.length}</p>
              <p>Available now: {availableSlots.length}</p>
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
                  : 'Select a service or therapy to load matching slots'
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
                Choose a service or therapy in the left panel to view eligible windows.
              </div>
            ) : displayedSlots.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                No slot windows match this date and item. Adjust date, item, or enable full-slot view.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                        'rounded-lg border p-3 text-left transition-colors',
                        isSelected && 'border-primary bg-primary/5',
                        isFull && 'cursor-not-allowed border-muted bg-muted/40 opacity-70',
                        !isSelected && !isFull && 'hover:border-primary/40 hover:bg-accent/40'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{slot.startTime} to {slot.endTime}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {slot.isDaily || !slot.date
                              ? 'Daily template window'
                                : `Dated window: ${formatDateForDisplay(slot.date)}`}
                          </p>
                        </div>
                        <Badge variant={isFull ? 'secondary' : 'default'}>
                          {slot.remainingCapacity}/{slot.capacity}
                        </Badge>
                      </div>
                      {slot.parentTemplate ? (
                        <p className="text-[11px] text-muted-foreground mt-2">Template-linked inventory slot</p>
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
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Member</p>
              <p className="text-sm font-medium">
                {selectedUser ? `${selectedUser.username} (${selectedUser.email})` : 'No member selected'}
              </p>
            </div>

            <div className="rounded-md border p-3 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected Item</p>
              <p className="text-sm font-medium">
                {selectedItem
                  ? `${selectedItem.name} (${selectedItem.kind === 'therapy' ? 'Therapy' : 'Service'})`
                  : 'No item selected'}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedItem ? `${selectedItem.time} mins` : 'Select an item to calculate credit impact'}
              </p>
            </div>

            <div className="rounded-md border p-3 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected Slot</p>
              <p className="text-sm font-medium">
                {selectedSlot ? formatSlotWindowLabel(selectedSlot) : 'No slot selected'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current Credits</p>
                <p className="text-lg font-semibold">
                  {formData.userId
                    ? isUserBalanceLoading || isUserBalanceFetching
                      ? '...'
                      : hasBalance
                        ? currentCredits
                        : '-'
                    : '-'}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estimated Deduction</p>
                <p className="text-lg font-semibold">{estimatedCredits || '-'}</p>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Projected Remaining</p>
              <p className="text-lg font-semibold">
                {projectedCredits === null ? '-' : projectedCredits}
              </p>
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
                      <SelectItem value="__auto__">Auto (earliest eligible)</SelectItem>
                      {memberships.map((membership) => (
                        <SelectItem key={membership.id} value={membership.id}>
                          {membership.planName} ({membership.creditsRemaining} remaining)
                        </SelectItem>
                      ))}
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

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Bypass Credits</p>
                <p className="text-xs text-muted-foreground">Admin-only override for approved cases</p>
              </div>
              <Switch
                checked={formData.bypassCredits}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, bypassCredits: checked }))}
              />
            </div>

            <Button onClick={handleCreate} disabled={!canCreateBooking} className="w-full">
              {createBooking.isPending ? 'Booking spot...' : 'Create Spot Booking'}
            </Button>

            <p className="text-xs text-muted-foreground">
              If the last seat is taken during submit, the API returns conflict and slot availability refreshes automatically.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Input
            placeholder="Search by booking ID, user name, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
      </Card>

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
                  {todaysUpcomingBookings.map((booking) => {
                    const slot = slotById.get(booking.slot)
                    const timeLabel = slot ? `${slot.startTime} to ${slot.endTime}` : 'Time TBD'

                    return (
                      <TableRow key={`today-${booking._id}`}>
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
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `${filtered.length} bookings (newest first)`}</CardDescription>
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
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No bookings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((booking) => (
                      <TableRow key={booking._id}>
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
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteBooking.mutate(booking._id)}
                            disabled={deleteBooking.isPending}
                          >
                            <IconTrash className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
