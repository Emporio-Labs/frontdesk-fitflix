'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IconAlertTriangle, IconLock } from '@tabler/icons-react'
import { useStepUp } from '@/hooks/use-community'

export interface ModerationDialogResult {
  reason: string
  stepUpToken: string
}

interface ModerationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  /** Destructive actions (delete, suspend, ban) must carry a non-empty reason —
   *  the backend rejects a blank one with REASON_REQUIRED, so block it here too. */
  requireReason?: boolean
  /** Re-authentication. Mirrors the endpoints the backend guards with requireStepUp. */
  requireStepUp?: boolean
  destructive?: boolean
  pending?: boolean
  /** Extra action-specific fields, rendered above the reason box. */
  children?: ReactNode
  onConfirm: (result: ModerationDialogResult) => void | Promise<void>
}

export function ModerationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  requireReason = false,
  requireStepUp = false,
  destructive = false,
  pending = false,
  children,
  onConfirm,
}: ModerationDialogProps) {
  const [reason, setReason] = useState('')
  const [password, setPassword] = useState('')
  const stepUp = useStepUp()

  // The password never survives a closed dialog — front-desk machines are shared.
  useEffect(() => {
    if (!open) {
      setReason('')
      setPassword('')
    }
  }, [open])

  const reasonMissing = requireReason && reason.trim().length === 0
  const passwordMissing = requireStepUp && password.length === 0
  const busy = pending || stepUp.isPending

  const handleConfirm = async () => {
    if (reasonMissing || passwordMissing || busy) return

    let stepUpToken = ''
    if (requireStepUp) {
      try {
        const { stepUpToken: token } = await stepUp.mutateAsync(password)
        stepUpToken = token
      } catch {
        // useStepUp already surfaced the failure; keep the dialog open so the
        // operator can retry without losing the reason they typed.
        return
      }
    }
    await onConfirm({ reason: reason.trim(), stepUpToken })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <IconAlertTriangle className="w-4 h-4 text-destructive" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {children}

          <div>
            <label className="text-sm font-medium">
              Reason {requireReason ? '*' : <span className="text-muted-foreground">(optional)</span>}
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Recorded in the moderation audit log."
              rows={3}
              className="mt-1"
            />
            {reasonMissing && (
              <p className="text-xs text-destructive mt-1">A reason is required for this action.</p>
            )}
          </div>

          {requireStepUp && (
            <div>
              <label className="text-sm font-medium flex items-center gap-1.5">
                <IconLock className="w-3.5 h-3.5" /> Confirm your password *
              </label>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your admin password"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Destructive actions require re-authentication.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={reasonMissing || passwordMissing || busy}
            >
              {busy ? 'Working…' : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
