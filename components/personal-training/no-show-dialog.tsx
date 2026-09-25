'use client'

import { useEffect, useState } from 'react'
import { IconAlertTriangle } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useNoShowPtBooking } from '@/hooks/use-personal-training'
import type { UnifiedBookingDto } from '@/lib/services/personal-training.service'

interface NoShowDialogProps {
  booking: UnifiedBookingDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NoShowDialog({ booking, open, onOpenChange }: NoShowDialogProps) {
  const [reason, setReason] = useState('')
  const noShowMutation = useNoShowPtBooking()

  useEffect(() => {
    if (open) setReason('')
  }, [open, booking?._id])

  const memberName =
    booking && typeof booking.userId === 'object' && booking.userId !== null
      ? (booking.userId as { username?: string }).username || 'Member'
      : 'Member'

  const handleConfirm = async () => {
    if (!booking) return
    await noShowMutation.mutateAsync({ bookingId: booking._id, reason: reason.trim() || undefined })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconAlertTriangle className="h-5 w-5 text-rose-500" />
            Mark as No-Show
          </DialogTitle>
          <DialogDescription>
            {booking ? (
              <>
                <span className="font-medium text-foreground">{memberName}</span> · {booking.startTime}
                {booking.endTime ? `–${booking.endTime}` : ''}
              </>
            ) : (
              'Confirm the session was a no-show.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            The club&apos;s no-show rule will be applied to the member&apos;s credits. This action can only
            be reversed by the front desk.
          </p>
          <div>
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea
              placeholder="e.g. Member didn't arrive; no message received."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={noShowMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={noShowMutation.isPending || !booking}
          >
            {noShowMutation.isPending ? 'Marking…' : 'Mark No-Show'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
