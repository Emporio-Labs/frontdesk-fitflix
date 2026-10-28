'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useLocationScope } from '@/components/location-scope-provider'
import { useCreateLead, useUpdateLead } from '@/hooks/use-leads'
import { Lead, LeadTemperature } from '@/lib/services/lead.service'
import { validateEmail, validatePhoneNumber } from '@/lib/schemas'
import { toLocalInput } from '@/components/leads/lead-ui'

const DRAFT_KEY = 'add_lead_form_draft'

export const LEAD_SOURCES = ['Walk-in', 'Phone call', 'Website', 'Instagram', 'Facebook', 'Referral', 'Google', 'App', 'Other']

type FormState = {
  name: string
  phone: string
  email: string
  source: string
  interestedIn: string
  temperature: LeadTemperature | ''
  notes: string
  followUpDate: string
  locationId: string
}

const empty = (locationId = ''): FormState => ({
  name: '',
  phone: '',
  email: '',
  source: 'Walk-in',
  interestedIn: '',
  temperature: '',
  notes: '',
  followUpDate: '',
  locationId,
})

const fromLead = (lead: Lead): FormState => ({
  name: lead.name,
  phone: lead.phone,
  email: lead.email,
  source: lead.source,
  interestedIn: lead.interestedIn,
  temperature: lead.temperature ?? '',
  notes: lead.notes,
  followUpDate: lead.followUpDate ? toLocalInput(new Date(lead.followUpDate)) : '',
  locationId: lead.locationId,
})

const digits = (v: string) => v.replace(/\D/g, '').slice(-10)

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  leads,
  onOpenExisting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Editing this lead; null to add a new one. */
  lead: Lead | null
  /** Every lead, for the duplicate-phone check. */
  leads: Lead[]
  onOpenExisting: (lead: Lead) => void
}) {
  const { locations, selectedLocationId, isSingleLocation } = useLocationScope()
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()
  const [form, setForm] = useState<FormState>(empty())
  const [initial, setInitial] = useState<FormState>(empty())
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    if (!open) return
    if (lead) {
      const f = fromLead(lead)
      setForm(f)
      setInitial(f)
      return
    }
    const base = empty(selectedLocationId || '')
    let draft: FormState | null = null
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      draft = raw ? { ...base, ...JSON.parse(raw) } : null
    } catch {}
    setForm(draft ?? base)
    setInitial(base)
  }, [open, lead, selectedLocationId])

  // Keep a draft of an unsaved new lead, so a mis-tap doesn't lose it.
  useEffect(() => {
    if (!open || lead) return
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    } catch {}
  }, [form, open, lead])

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial])
  const duplicate = useMemo(() => {
    const p = digits(form.phone)
    if (p.length < 10) return null
    return leads.find((l) => l.id !== lead?.id && digits(l.phone) === p) ?? null
  }, [form.phone, leads, lead])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const close = (force = false) => {
    if (!force && dirty) {
      setConfirmDiscard(true)
      return
    }
    if (!lead) {
      try {
        sessionStorage.removeItem(DRAFT_KEY)
      } catch {}
    }
    onOpenChange(false)
  }

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.phone.trim()) return toast.error('Phone number is required')
    if (!validatePhoneNumber(form.phone)) return toast.error('Enter a valid phone number (at least 10 digits)')
    if (form.email.trim() && !validateEmail(form.email.trim())) return toast.error('Enter a valid email address')
    if (!lead && duplicate) return toast.error(`${duplicate.name} already has this number`)
    if (!lead && !isSingleLocation && !form.locationId) return toast.error('Pick a branch')

    const common = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      source: form.source,
      interestedIn: form.interestedIn.trim(),
      notes: form.notes.trim(),
      ...(form.temperature ? { temperature: form.temperature } : {}),
      ...(form.followUpDate ? { followUpDate: new Date(form.followUpDate).toISOString() } : {}),
    }
    if (lead) {
      await updateLead.mutateAsync({ id: lead.id, payload: common })
    } else {
      await createLead.mutateAsync({
        ...common,
        ...(!isSingleLocation && form.locationId ? { locationId: form.locationId } : {}),
      })
    }
    close(true)
  }

  const pending = createLead.isPending || updateLead.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{lead ? 'Edit lead' : 'Add lead'}</DialogTitle>
            <DialogDescription>
              {lead ? 'Contact details and what they want.' : 'Someone who walked in, called or messaged.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="lead-name">Name *</Label>
              <Input id="lead-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Phone *</Label>
              <Input id="lead-phone" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="98765 43210" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Optional" />
            </div>
            {duplicate && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-sm sm:col-span-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                {duplicate.name} already has this number.{' '}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => {
                    close(true)
                    onOpenExisting(duplicate)
                  }}
                >
                  Open their lead
                </button>
              </div>
            )}
            {!lead && !isSingleLocation && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Branch *</Label>
                <Select value={form.locationId} onValueChange={(v) => set('locationId', v)}>
                  <SelectTrigger aria-label="Branch"><SelectValue placeholder="Choose a branch" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Where did they come from?</Label>
              <div className="flex flex-wrap gap-1.5">
                {[...LEAD_SOURCES, ...(LEAD_SOURCES.includes(form.source) || !form.source ? [] : [form.source])].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('source', s)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs',
                      form.source === s ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-muted',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="lead-interest">Interested in</Label>
              <Input id="lead-interest" value={form.interestedIn} onChange={(e) => set('interestedIn', e.target.value)} placeholder="e.g. 3-month gym, personal training" />
            </div>
            <div className="space-y-1.5">
              <Label>How keen?</Label>
              <div className="flex gap-1.5">
                {(['hot', 'warm', 'cold'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('temperature', form.temperature === t ? '' : t)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs capitalize',
                      form.temperature === t ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-muted',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-follow">{lead ? 'Next follow-up' : 'First call by'}</Label>
              <Input id="lead-follow" type="datetime-local" value={form.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="lead-notes">Notes</Label>
              <Textarea id="lead-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Goals, timings, anything they said" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => close()}>Cancel</Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? 'Saving…' : lead ? 'Save changes' : 'Add lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>What you typed will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmDiscard(false)
                close(true)
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
