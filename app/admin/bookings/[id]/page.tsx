'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconArrowLeft,
  IconCalendarEvent,
  IconClock,
  IconCoins,
  IconCopy,
  IconHistory,
  IconMapPin,
  IconRefresh,
  IconUser,
  IconVideo,
  IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { useGroupClassBooking } from '@/hooks/use-group-class-booking-detail'
import { CancelBookingDialog } from '@/components/bookings/cancel-booking-dialog'
import { RescheduleBookingDialog } from '@/components/bookings/reschedule-booking-dialog'
import { cn } from '@/lib/utils'

const STATUS_BADGE_STYLES: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  attended: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  consumed: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
  noshow: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300',
  'no-show': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300',
  unattended: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300',
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params?.id as string

  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)

  const { data: booking, isLoading, isError, refetch } = useGroupClassBooking(bookingId)

  const statusNormalized = (booking?.status || '').toLowerCase().trim()
  const isCancelled = statusNormalized === 'cancelled'
  const isCompleted =
    statusNormalized === 'completed' ||
    statusNormalized === 'attended' ||
    statusNormalized === 'consumed'

  const dateVal = booking?.sessionId?.sessionDate || booking?.slot?.date || booking?.bookingDate
  const dateFormatted = dateVal
    ? new Date(dateVal).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '-'

  const timeRange =
    booking?.sessionId?.startTime && booking?.sessionId?.endTime
      ? `${booking.sessionId.startTime} – ${booking.sessionId.endTime}`
      : booking?.slot?.startTime && booking?.slot?.endTime
      ? `${booking.slot.startTime} – ${booking.slot.endTime}`
      : 'Scheduled Time'

  const memberName = booking?.user?.username || 'Member'
  const memberEmail = booking?.user?.email || '-'
  const memberPhone = booking?.user?.phone || '-'
  const className = booking?.classId?.name || booking?.service?.serviceName || 'Group Class'
  const instructorName =
    booking?.sessionId?.trainerId?.trainerName || booking?.classId?.instructor || 'Staff'
  const creditsCost =
    booking?.creditCostSnapshot ?? booking?.classId?.creditCost ?? booking?.service?.creditCost ?? 0
  const roomId =
    booking?.videoRoomId ||
    booking?.videoConferenceId ||
    booking?.classId?.zegoRoomId ||
    (typeof booking?.sessionId === 'object' ? booking?.sessionId?._id : booking?.sessionId)

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-8 w-64 rounded-lg" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isError || !booking) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4 py-16">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <IconX className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Booking Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested booking could not be loaded or may have been deleted.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          <Button onClick={() => refetch()}>
            <IconRefresh className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <IconArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight">Booking Details</h1>
              <Badge
                className={cn(
                  'text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize',
                  STATUS_BADGE_STYLES[statusNormalized] || 'bg-gray-100 text-gray-800'
                )}
              >
                {booking.status || 'Booked'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Ticket ID: {booking._id}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRescheduleOpen(true)}
            disabled={isCancelled}
            className="text-xs font-medium"
          >
            <IconCalendarEvent className="mr-1.5 h-4 w-4 text-indigo-600" />
            Reschedule
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsCancelOpen(true)}
            disabled={isCancelled || isCompleted}
            className="text-xs font-medium"
          >
            <IconX className="mr-1.5 h-4 w-4" />
            Cancel Booking
          </Button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 1. Member Details */}
        <Card className="rounded-2xl shadow-sm border-border/80">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <IconUser className="h-4 w-4 text-indigo-600" />
              Member Information
            </CardTitle>
            <CardDescription className="text-xs">
              Account contact details for this reservation.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground text-xs">Full Name</span>
              <span className="font-semibold text-foreground">{memberName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground text-xs">Email</span>
              <span className="font-medium text-foreground">{memberEmail}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground text-xs">Phone</span>
              <span className="font-medium text-foreground">{memberPhone}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground text-xs">User ID</span>
              <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <span>{booking.user?._id?.slice(0, 10)}...</span>
                <button
                  type="button"
                  onClick={() => handleCopy(booking.user?._id || '', 'User ID')}
                  className="hover:text-foreground"
                >
                  <IconCopy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Group Class Details */}
        <Card className="rounded-2xl shadow-sm border-border/80">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <IconCalendarEvent className="h-4 w-4 text-blue-600" />
              Group Class Details
            </CardTitle>
            <CardDescription className="text-xs">
              Blueprint and instructor specifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground text-xs">Class Name</span>
              <span className="font-semibold text-foreground">{className}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground text-xs">Instructor</span>
              <span className="font-medium text-foreground">{instructorName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground text-xs">Delivery Mode</span>
              <Badge variant="secondary" className="text-xs uppercase font-medium">
                {booking.sessionId?.deliveryType || 'Standard'}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground text-xs">Credits Required</span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                <IconCoins className="h-4 w-4 text-amber-500" /> {creditsCost} Credits
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 3. Schedule & Location */}
        <Card className="rounded-2xl shadow-sm border-border/80">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <IconClock className="h-4 w-4 text-emerald-600" />
              Schedule & Location
            </CardTitle>
            <CardDescription className="text-xs">
              Time window and venue information.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground text-xs">Date</span>
              <span className="font-semibold text-foreground">{dateFormatted}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground text-xs">Time Window</span>
              <span className="font-medium text-foreground">{timeRange}</span>
            </div>
            {roomId ? (
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground text-xs">Video Room ID</span>
                <div className="flex items-center gap-1.5 font-mono text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  <span>{roomId}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(roomId, 'Room ID')}
                    className="hover:text-indigo-800"
                  >
                    <IconCopy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground text-xs">Venue</span>
                <span className="font-medium text-foreground flex items-center gap-1">
                  <IconMapPin className="h-3.5 w-3.5 text-muted-foreground" /> Main Studio
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground text-xs">Attendance</span>
              <span className="text-xs font-medium text-muted-foreground">
                {booking.stayDurationMinutes && booking.stayDurationMinutes > 0
                  ? `Attended (${booking.stayDurationMinutes} mins)`
                  : isCompleted
                  ? 'Attended'
                  : 'Pending Session'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 4. Financials & Audit Log */}
        <Card className="rounded-2xl shadow-sm border-border/80">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <IconHistory className="h-4 w-4 text-purple-600" />
              Financials & Audit History
            </CardTitle>
            <CardDescription className="text-xs">
              Ledger transactions and administrative history.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground text-xs">Credits Consumed</span>
              <span className="font-semibold text-foreground">{creditsCost} Credits</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground text-xs">Credit Bypass</span>
              <Badge variant="outline" className="text-[10px]">
                {booking.creditsBypassed ? 'Yes (Bypassed)' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground text-xs">Booked On</span>
              <span className="text-xs text-muted-foreground">
                {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground text-xs">Last Updated</span>
              <span className="text-xs text-muted-foreground">
                {booking.updatedAt ? new Date(booking.updatedAt).toLocaleString() : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cancellation Dialog */}
      <CancelBookingDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        bookingId={booking._id}
        creditsCost={creditsCost}
        memberName={memberName}
        className={className}
        onSuccess={() => refetch()}
      />

      {/* Reschedule Dialog */}
      <RescheduleBookingDialog
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        bookingId={booking._id}
        classId={booking.classId?._id || (typeof booking.classId === 'string' ? booking.classId : undefined)}
        className={className}
        currentSessionId={typeof booking.sessionId === 'object' ? booking.sessionId?._id : booking.sessionId}
        currentDate={dateFormatted}
        currentTime={timeRange}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
