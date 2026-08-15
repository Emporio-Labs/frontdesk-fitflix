'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { IconGift } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { queryKeys } from '@/lib/query-keys'
import { useLocationScope } from '@/components/location-scope-provider'
import {
  GrantableType,
  graceGrantService,
} from '@/lib/services/grace-grant.service'

/**
 * Front-desk / admin grace grant.
 *
 * A grant creates its own zero-price membership with an independent expiry,
 * so comped value never mixes into revenue and lapses on its own schedule.
 * Front-desk callers are capped per grant and per month by the branch's
 * settings; the server enforces those, this form just surfaces the rejection.
 */
export function GrantGraceDialog({
  userId,
  userName,
}: {
  userId: string
  userName?: string
}) {
  const qc = useQueryClient()
  const { selectedLocationId } = useLocationScope()

  const [open, setOpen] = useState(false)
  const [type, setType] = useState<GrantableType>('CREDIT')
  const [amount, setAmount] = useState('5')
  const [reason, setReason] = useState('')
  const [expiryDays, setExpiryDays] = useState('')

  const reset = () => {
    setType('CREDIT')
    setAmount('5')
    setReason('')
    setExpiryDays('')
  }

  const grant = useMutation({
    mutationFn: () =>
      graceGrantService.grant(userId, {
        type,
        amount: Number(amount),
        reason: reason.trim(),
        expiryDays: expiryDays ? Number(expiryDays) : undefined,
        locationId: selectedLocationId ?? undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.memberships.all() })
      // No single 'all credits' key exists, so invalidate by prefix.
      qc.invalidateQueries({ queryKey: ['credits'] })
      qc.invalidateQueries({ queryKey: queryKeys.users.detail(userId) })
      toast.success(data.message)
      setOpen(false)
      reset()
    },
    onError: (err: any) => {
      // The cap rejections are the interesting ones — show the server's own
      // wording, which names the limit and what has already been used.
      toast.error(
        err?.response?.data?.message || 'Failed to issue the grace grant'
      )
    },
  })

  const amountValue = Number(amount)
  const canSubmit =
    Number.isInteger(amountValue) && amountValue > 0 && reason.trim().length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <IconGift className="size-4" />
          Grant grace
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Grant grace{userName ? ` — ${userName}` : ''}
          </DialogTitle>
          <DialogDescription>
            Issued as a separate zero-price package with its own expiry, so it
            stays out of revenue and lapses on its own.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>What to grant</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as GrantableType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CREDIT">Credits</SelectItem>
                <SelectItem value="PT_SESSION">PT sessions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="grant-amount">Amount</Label>
              <Input
                id="grant-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="grant-expiry">Expires in (days)</Label>
              <Input
                id="grant-expiry"
                type="number"
                min={1}
                placeholder="branch default"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="grant-reason">Reason</Label>
            <Textarea
              id="grant-reason"
              rows={2}
              placeholder="e.g. trainer cancelled last minute"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Required — the grant is rejected without one, and this is what
              shows in the member&apos;s ledger alongside your name.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || grant.isPending}
            onClick={() => grant.mutate()}
          >
            {grant.isPending ? 'Granting…' : 'Issue grant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
