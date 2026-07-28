'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { IconLock, IconShieldCheck } from '@tabler/icons-react'
import { useStepUp } from '@/hooks/use-community'
import { toast } from 'sonner'

interface ConfirmArgs {
  reason: string
  stepUpToken: string
}

interface ModerationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel: string
  requireReason?: boolean
  requireStepUp?: boolean
  destructive?: boolean
  pending?: boolean
  onConfirm: (args: ConfirmArgs) => Promise<void> | void
}

/**
 * Reusable confirm dialog for moderation actions. Handles the optional
 * "reason" text plus the step-up re-auth flow (password → short-TTL token)
 * that the backend requires for destructive endpoints.
 */
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
  onConfirm,
}: ModerationDialogProps) {
  const [reason, setReason] = useState('')
  const [password, setPassword] = useState('')
  const [stepUpToken, setStepUpToken] = useState('')
  const stepUp = useStepUp()

  useEffect(() => {
    if (!open) {
      setReason('')
      setPassword('')
      setStepUpToken('')
    }
  }, [open])

  const canConfirm =
    (!requireReason || reason.trim().length > 0) &&
    (!requireStepUp || stepUpToken.length > 0)

  const requestStepUp = async () => {
    if (!password) return
    try {
      const { stepUpToken: token } = await stepUp.mutateAsync(password)
      setStepUpToken(token)
      setPassword('')
      toast.success('Re-authenticated for the next 5 minutes')
    } catch {
      // toast already surfaced by the hook
    }
  }

  const submit = async () => {
    if (!canConfirm) return
    await onConfirm({ reason: reason.trim(), stepUpToken })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {requireReason && (
            <div>
              <label className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Recorded in the moderation audit log."
                className="mt-1"
              />
            </div>
          )}

          {!requireReason && (
            <div>
              <label className="text-sm font-medium">
                Reason <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Recorded in the moderation audit log."
                className="mt-1"
              />
            </div>
          )}

          {requireStepUp && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {stepUpToken ? (
                  <>
                    <IconShieldCheck className="w-4 h-4 text-green-500" />
                    <span>Re-authenticated for the next 5 minutes</span>
                  </>
                ) : (
                  <>
                    <IconLock className="w-4 h-4 text-muted-foreground" />
                    <span>Confirm your admin password to continue</span>
                  </>
                )}
              </div>
              {!stepUpToken && (
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Admin password"
                    autoComplete="current-password"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        requestStepUp()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={requestStepUp}
                    disabled={!password || stepUp.isPending}
                  >
                    {stepUp.isPending ? 'Verifying…' : 'Verify'}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              onClick={submit}
              disabled={!canConfirm || pending}
            >
              {pending ? 'Working…' : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
