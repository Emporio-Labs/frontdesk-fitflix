'use client'

import React, { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconCalendarEvent, IconClock, IconLoader2, IconUsers } from '@tabler/icons-react'
import { useRescheduleGroupClassBooking } from '@/hooks/use-group-class-booking-detail'
import { useLiveSessions } from '@/hooks/use-live-sessions'
import type { LiveSession } from '@/lib/services/live-session.service'

interface RescheduleBookingDialogProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  classId?: string
  className: string
  currentSessionId?: string
  currentDate?: string
  currentTime?: string
  onSuccess?: () => void
}

export function RescheduleBookingDialog({
  isOpen,
  onClose,
  bookingId,
  classId,
  className: groupClassName,
  currentSessionId,
  currentDate,
  currentTime,
  onSuccess,
}: RescheduleBookingDialogProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const { data: allSessions = [], isLoading: isSessionsLoading } = useLiveSessions()
  const rescheduleMutation = useRescheduleGroupClassBooking()

  // Filter available future sessions for the target class
  const availableSessions = useMemo(() => {
    const now = new Date()
    return allSessions.filter((s: LiveSession) => {
      // Must be scheduled and have remaining capacity
      if (s.status !== 'SCHEDULED') return false
      // Cannot be the current session
      if (s.id === currentSessionId) return false
      // Filter by classId if available
      if (classId && s.classId && s.classId !== classId) return false

      // Must be upcoming (future)
      const sessionDate = new Date(s.sessionDate)
      const [h, m] = (s.startTime || '00:00').split(':').map(Number)
      sessionDate.setHours(h, m, 0, 0)
      return sessionDate > now
    })
  }, [allSessions, classId, currentSessionId])

  const selectedSession = useMemo(() => {
    return availableSessions.find((s: LiveSession) => s.id === selectedSessionId)
  }, [availableSessions, selectedSessionId])

  const handleConfirm = async () => {
    if (!selectedSessionId) {
      setError('Please select an available upcoming slot.')
      return
    }
    if (!reason.trim()) {
      setError('Reschedule reason is mandatory.')
      return
    }

    setError('')
    try {
      await rescheduleMutation.mutateAsync({
        id: bookingId,
        payload: {
          sessionId: selectedSessionId,
          bookingDate: selectedSession?.sessionDate,
          startTime: selectedSession?.startTime,
          endTime: selectedSession?.endTime,
          reason: reason.trim(),
        },
      })
      setSelectedSessionId('')
      setReason('')
      onClose()
      onSuccess?.()
    } catch {
      // Error handled by mutation hook
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <IconCalendarEvent className="h-5 w-5" />
            <DialogTitle>Reschedule Booking</DialogTitle>
          </div>
          <DialogDescription>
            Rescheduling booking for <strong className="text-foreground">{groupClassName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current Slot Info */}
          <div className="rounded-xl border p-3 bg-muted/20 text-xs space-y-1">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Current Schedule
            </span>
            <div className="flex items-center gap-3 text-foreground font-medium">
              <span className="flex items-center gap-1">
                <IconCalendarEvent className="h-3.5 w-3.5 text-muted-foreground" />
                {currentDate || 'Current Date'}
              </span>
              <span className="flex items-center gap-1">
                <IconClock className="h-3.5 w-3.5 text-muted-foreground" />
                {currentTime || 'Current Time'}
              </span>
            </div>
          </div>

          {/* New Slot Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Select New Available Slot <span className="text-red-500">*</span>
            </Label>
            {isSessionsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <IconLoader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading available slots...</span>
              </div>
            ) : availableSessions.length === 0 ? (
              <div className="p-3 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg">
                No upcoming available sessions found for this class with open capacity.
              </div>
            ) : (
              <Select value={selectedSessionId} onValueChange={(val) => {
                setSelectedSessionId(val)
                if (error) setError('')
              }}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Choose a new session date & time..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSessions.map((s: LiveSession) => {
                    const d = new Date(s.sessionDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                    return (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {d} · {s.startTime} – {s.endTime} ({s.currentBookings}/{s.capacity} booked)
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Mandatory Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-reason" className="text-xs font-semibold">
              Reschedule Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reschedule-reason"
              placeholder="Enter mandatory reason for staff rescheduling / audit log..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError('')
              }}
              rows={3}
              className="resize-none text-sm"
              disabled={rescheduleMutation.isPending}
            />
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={rescheduleMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={rescheduleMutation.isPending || !selectedSessionId || !reason.trim()}
          >
            {rescheduleMutation.isPending ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Rescheduling...
              </>
            ) : (
              'Save New Schedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
