'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  IconBrandWhatsapp,
  IconBuildingStore,
  IconCheck,
  IconPhone,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useLeadOutcomes, useLogLeadActivity } from '@/hooks/use-leads'
import {
  LEAD_STATUS_LABEL,
  Lead,
  LeadOutcomeDefinition,
  LeadStatus,
  LeadTemperature,
  OutcomeChannel,
} from '@/lib/services/lead.service'
import { formatWhen, toLocalInput } from './lead-ui'

const CHANNELS: Array<{ key: OutcomeChannel; label: string; Icon: typeof IconPhone }> = [
  { key: 'call', label: 'Call', Icon: IconPhone },
  { key: 'whatsapp', label: 'WhatsApp', Icon: IconBrandWhatsapp },
  { key: 'visit', label: 'Visit', Icon: IconBuildingStore },
]

const GROUPS: Array<{ key: LeadOutcomeDefinition['group']; label: string }> = [
  { key: 'connected', label: 'Spoke to them' },
  { key: 'not_connected', label: "Couldn't reach them" },
  { key: 'visit', label: 'Visit' },
  { key: 'other', label: 'Other' },
]

const CUSTOM_STATUSES: LeadStatus[] = ['new', 'contacted', 'visit_booked', 'qualified', 'lost']

/** Quick picks for "when", built fresh each time the dialog opens. */
function quickTimes(kind: 'followUp' | 'visit', suggestHours?: number) {
  const now = new Date()
  const at = (dayOffset: number, hour: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(hour, 0, 0, 0)
    return d
  }
  if (kind === 'visit') {
    return [
      ...(now.getHours() < 17 ? [{ label: 'Today 6 pm', date: at(0, 18) }] : []),
      { label: 'Tomorrow 7 am', date: at(1, 7) },
      { label: 'Tomorrow 6 pm', date: at(1, 18) },
      { label: 'In 2 days, 6 pm', date: at(2, 18) },
    ]
  }
  const picks = [
    { label: 'In 2 hours', date: new Date(now.getTime() + 2 * 3600_000) },
    ...(now.getHours() < 17 ? [{ label: 'This evening', date: at(0, 18) }] : []),
    { label: 'Tomorrow 10 am', date: at(1, 10) },
    { label: 'In 2 days', date: at(2, 10) },
    { label: 'Next week', date: at(7, 10) },
  ]
  if (suggestHours && suggestHours > 48) {
    picks.push({ label: `In ${Math.round(suggestHours / 24)} days`, date: at(Math.round(suggestHours / 24), 10) })
  }
  return picks
}

function suggestedFollowUp(hours?: number): Date {
  const now = new Date()
  if (!hours) return new Date(now.getTime() + 24 * 3600_000)
  if (hours < 24) return new Date(now.getTime() + hours * 3600_000)
  const d = new Date(now)
  d.setDate(d.getDate() + Math.round(hours / 24))
  d.setHours(10, 0, 0, 0)
  return d
}

function TimePicker({
  id,
  value,
  onChange,
  picks,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  picks: Array<{ label: string; date: Date }>
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {picks.map((p) => {
          const v = toLocalInput(p.date)
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(v)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                value === v ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-muted',
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      <Input id={id} type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className="max-w-xs" />
      {value && <p className="text-xs text-muted-foreground">{formatWhen(new Date(value))}</p>}
    </div>
  )
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: T; label: string }>
  value: T | ''
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs transition-colors',
            value === o.key ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export interface LogOutcomeDialogProps {
  lead: Pick<Lead, 'id' | 'name' | 'phone' | 'status' | 'visitAt' | 'temperature'> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  channel?: OutcomeChannel
  /** Preselect an outcome, e.g. when a card is dragged to a column. */
  outcome?: string
  onLogged?: () => void
}

/**
 * "What happened?" — asked whenever staff call, message or meet a lead.
 * Outcomes, required fields and suggested times come from the backend
 * catalog; the backend applies the status/heat rules.
 */
export function LogOutcomeDialog({ lead, open, onOpenChange, channel: initialChannel = 'call', outcome: initialOutcome, onLogged }: LogOutcomeDialogProps) {
  const { data: catalog, isLoading } = useLeadOutcomes()
  const logActivity = useLogLeadActivity()

  const [channel, setChannel] = useState<OutcomeChannel>(initialChannel)
  const [outcomeKey, setOutcomeKey] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [visitAt, setVisitAt] = useState('')
  const [lostReason, setLostReason] = useState('')
  const [lostReasonText, setLostReasonText] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [customStatus, setCustomStatus] = useState<LeadStatus | ''>('')
  const [customConnected, setCustomConnected] = useState(true)
  const [temperature, setTemperature] = useState<LeadTemperature | ''>('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setChannel(initialChannel)
    setOutcomeKey(initialOutcome ?? '')
    setFollowUp('')
    setVisitAt('')
    setLostReason('')
    setLostReasonText('')
    setCustomLabel('')
    setCustomStatus('')
    setCustomConnected(true)
    setTemperature('')
    setNote('')
  }, [open, initialChannel, initialOutcome])

  const outcomes = useMemo(
    () => (catalog?.outcomes ?? []).filter((o) => o.channels.includes(channel)),
    [catalog, channel],
  )
  const selected = outcomes.find((o) => o.key === outcomeKey) ?? null

  // Default the follow-up to what this outcome suggests.
  useEffect(() => {
    if (selected?.requires.followUp && selected.suggestFollowUpHours) {
      setFollowUp(toLocalInput(suggestedFollowUp(selected.suggestFollowUpHours)))
    }
  }, [selected?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const isCustom = selected?.key === 'custom'
  const endsLost = isCustom ? customStatus === 'lost' : selected?.status === 'Lost'
  const needsLostReason = endsLost && !selected?.lostReason
  const needsVisit = !!selected?.requires.visitAt || (isCustom && customStatus === 'visit_booked')
  const needsFollowUp = !!selected && !endsLost && !needsVisit

  const missing =
    !selected
      ? 'Pick what happened'
      : isCustom && !customLabel.trim()
        ? 'Describe what happened'
        : needsVisit && !visitAt
          ? 'Pick the visit time'
          : needsFollowUp && !followUp
            ? 'Pick when to follow up'
            : needsLostReason && !lostReason
              ? 'Pick a reason'
              : needsLostReason && lostReason === 'other' && !lostReasonText.trim()
                ? 'Write the reason'
                : ''

  const save = async () => {
    if (!lead || !selected || missing) return
    const result = await logActivity.mutateAsync({
      id: lead.id,
      payload: {
        type: channel,
        outcome: selected.key,
        ...(isCustom
          ? {
              customLabel: customLabel.trim(),
              customConnected,
              ...(customStatus ? { customStatus } : {}),
            }
          : {}),
        ...(temperature ? { temperature } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(needsVisit && visitAt ? { visitAt: new Date(visitAt).toISOString() } : {}),
        ...(needsFollowUp && followUp ? { nextFollowUpAt: new Date(followUp).toISOString() } : {}),
        ...(needsLostReason ? { lostReason, ...(lostReason === 'other' ? { lostReasonText: lostReasonText.trim() } : {}) } : {}),
      },
    })

    const next = result.lead
    toast.success(
      next?.status === 'lost'
        ? `${lead.name} closed as Lost`
        : next?.followUpDate
          ? `Saved · next: ${formatWhen(next.followUpDate)}`
          : 'Saved',
    )
    if (result.suggestLost) {
      const leadId = lead.id
      toast.warning(`${lead.name} hasn't answered in over a week of tries.`, {
        duration: 12_000,
        action: {
          label: 'Close as Lost',
          onClick: () =>
            logActivity.mutate(
              { id: leadId, payload: { type: 'call', outcome: 'unreachable_close' } },
              { onSuccess: () => toast.success('Closed as Lost (unreachable)') },
            ),
        },
      })
    }
    onLogged?.()
    onOpenChange(false)
  }

  const heatDefault = selected?.temperature && selected.temperature !== 'cooler' ? selected.temperature : lead?.temperature ?? ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>What happened?</DialogTitle>
          <DialogDescription>
            {lead?.name}
            {lead?.phone ? ` · ${lead.phone}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="How you reached them">
            {CHANNELS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={channel === key}
                onClick={() => {
                  setChannel(key)
                  if (selected && !selected.channels.includes(key)) setOutcomeKey('')
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors',
                  channel === key ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {GROUPS.map((group) => {
                const items = outcomes.filter((o) => o.group === group.key)
                if (!items.length) return null
                return (
                  <div key={group.key} className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {items.map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => setOutcomeKey(o.key)}
                          aria-pressed={outcomeKey === o.key}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                            outcomeKey === o.key
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'hover:border-foreground/30 hover:bg-muted/50',
                          )}
                        >
                          <span>{o.label}</span>
                          {outcomeKey === o.key && <IconCheck className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selected && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-3 sm:p-4">
              {isCustom && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="outcome-custom">What happened</Label>
                    <Input
                      id="outcome-custom"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="e.g. Sent a gym tour video"
                      maxLength={200}
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="outcome-connected" className="font-normal">We spoke to / met them</Label>
                    <Switch id="outcome-connected" checked={customConnected} onCheckedChange={setCustomConnected} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Move lead to</Label>
                    <ChipRow
                      options={[
                        { key: '' as const, label: 'Keep as is' },
                        ...CUSTOM_STATUSES.map((s) => ({ key: s, label: LEAD_STATUS_LABEL[s] })),
                      ] as Array<{ key: LeadStatus | ''; label: string }>}
                      value={customStatus}
                      onChange={(v) => setCustomStatus(v)}
                    />
                  </div>
                </>
              )}

              {needsVisit && (
                <div className="space-y-1.5">
                  <Label htmlFor="outcome-visit">Visit / trial time</Label>
                  <TimePicker id="outcome-visit" value={visitAt} onChange={setVisitAt} picks={quickTimes('visit')} />
                </div>
              )}

              {needsFollowUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="outcome-followup">Next follow-up</Label>
                  <TimePicker
                    id="outcome-followup"
                    value={followUp}
                    onChange={setFollowUp}
                    picks={quickTimes('followUp', selected.suggestFollowUpHours)}
                  />
                </div>
              )}

              {needsLostReason && (
                <div className="space-y-1.5">
                  <Label>Why?</Label>
                  <ChipRow
                    options={(catalog?.lostReasons ?? []).filter((r) => r.key !== 'invalid_number')}
                    value={lostReason}
                    onChange={setLostReason}
                  />
                  {lostReason === 'other' && (
                    <Input
                      value={lostReasonText}
                      onChange={(e) => setLostReasonText(e.target.value)}
                      placeholder="Their reason"
                      maxLength={300}
                    />
                  )}
                </div>
              )}

              {!endsLost && (
                <div className="space-y-1.5">
                  <Label>
                    How keen are they?{' '}
                    {heatDefault && !temperature && (
                      <span className="font-normal text-muted-foreground">({heatDefault} unless you change it)</span>
                    )}
                  </Label>
                  <ChipRow
                    options={[
                      { key: 'hot' as const, label: 'Hot' },
                      { key: 'warm' as const, label: 'Warm' },
                      { key: 'cold' as const, label: 'Cold' },
                    ]}
                    value={temperature}
                    onChange={(v) => setTemperature(v === temperature ? '' : v)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="outcome-note">Note (optional)</Label>
                <Textarea
                  id="outcome-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything the next person should know"
                  rows={2}
                  maxLength={2000}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:items-center">
          {missing && selected && <p className="mr-auto text-xs text-muted-foreground">{missing}</p>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!!missing || logActivity.isPending}>
            {logActivity.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
