'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconCreditCard,
  IconDots,
  IconEdit,
  IconMessageCircle,
  IconPhone,
  IconShoppingCart,
  IconTrash,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { InterestSummary } from '@/components/crm/interest-summary'
import { useLeadOutcomes, useLogLeadActivity } from '@/hooks/use-leads'
import { Lead, shouldSuggestLost } from '@/lib/services/lead.service'
import { LeadTimeline } from './lead-timeline'
import {
  FollowUpChip,
  HeatChip,
  StatusChip,
  formatDay,
  formatWhen,
  saleHref,
  timeAgo,
} from './lead-ui'

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm">{children}</dd>
    </div>
  )
}

export interface LeadDetailSheetProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCall: (lead: Lead) => void
  onWhatsApp: (lead: Lead) => void
  onLogOutcome: (lead: Lead) => void
  onEdit: (lead: Lead) => void
  onDelete?: (lead: Lead) => void
  /** Trainers can't open the sale screen. */
  canSell?: boolean
}

/** Everything about one lead: who they are, where they stand, and their history. */
export function LeadDetailSheet({ lead, open, onOpenChange, onCall, onWhatsApp, onLogOutcome, onEdit, onDelete, canSell = true }: LeadDetailSheetProps) {
  const [note, setNote] = useState('')
  const logActivity = useLogLeadActivity()
  const { data: catalog } = useLeadOutcomes()
  if (!lead) return null

  const awaitingPayment = !!lead.pendingInvoiceId && lead.status !== 'converted'
  const lostReason = lead.lostReason.startsWith('other:')
    ? lead.lostReason.slice(6).trim()
    : catalog?.lostReasons.find((r) => r.key === lead.lostReason)?.label ?? lead.lostReason
  const suggestLost = shouldSuggestLost(lead, catalog?.rules)

  const addNote = () => {
    const text = note.trim()
    if (!text) return
    logActivity.mutate(
      { id: lead.id, payload: { type: 'note', note: text } },
      {
        onSuccess: () => {
          setNote('')
          toast.success('Note added')
        },
      },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="space-y-2 border-b p-4 pr-12 text-left sm:p-5 sm:pr-12">
          <SheetTitle className="text-xl">{lead.name}</SheetTitle>
          <SheetDescription className="flex flex-wrap gap-x-3 gap-y-0.5">
            {lead.phone && <span>{lead.phone}</span>}
            {lead.email && <span className="truncate">{lead.email}</span>}
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusChip status={lead.status} />
            <HeatChip temperature={lead.temperature} />
            <FollowUpChip lead={lead} />
            {awaitingPayment && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                Awaiting payment
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 border-b p-4 sm:px-5">
          <Button size="sm" onClick={() => onCall(lead)} disabled={!lead.phone}>
            <IconPhone className="mr-1.5 h-4 w-4" /> Call
          </Button>
          <Button size="sm" variant="outline" onClick={() => onWhatsApp(lead)} disabled={!lead.phone}>
            <IconBrandWhatsapp className="mr-1.5 h-4 w-4 text-emerald-600" /> WhatsApp
          </Button>
          <Button size="sm" variant="outline" onClick={() => onLogOutcome(lead)}>
            <IconMessageCircle className="mr-1.5 h-4 w-4" /> Log outcome
          </Button>
          {canSell && lead.status !== 'converted' && (
            <Button size="sm" variant="outline" asChild>
              <Link href={saleHref(lead)}>
                {awaitingPayment ? (
                  <><IconCreditCard className="mr-1.5 h-4 w-4" /> Resume payment</>
                ) : (
                  <><IconShoppingCart className="mr-1.5 h-4 w-4" /> Sell plan</>
                )}
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="ml-auto px-2" aria-label="More actions">
                <IconDots className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(lead)}>
                <IconEdit className="mr-2 h-4 w-4" /> Edit details
              </DropdownMenuItem>
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(lead)}>
                    <IconTrash className="mr-2 h-4 w-4" /> Delete lead
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          {suggestLost && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="flex-1 space-y-2">
                <p>
                  {lead.noAnswerStreak} tries with no answer since {formatDay(lead.firstAttemptAt)}. Close this lead?
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={logActivity.isPending}
                  onClick={() =>
                    logActivity.mutate(
                      { id: lead.id, payload: { type: 'call', outcome: 'unreachable_close' } },
                      { onSuccess: () => toast.success('Closed as Lost (unreachable)') },
                    )
                  }
                >
                  Close as Lost
                </Button>
              </div>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Fact label="Next follow-up">{lead.followUpDate ? formatWhen(lead.followUpDate) : '—'}</Fact>
            <Fact label="Visit">{lead.visitAt ? formatWhen(lead.visitAt) : '—'}</Fact>
            <Fact label="Attempts">
              {lead.attemptCount || 0}
              {lead.lastAttemptAt ? ` · last ${timeAgo(lead.lastAttemptAt)}` : ''}
            </Fact>
            <Fact label="Last spoke">{lead.lastContactedAt ? timeAgo(lead.lastContactedAt) : 'Never'}</Fact>
            <Fact label="Owner">{lead.ownerName || 'Unclaimed'}</Fact>
            <Fact label="Source">{lead.source || '—'}</Fact>
            <Fact label="Added">{formatDay(lead.createdAt)}</Fact>
            {lead.interestedIn ? <Fact label="Interested in">{lead.interestedIn}</Fact> : null}
            {lead.status === 'lost' && lostReason ? <Fact label="Lost because">{lostReason}</Fact> : null}
          </dl>

          <InterestSummary userId={lead.convertedUserId} />

          {lead.notes && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-md bg-muted/50 p-2.5 text-sm">{lead.notes}</p>
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
              rows={2}
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote()
              }}
            />
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" disabled={!note.trim() || logActivity.isPending} onClick={addNote}>
                Add note
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">History</p>
            <LeadTimeline leadId={lead.id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
