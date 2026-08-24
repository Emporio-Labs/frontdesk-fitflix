'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconSearch,
  IconCalendarEvent,
  IconClock,
  IconCoins,
  IconRefresh,
  IconClipboardText,
  IconVideo,
  IconCheck,
  IconX,
  IconCopy,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { useGroupClassBookings } from '@/hooks/use-group-class-bookings'
import { useGroupClasses } from '@/hooks/use-group-classes'
import { GroupClassBooking, groupClassBookingService } from '@/lib/services/group-class-booking.service'
import type { GroupClass } from '@/lib/services/group-class.service'
import { BookingDetailsDialog } from '@/components/bookings/booking-details-dialog'
import { CancelBookingDialog } from '@/components/bookings/cancel-booking-dialog'
import { RescheduleBookingDialog } from '@/components/bookings/reschedule-booking-dialog'
import { cn } from '@/lib/utils'
import { queryKeys } from '@/lib/query-keys'

// Status Badge styling helper
const STATUS_COLORS: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent dark:bg-blue-900/30 dark:text-blue-300',
  pending: 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-transparent dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-green-100 text-green-800 hover:bg-green-100 border-transparent dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-transparent dark:bg-emerald-900/30 dark:text-emerald-300',
  attended: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-transparent dark:bg-emerald-900/30 dark:text-emerald-300',
  consumed: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-transparent dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-800 hover:bg-red-100 border-transparent dark:bg-red-900/30 dark:text-red-300',
  noshow: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-transparent dark:bg-gray-800/30 dark:text-gray-300',
  'no-show': 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-transparent dark:bg-gray-800/30 dark:text-gray-300',
  unattended: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-transparent dark:bg-gray-800/30 dark:text-gray-300',
}

const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  attended: 'Completed',
  consumed: 'Completed',
  cancelled: 'Cancelled',
  noshow: 'No-Show',
  'no-show': 'No-Show',
  unattended: 'No-Show',
}

function formatStatus(statusStr: string): string {
  const normalized = (statusStr || '').toLowerCase().trim()
  return STATUS_LABELS[normalized] || statusStr || 'Unknown'
}

function getStatusBadgeClass(statusStr: string): string {
  const normalized = (statusStr || '').toLowerCase().trim()
  return STATUS_COLORS[normalized] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

interface GroupClassBookingsPanelProps {
  selectedClassFilter?: { id: string; name: string } | null
  onClearClassFilter?: () => void
}

export default function GroupClassBookingsPanel({
  selectedClassFilter,
  onClearClassFilter,
}: GroupClassBookingsPanelProps = {}) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<'All' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-Show'>('All')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedBooking, setSelectedBooking] = useState<GroupClassBooking | null>(null)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)

  const { data: bookings = [], isLoading, isError, refetch } = useGroupClassBookings()
  const { data: groupClasses = [] } = useGroupClasses()
  const queryClient = useQueryClient()

  // Booking responses often carry classId as an unpopulated reference (name missing),
  // while the class catalog (already cached from the therapies page) has the real names.
  // Resolve card titles by matching the booking's class ID against this catalog.
  const classNameById = useMemo(() => {
    const m = new Map<string, string>()
    groupClasses.forEach((c: GroupClass) => {
      if (c.id) m.set(c.id, c.name)
    })
    return m
  }, [groupClasses])

  // Filter only Group Class & Live Session bookings (exclude physical clinic therapies)
  const groupClassBookingsOnly = useMemo(() => {
    const PHYSICAL_THERAPY_TERMS = [
      'cold plunge', 'hbot', 'hyperbaric', 'cryotherapy', 'sauna',
      'massage', 'iv drip', 'therapy', 'compression', 'steam', 'red light', 'recovery'
    ]

    return bookings.filter((b: GroupClassBooking) => {
      const hasClassRef = Boolean(b.classId)
      const hasSessionRef = Boolean(b.sessionId)
      const serviceName = (b.service?.serviceName || '').toLowerCase()
      const serviceType = (b.service?.serviceType || '').toLowerCase()

      const isExplicitClass = serviceType.includes('group') || serviceType.includes('class') || serviceType.includes('live') || serviceType.includes('stream')
      const isPhysicalTherapy = PHYSICAL_THERAPY_TERMS.some(term => serviceName.includes(term))

      if (hasClassRef || hasSessionRef || isExplicitClass) return true
      if (isPhysicalTherapy) return false

      return serviceName.length > 0 && !isPhysicalTherapy
    })
  }, [bookings])

  // Calculate statistics for Group Classes & Live Streams only
  const stats = useMemo(() => {
    const total = groupClassBookingsOnly.length
    const confirmed = groupClassBookingsOnly.filter(b => {
      const s = (b.status || '').toLowerCase().trim()
      return s === 'confirmed' || s === 'booked'
    }).length
    const pending = groupClassBookingsOnly.filter(b => (b.status || '').toLowerCase().trim() === 'pending').length
    return { total, confirmed, pending }
  }, [groupClassBookingsOnly])

  const filteredBookings = useMemo(() => {
    return groupClassBookingsOnly.filter((b: GroupClassBooking) => {
      // 0. Selected Class Filter match
      if (selectedClassFilter) {
        const matchesClassId = b.classId?._id === selectedClassFilter.id || (typeof b.classId === 'string' && b.classId === selectedClassFilter.id)
        const matchesClassName = (b.classId?.name || b.service?.serviceName || '').toLowerCase() === selectedClassFilter.name.toLowerCase()
        if (!matchesClassId && !matchesClassName) return false
      }

      // 1. Search term match (Member Name, Email)
      const user = b.user || {}
      const username = (user.username || '').toLowerCase()
      const email = (user.email || '').toLowerCase()
      const search = searchTerm.toLowerCase().trim()

      const matchesSearch = username.includes(search) || email.includes(search)
      if (!matchesSearch) return false

      // 2. Calendar Date filter match
      if (selectedDate) {
        const rawDate = b.sessionId?.sessionDate || b.slot?.date || b.bookingDate || b.createdAt
        if (rawDate) {
          const parsed = new Date(rawDate).toISOString().slice(0, 10)
          if (parsed !== selectedDate) return false
        } else {
          return false
        }
      }

      // 3. Status filter match
      if (activeFilter === 'All') return true
      
      const status = (b.status || '').toLowerCase().trim()
      if (activeFilter === 'Pending') return status === 'pending'
      if (activeFilter === 'Confirmed') return status === 'confirmed' || status === 'booked'
      if (activeFilter === 'Completed') return status === 'completed' || status === 'attended' || status === 'consumed'
      if (activeFilter === 'Cancelled') return status === 'cancelled'
      if (activeFilter === 'No-Show') return status === 'noshow' || status === 'no-show' || status === 'unattended'

      return true
    }).sort((a, b) => {
      const timeA = new Date(a.createdAt || a.bookingDate || a.sessionId?.sessionDate || 0).getTime()
      const timeB = new Date(b.createdAt || b.bookingDate || b.sessionId?.sessionDate || 0).getTime()
      return timeB - timeA
    })
  }, [groupClassBookingsOnly, searchTerm, activeFilter, selectedDate, selectedClassFilter])

  const handleRowClick = (booking: GroupClassBooking) => {
    setSelectedBooking(booking)
  }

  const handleRefresh = () => {
    refetch()
  }

  const filters: Array<'All' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-Show'> = [
    'All',
    'Pending',
    'Confirmed',
    'Completed',
    'Cancelled',
    'No-Show',
  ]

  return (
    <div className="space-y-6">
      {/* 1. Gradient Hero Banner */}
      <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-indigo-600 via-blue-500 to-sky-500 text-white">
        <div className="p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/25">
                <IconClipboardText className="h-6 w-6" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight">Group Class Bookings</h2>
              <p className="max-w-2xl text-sm text-indigo-50/95">
                Monitor registration list, search members, and filter booking states from a single dashboard.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <div>
                <p className="text-xs text-indigo-50/90">Total</p>
                <p className="text-xl font-semibold">{stats.total}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-50/90">Confirmed</p>
                <p className="text-xl font-semibold">{stats.confirmed}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-50/90">Pending</p>
                <p className="text-xl font-semibold">{stats.pending}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Heading Section */}
      {/* 2. Heading Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Booking List</h3>
          <p className="text-muted-foreground">Manage and track member registrations for scheduled group classes.</p>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <IconRefresh className="mr-1 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* 2.5 Active Class Filter Banner */}
      {selectedClassFilter && (
        <div className="flex items-center justify-between p-3.5 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl shadow-sm text-xs font-medium text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center gap-2.5">
            <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-0.5 rounded-lg text-[11px]">
              Active Class Filter
            </Badge>
            <span>
              Showing registrations for: <strong className="font-semibold text-indigo-950 dark:text-indigo-100">{selectedClassFilter.name}</strong>
            </span>
          </div>
          {onClearClassFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearClassFilter}
              className="h-7 px-2.5 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg font-medium"
            >
              Clear Filter ✕
            </Button>
          )}
        </div>
      )}

      {/* 3. Search & Filter Header Card */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-xl">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Calendar Date Picker */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <IconCalendarEvent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 h-9 text-xs w-full sm:w-40 font-medium"
                />
              </div>
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedDate('')}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          
          {/* Status Filters */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-muted/40 rounded-lg border border-border w-fit">
            {filters.map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'h-8 px-3 rounded-md transition-all text-xs font-medium',
                  activeFilter !== filter && 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {filter}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Bookings Outer List Container */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCalendarEvent className="h-4 w-4 text-indigo-600" />
            Active Bookings
          </CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${filteredBookings.length} bookings found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="py-8 text-center text-red-500">
              Failed to load group class bookings. Please check API connectivity.
            </div>
          ) : isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredBookings.length === 0 ? (
                <Card className="sm:col-span-2 xl:col-span-3 border-dashed">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No bookings found matching your current search/filter.
                  </CardContent>
                </Card>
              ) : (
                filteredBookings.map((booking: GroupClassBooking) => {
                  const dateVal = booking.sessionId?.sessionDate || booking.slot?.date || booking.bookingDate
                  const dateFormatted = dateVal
                    ? new Date(dateVal).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '-'
                  const timeRange =
                    booking.sessionId?.startTime && booking.sessionId?.endTime
                      ? `${booking.sessionId.startTime} - ${booking.sessionId.endTime}`
                      : booking.slot?.startTime && booking.slot?.endTime
                      ? `${booking.slot.startTime} - ${booking.slot.endTime}`
                      : 'Scheduled Time'

                  const instructorName =
                    booking.sessionId?.trainerId?.trainerName ||
                    booking.classId?.instructor ||
                    'Staff Instructor'
                  const rawClassRef: any = booking.classId
                  const classRefId = typeof rawClassRef === 'string' ? rawClassRef : rawClassRef?._id
                  const className =
                    booking.classId?.name ||
                    (classRefId ? classNameById.get(classRefId) : undefined) ||
                    booking.service?.serviceName ||
                    'Group Class Session'
                  const creditsCost =
                    booking.creditCostSnapshot ?? booking.classId?.creditCost ?? booking.service?.creditCost ?? 0

                  const statusNormalized = (booking.status || '').toLowerCase().trim()
                  const isCompletedOrAttended =
                    statusNormalized === 'completed' ||
                    statusNormalized === 'attended' ||
                    statusNormalized === 'consumed'
                  const isNoShow =
                    statusNormalized === 'noshow' ||
                    statusNormalized === 'no-show' ||
                    statusNormalized === 'unattended'
                  const isCancelled = statusNormalized === 'cancelled'

                  return (
                    <Card
                      key={booking._id}
                      className="overflow-hidden rounded-2xl border border-slate-200/85 hover:shadow-md transition-shadow cursor-pointer group flex flex-col justify-between"
                      onClick={() => handleRowClick(booking)}
                    >
                      {/* Card Top Header */}
                      <div className="bg-gradient-to-r from-indigo-500/15 to-blue-500/10 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <Badge className={cn('text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full border', getStatusBadgeClass(booking.status))}>
                            {formatStatus(booking.status)}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Ticket: {booking._id.slice(-6).toUpperCase()}
                            </span>
                            {booking.videoRoomId && (
                              <button
                                type="button"
                                title="Click to copy full Room ID"
                                className="text-[10px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const roomIdToCopy = booking.videoRoomId || (typeof booking.sessionId === 'object' ? booking.sessionId?._id : booking.sessionId) || booking._id
                                  navigator.clipboard.writeText(roomIdToCopy)
                                  toast.success('Room ID copied to clipboard!')
                                }}
                              >
                                <span>Room: {booking.videoRoomId.slice(-6).toUpperCase()}</span>
                                <IconCopy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <h4 className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {booking.user?.username || 'Unknown Member'}
                        </h4>
                        <p className="text-xs text-muted-foreground">{booking.user?.email || '-'}</p>
                      </div>

                      {/* Card Content body */}
                      <CardContent className="space-y-3 p-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-sm font-semibold text-foreground/90">{className}</span>
                            <span className="text-sm font-medium text-foreground shrink-0 flex items-center gap-0.5">
                              <IconCoins className="h-3.5 w-3.5 text-muted-foreground" /> {creditsCost} cr
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-medium text-slate-500">Instructor: {instructorName}</p>
                        </div>

                        {/* Date & Time Footer & Action Button */}
                        <div>
                          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium">
                              <IconCalendarEvent className="h-3.5 w-3.5" /> {dateFormatted}
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <IconClock className="h-3.5 w-3.5" /> {timeRange}
                            </span>
                          </div>

                          {/* Attendance Status Action Controls */}
                          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                            {isCompletedOrAttended ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-transparent text-[11px] font-medium py-1 px-3 w-full justify-center">
                                <IconCheck className="mr-1 h-3.5 w-3.5" />
                                {booking.stayDurationMinutes && booking.stayDurationMinutes > 0
                                  ? `Attended (${booking.stayDurationMinutes} min${booking.stayDurationMinutes !== 1 ? 's' : ''})`
                                  : 'Attended'}
                              </Badge>
                            ) : isNoShow ? (
                              <Badge className="bg-gray-100 text-gray-800 border-transparent text-[11px] font-medium py-1 px-3 w-full justify-center">
                                <IconX className="mr-1 h-3.5 w-3.5" /> Marked No-Show
                              </Badge>
                            ) : isCancelled ? (
                              <Badge className="bg-red-100 text-red-800 border-transparent text-[11px] font-medium py-1 px-3 w-full justify-center">
                                Cancelled Booking
                              </Badge>
                            ) : (
                              <div className="flex gap-2 w-full">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-medium h-8"
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    await groupClassBookingService.updateStatus(booking._id, 'completed')
                                    queryClient.invalidateQueries({ queryKey: queryKeys.slots.all() })
                                    refetch()
                                  }}
                                >
                                  <IconCheck className="mr-1 h-3.5 w-3.5" /> Attended
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 text-xs font-medium h-8"
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    await groupClassBookingService.updateStatus(booking._id, 'noshow')
                                    queryClient.invalidateQueries({ queryKey: queryKeys.slots.all() })
                                    refetch()
                                  }}
                                >
                                  <IconX className="mr-1 h-3.5 w-3.5" /> No-Show
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details Modal */}
      <BookingDetailsDialog
        isOpen={Boolean(selectedBooking) && !isCancelOpen && !isRescheduleOpen}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        classNameDisplay={
          selectedBooking
            ? selectedBooking.classId?.name ||
              (selectedBooking.classId
                ? classNameById.get(
                    typeof selectedBooking.classId === 'string'
                      ? selectedBooking.classId
                      : selectedBooking.classId._id
                  )
                : undefined) ||
              selectedBooking.service?.serviceName
            : undefined
        }
        onCancelClick={() => setIsCancelOpen(true)}
        onRescheduleClick={() => setIsRescheduleOpen(true)}
      />

      {/* Cancellation Confirmation Dialog */}
      {selectedBooking && (
        <CancelBookingDialog
          isOpen={isCancelOpen}
          onClose={() => {
            setIsCancelOpen(false)
            setSelectedBooking(null)
          }}
          bookingId={selectedBooking._id}
          creditsCost={
            selectedBooking.creditCostSnapshot ??
            selectedBooking.classId?.creditCost ??
            selectedBooking.service?.creditCost ??
            0
          }
          memberName={selectedBooking.user?.username || 'Member'}
          className={
            selectedBooking.classId?.name ||
            (selectedBooking.classId
              ? classNameById.get(
                  typeof selectedBooking.classId === 'string'
                    ? selectedBooking.classId
                    : selectedBooking.classId._id
                )
              : undefined) ||
            selectedBooking.service?.serviceName ||
            'Group Class'
          }
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.slots.all() })
            refetch()
            setSelectedBooking(null)
          }}
        />
      )}

      {/* Reschedule Dialog */}
      {selectedBooking && (
        <RescheduleBookingDialog
          isOpen={isRescheduleOpen}
          onClose={() => {
            setIsRescheduleOpen(false)
            setSelectedBooking(null)
          }}
          bookingId={selectedBooking._id}
          classId={
            typeof selectedBooking.classId === 'string'
              ? selectedBooking.classId
              : selectedBooking.classId?._id
          }
          className={
            selectedBooking.classId?.name ||
            (selectedBooking.classId
              ? classNameById.get(
                  typeof selectedBooking.classId === 'string'
                    ? selectedBooking.classId
                    : selectedBooking.classId._id
                )
              : undefined) ||
            selectedBooking.service?.serviceName ||
            'Group Class'
          }
          currentSessionId={
            typeof selectedBooking.sessionId === 'object'
              ? selectedBooking.sessionId?._id
              : selectedBooking.sessionId
          }
          currentDate={
            selectedBooking.sessionId?.sessionDate ||
            selectedBooking.slot?.date ||
            selectedBooking.bookingDate
          }
          currentTime={
            selectedBooking.sessionId?.startTime && selectedBooking.sessionId?.endTime
              ? `${selectedBooking.sessionId.startTime} – ${selectedBooking.sessionId.endTime}`
              : undefined
          }
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.slots.all() })
            refetch()
            setSelectedBooking(null)
          }}
        />
      )}
    </div>
  )
}
