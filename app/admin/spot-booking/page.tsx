'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { IconCalendar, IconCheck, IconClock, IconUser, IconLayersLinked } from '@tabler/icons-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSlots } from '@/hooks/use-slots'
import { useServices } from '@/hooks/use-services'
import { useTherapies } from '@/hooks/use-therapies'
import { useUsers } from '@/hooks/use-users'
import { useMemberships } from '@/hooks/use-memberships'
import { useTopUpUserCredits, useUserCreditBalance } from '@/hooks/use-credits'
import { useCreateBooking } from '@/hooks/use-bookings'
import { cn, toUtcDateKey } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

type BookableMode = 'all' | 'services' | 'therapies'
type BookableKind = 'service' | 'therapy'

interface BookableItemOption {
  id: string
  name: string
  time: number
  creditCost: number
  slots: string[]
  kind: BookableKind
  isPaused?: boolean
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

export default function SpotBookingPage() {
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

  const { data: slots = [] } = useSlots()
  const { data: services = [] } = useServices()
  const { data: therapies = [] } = useTherapies()
  const { data: users = [] } = useUsers()
  const { data: allMemberships = [] } = useMemberships()

  const {
    data: userBalance,
    isLoading: isUserBalanceLoading,
    isFetching: isUserBalanceFetching,
  } = useUserCreditBalance(formData.userId, Boolean(formData.userId))

  const createBooking = useCreateBooking()
  const topUpCredits = useTopUpUserCredits()

  useEffect(() => {
    setFormData((prev) => {
      if (prev.bookingDate) return prev
      return { ...prev, bookingDate: getTodayDateKey() }
    })
  }, [])

  const selectedDate = useMemo(() => {
    if (!formData.bookingDate) return undefined
    const parsed = new Date(`${formData.bookingDate}T00:00:00.000Z`)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }, [formData.bookingDate])

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    const nextKey = local.toISOString().slice(0, 10)
    setFormData((prev) => ({
      ...prev,
      bookingDate: nextKey,
      slotId: '',
    }))
  }

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
      isPaused: therapy.isPaused,
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

  const allUserMemberships = useMemo(
    () => allMemberships.filter((m) => m.userId === formData.userId),
    [allMemberships, formData.userId]
  )

  const canCreateBooking = Boolean(
    formData.bookingDate &&
      formData.userId &&
      formData.slotId &&
      formData.serviceId &&
      (!isLowCredit || formData.bypassCredits) &&
      !createBooking.isPending
  )

  // Step state calculations for the 5-step progress header
  const currentStep = useMemo(() => {
    if (!formData.bookingDate) return 1
    if (!formData.userId) return 2
    if (!formData.serviceId) return 3
    if (!formData.slotId) return 4
    return 5
  }, [formData.bookingDate, formData.userId, formData.serviceId, formData.slotId])

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

    const slot = slots.find((s) => s._id === formData.slotId)
    if (slot && slot.remainingCapacity <= 0) {
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
      toast.success('Spot booking created successfully!')
      setFormData((prev) => ({ ...prev, slotId: '' }))
    } catch {
      // Error handled by mutation hook
    }
  }

  const steps = [
    { number: 1, label: 'Select Date' },
    { number: 2, label: 'Select Member' },
    { number: 3, label: 'Select Item' },
    { number: 4, label: 'Select Slot' },
    { number: 5, label: 'Review & Confirm' },
  ]

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Spot Booking</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Create a new booking for a member with credit-aware actions
        </p>
      </div>

      {/* 5-Step Visual Stepper Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {steps.map((step, idx) => {
            const isCompleted = currentStep > step.number
            const isCurrent = currentStep === step.number

            return (
              <div key={step.number} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 shrink-0',
                      isCurrent && 'bg-slate-900 text-white shadow-xs ring-4 ring-slate-100',
                      isCompleted && 'bg-slate-900 text-white',
                      !isCurrent && !isCompleted && 'bg-slate-100 text-slate-400 border border-slate-200'
                    )}
                  >
                    {isCompleted ? <IconCheck className="w-3.5 h-3.5" /> : step.number}
                  </div>
                  <span
                    className={cn(
                      'text-xs whitespace-nowrap font-medium transition-colors',
                      isCurrent ? 'text-slate-900 font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 mx-3 sm:mx-4 transition-colors',
                      currentStep > step.number ? 'bg-slate-900' : 'bg-slate-200'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 3-Column Booking Layout */}
      <div className="grid gap-5 lg:grid-cols-12 items-start w-full">
        {/* Column 1: Date & Member Selection */}
        <Card className="lg:col-span-4 bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-800">
              1. Select Date & Member
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Booking Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Booking Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-between text-left font-normal h-9 bg-white border-slate-200 text-xs hover:bg-slate-50',
                      !formData.bookingDate && 'text-slate-400'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <IconCalendar className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{formData.bookingDate ? formatDateKey(formData.bookingDate) : 'Pick a date'}</span>
                    </div>
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

            {/* Member */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Member</label>
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
                <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                  <SelectValue placeholder="Select member..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="__none__">Select member...</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.username || user.email || 'Unnamed Member'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Separator / Item Details */}
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Item Details</h4>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Item Mode</label>
                  <Select
                    value={mode}
                    onValueChange={(value) => {
                      setMode(value as BookableMode)
                      setFormData((prev) => ({ ...prev, serviceId: '', slotId: '' }))
                    }}
                    disabled={!formData.userId}
                  >
                    <SelectTrigger className="h-9 text-xs border-slate-200 bg-white disabled:opacity-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="therapies">Therapies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Bookable Item / Service</label>
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
                    <SelectTrigger className="h-9 text-xs border-slate-200 bg-white disabled:opacity-50">
                      <SelectValue placeholder="Select item..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="__none__">Select item...</SelectItem>
                      {visibleBookableItems.map((item) => (
                        <SelectItem key={item.id} value={item.id} disabled={item.isPaused}>
                          {item.name} ({item.creditCost} cr){item.isPaused ? ' · Paused' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Show Full Slots toggle */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-2.5 px-3 text-xs bg-slate-50/50 mt-3">
              <span className="font-medium text-slate-600">Show Full Slots</span>
              <Switch checked={showFullSlots} onCheckedChange={setShowFullSlots} className="scale-90" />
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Available Slots */}
        <Card className="lg:col-span-5 bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-800">
              2. Available Slots
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Select a time slot to create the booking
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {!formData.userId ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                Pick a member in the left panel. Spot booking requires explicit member selection first.
              </div>
            ) : !formData.serviceId ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                Choose a service or therapy in the left panel to view eligible windows.
              </div>
            ) : displayedSlots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                No slot windows match this date and item. Adjust date, item, or toggle full-slot view.
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
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
                        'rounded-xl border p-3 text-left transition-all w-full relative',
                        isSelected && 'border-slate-900 bg-slate-100/70 ring-2 ring-slate-900/10 shadow-xs',
                        isFull && 'cursor-not-allowed border-slate-100 bg-slate-50/60 opacity-60',
                        !isSelected && !isFull && 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-slate-800 tracking-tight">
                          {slot.startTime} to {slot.endTime}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] h-5 px-1.5 font-bold rounded-full',
                            isFull ? 'bg-slate-100 text-slate-500' : 'bg-slate-900 text-white'
                          )}
                        >
                          {slot.remainingCapacity}/{slot.capacity}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {slot.isDaily || !slot.date
                          ? 'Daily template window'
                          : `Dated window: ${formatDateForDisplay(slot.date)}`}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column 3: Credit Impact Preview */}
        <Card className="lg:col-span-3 bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-800">
              3. Credit Impact Preview
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Review the credit impact before confirming
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Selected Summary */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2 text-xs">
              <div className="flex justify-between items-start gap-2 border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500 font-medium shrink-0">Member</span>
                <span className="font-semibold text-slate-800 text-right truncate">
                  {selectedUser ? selectedUser.username || selectedUser.email : 'None selected'}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2 border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500 font-medium shrink-0">Item</span>
                <span className="font-semibold text-slate-800 text-right truncate">
                  {selectedItem ? `${selectedItem.name} (${selectedItem.time}m)` : 'None selected'}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 font-medium shrink-0">Slot</span>
                <span className="font-semibold text-slate-800 text-right truncate">
                  {selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : 'None selected'}
                </span>
              </div>
            </div>

            {/* Credit Ledger Boxes */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg border border-slate-200 p-2 bg-slate-50/50">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {formData.userId
                    ? isUserBalanceLoading || isUserBalanceFetching
                      ? '...'
                      : hasBalance
                        ? currentCredits
                        : '-'
                    : '-'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-2 bg-slate-50/50">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Deduct</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {estimatedCredits || '-'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-900/20 p-2 bg-slate-100/60">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-900">Projected</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {projectedCredits === null ? '-' : projectedCredits}
                </p>
              </div>
            </div>

            {/* Low Credit Warning */}
            {isLowCredit && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-900">Low credit balance</p>
                <p className="text-[11px] text-amber-800 leading-tight">
                  This member is short by {creditShortfall} credit{creditShortfall === 1 ? '' : 's'}.
                </p>
                <Button size="sm" variant="outline" className="w-full text-xs h-7 border-amber-300 bg-white hover:bg-amber-50" onClick={() => setShowTopUp(true)}>
                  Top up now
                </Button>
              </div>
            )}

            {/* Admin Top-Up Drawer */}
            {showTopUp && (
              <div className="rounded-lg border border-slate-200 p-3 space-y-3 bg-white">
                <p className="text-xs font-bold text-slate-800">Admin Top-Up</p>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Amount</label>
                  <Input
                    type="number"
                    min={1}
                    value={topUpAmount}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10)
                      setTopUpAmount(Number.isNaN(parsed) ? 1 : Math.max(1, parsed))
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8 bg-slate-900 hover:bg-slate-800 text-white"
                    onClick={handleTopUp}
                    disabled={topUpCredits.isPending}
                  >
                    {topUpCredits.isPending ? 'Applying...' : 'Apply'}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowTopUp(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Bypass Credits Switch */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 px-3 text-xs bg-white">
              <span className="font-medium text-slate-600">Bypass Credits Override</span>
              <Switch
                checked={formData.bypassCredits}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, bypassCredits: checked }))}
                className="scale-90"
              />
            </div>

            {/* Action Submit Button */}
            <Button
              onClick={handleCreate}
              disabled={!canCreateBooking}
              className="w-full h-10 font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs disabled:opacity-50"
            >
              {createBooking.isPending ? 'Booking spot...' : 'Create Spot Booking'}
            </Button>

            <p className="text-[11px] text-slate-400 text-center leading-tight">
              If the last seat is taken during submit, slot availability refreshes automatically.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
