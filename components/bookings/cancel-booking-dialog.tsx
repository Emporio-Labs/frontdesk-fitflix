'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { IconAlertTriangle, IconCoins, IconLoader2 } from '@tabler/icons-react'
import { useCancelGroupClassBooking } from '@/hooks/use-group-class-booking-detail'

interface CancelBookingDialogProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  creditsCost: number
  memberName: string
  className: string
  onSuccess?: () => void
}

export function CancelBookingDialog({
  isOpen,
  onClose,
  bookingId,
  creditsCost,
  memberName,
  className: groupClassName,
  onSuccess,
}: CancelBookingDialogProps) {
  const [refundCredits, setRefundCredits] = useState(true)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const cancelMutation = useCancelGroupClassBooking()

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Override reason is mandatory for administrative cancellation.')
      return
    }

    setError('')
    try {
      await cancelMutation.mutateAsync({
        id: bookingId,
        payload: {
          adminOverride: refundCredits,
          reason: reason.trim(),
        },
      })
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
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <IconAlertTriangle className="h-5 w-5" />
            <DialogTitle>Cancel Booking</DialogTitle>
          </div>
          <DialogDescription>
            You are cancelling the booking for <strong className="text-foreground">{memberName}</strong> for{' '}
            <strong className="text-foreground">{groupClassName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Refund Credits Override Toggle */}
          <div className="flex items-center justify-between rounded-xl border p-3.5 bg-muted/30">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-medium text-sm">
                <IconCoins className="h-4 w-4 text-amber-500" />
                <span>Refund Credits to Member</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {refundCredits
                  ? `Refund ${creditsCost} credit${creditsCost !== 1 ? 's' : ''} to member account`
                  : 'Forfeit credits (no refund applied)'}
              </p>
            </div>
            <Switch
              checked={refundCredits}
              onCheckedChange={setRefundCredits}
              disabled={cancelMutation.isPending}
            />
          </div>

          {/* Mandatory Override Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason" className="text-xs font-semibold">
              Override / Cancellation Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Enter mandatory reason for staff cancellation / audit log..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError('')
              }}
              rows={3}
              className="resize-none text-sm"
              disabled={cancelMutation.isPending}
            />
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={cancelMutation.isPending}>
            Dismiss
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={cancelMutation.isPending || !reason.trim()}
          >
            {cancelMutation.isPending ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
