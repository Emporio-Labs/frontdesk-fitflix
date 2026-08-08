'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  IconCalendarEvent,
  IconClock,
  IconCoins,
  IconTicket,
  IconUser,
  IconX,
  IconCheck,
} from '@tabler/icons-react'
import type { GroupClassBooking } from '@/lib/services/group-class-booking.service'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
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

interface BookingDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  booking: GroupClassBooking | null
  classNameDisplay?: string
  onCancelClick: () => void
  onRescheduleClick: () => void
}

export function BookingDetailsDialog({
  isOpen,
  onClose,
  booking,
  classNameDisplay,
  onCancelClick,
  onRescheduleClick,
}: BookingDetailsDialogProps) {
  if (!booking) return null

  const statusNormalized = (booking.status || '').toLowerCase().trim()
  const statusLabel = STATUS_LABELS[statusNormalized] || booking.status || 'Booked'
  const isCancelled = statusNormalized === 'cancelled'
  const isCompleted =
    statusNormalized === 'completed' ||
    statusNormalized === 'attended' ||
    statusNormalized === 'consumed'
  const isNoShow =
    statusNormalized === 'noshow' ||
    statusNormalized === 'no-show' ||
    statusNormalized === 'unattended'

  const dateVal = booking.sessionId?.sessionDate || booking.slot?.date || booking.bookingDate
  const dateFormatted = dateVal
    ? new Date(dateVal).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-'

  const timeRange =
    booking.sessionId?.startTime && booking.sessionId?.endTime
      ? `${booking.sessionId.startTime} – ${booking.sessionId.endTime}`
      : booking.slot?.startTime && booking.slot?.endTime
      ? `${booking.slot.startTime} – ${booking.slot.endTime}`
      : 'Scheduled Time'

  const memberName = booking.user?.username || 'Unknown Member'
  const memberEmail = booking.user?.email || ''
  const instructorName =
    booking.sessionId?.trainerId?.trainerName || booking.classId?.instructor || 'Staff Instructor'
  const className = classNameDisplay || booking.classId?.name || booking.service?.serviceName || 'Group Class'
  const creditsCost =
    booking.creditCostSnapshot ?? booking.classId?.creditCost ?? booking.service?.creditCost ?? 0
  const bookedOn = booking.createdAt
    ? new Date(booking.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-transparent p-5 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  className={cn(
                    'text-[11px] font-semibold px-2.5 py-0.5 rounded-full border',
                    STATUS_COLORS[statusNormalized] || 'bg-gray-100 text-gray-800'
                  )}
                >
                  {statusLabel}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  #{booking._id.slice(-6).toUpperCase()}
                </span>
              </div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                {memberName}
              </DialogTitle>
              {memberEmail && (
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {memberEmail}
                </DialogDescription>
              )}
            </div>
          </div>
        </div>

        {/* Focused Details Grid */}
        <div className="p-5 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3.5">
            {/* Group Class */}
            <div className="rounded-xl border p-3 bg-muted/20 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Group Class
              </span>
              <p className="text-sm font-semibold text-foreground truncate" title={className}>
                {className}
              </p>
              <p className="text-[11px] text-muted-foreground">Coach: {instructorName}</p>
            </div>

            {/* Credits Used */}
            <div className="rounded-xl border p-3 bg-muted/20 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Credits Used
              </span>
              <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <IconCoins className="h-4 w-4 text-amber-500" />
                <span>{creditsCost} Credits</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {booking.creditsBypassed ? 'Bypassed' : 'Standard'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Date */}
            <div className="rounded-xl border p-3 bg-muted/20 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1">
                <IconCalendarEvent className="h-3.5 w-3.5" /> Date
              </span>
              <p className="text-xs font-semibold text-foreground">{dateFormatted}</p>
            </div>

            {/* Time */}
            <div className="rounded-xl border p-3 bg-muted/20 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1">
                <IconClock className="h-3.5 w-3.5" /> Time
              </span>
              <p className="text-xs font-semibold text-foreground">{timeRange}</p>
            </div>
          </div>

          {/* Booked On & Context-Aware Attendance */}
          <div className="rounded-xl border p-3 bg-muted/10 space-y-2">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Booked On:</span>
              <span className="font-medium text-foreground">{bookedOn}</span>
            </div>

            {/* Completed/History Attendance */}
            {(isCompleted || isNoShow) && (
              <div className="flex justify-between items-center pt-2 border-t text-muted-foreground">
                <span>Attendance Status:</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  {isCompleted ? (
                    <>
                      <IconCheck className="h-3.5 w-3.5 text-emerald-600" />
                      {booking.stayDurationMinutes && booking.stayDurationMinutes > 0
                        ? `Attended (${booking.stayDurationMinutes} mins)`
                        : 'Attended'}
                    </>
                  ) : (
                    <>
                      <IconX className="h-3.5 w-3.5 text-gray-500" />
                      Marked No-Show
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-muted/20 border-t flex items-center justify-between sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                onRescheduleClick()
              }}
              disabled={isCancelled || isCompleted}
              className="text-xs h-8"
            >
              <IconCalendarEvent className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
              Reschedule
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onClose()
                onCancelClick()
              }}
              disabled={isCancelled || isCompleted}
              className="text-xs h-8"
            >
              <IconX className="mr-1.5 h-3.5 w-3.5" />
              Cancel Booking
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
