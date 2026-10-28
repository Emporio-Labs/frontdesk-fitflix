'use client'

import {
  IconArrowRight,
  IconBellRinging,
  IconBrandWhatsapp,
  IconBuildingStore,
  IconCreditCard,
  IconDeviceMobile,
  IconNote,
  IconPhone,
  IconPhoneOff,
  IconPlus,
  IconRobot,
} from '@tabler/icons-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useLeadActivities, useLeadOutcomes } from '@/hooks/use-leads'
import { LEAD_STATUS_LABEL, LeadActivity } from '@/lib/services/lead.service'
import { formatWhen, timeAgo } from './lead-ui'

function iconFor(a: LeadActivity) {
  if (a.type === 'call') return a.connected ? IconPhone : IconPhoneOff
  if (a.type === 'whatsapp') return IconBrandWhatsapp
  if (a.type === 'visit') return IconBuildingStore
  if (a.type === 'note') return IconNote
  if (a.type === 'status_change') return IconArrowRight
  if (a.outcome === 'converted') return IconCreditCard
  if (a.outcome === 'app_signup') return IconDeviceMobile
  if (a.outcome === 'escalated') return IconBellRinging
  if (a.outcome === 'auto_message') return IconRobot
  return IconPlus
}

function toneFor(a: LeadActivity) {
  if (a.outcome === 'converted') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
  if (a.statusTo === 'lost') return 'bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300'
  if (a.outcome === 'escalated') return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
  if (a.type === 'system' || a.type === 'status_change') return 'bg-muted text-muted-foreground'
  if (a.type === 'note') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300'
  return a.connected
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
    : 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
}

const CHANNEL_LABEL: Record<string, string> = { call: 'Call', whatsapp: 'WhatsApp', visit: 'Visit' }

/** Everything that happened with a lead, newest first. */
export function LeadTimeline({ leadId }: { leadId: string }) {
  const { data: items, isLoading, isError } = useLeadActivities(leadId)
  const { data: catalog } = useLeadOutcomes()
  const lostLabel = new Map((catalog?.lostReasons ?? []).map((r) => [r.key, r.label]))

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }
  if (isError) return <p className="text-sm text-muted-foreground">Couldn't load the history.</p>
  if (!items?.length) return <p className="text-sm text-muted-foreground">Nothing logged yet.</p>

  return (
    <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
      {items.map((a) => {
        const Icon = iconFor(a)
        const moved = a.statusFrom && a.statusTo && a.statusFrom !== a.statusTo
        const reason = a.lostReason
          ? a.lostReason.startsWith('other:')
            ? a.lostReason.slice(6).trim()
            : lostLabel.get(a.lostReason) ?? a.lostReason
          : ''
        return (
          <li key={a.id} className="relative flex gap-3">
            <span className={cn('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', toneFor(a))}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium">
                  {CHANNEL_LABEL[a.type] ? `${CHANNEL_LABEL[a.type]}: ` : ''}
                  {a.label || (a.type === 'note' ? 'Note' : a.outcome)}
                </span>
                <span className="text-xs text-muted-foreground" title={new Date(a.createdAt).toLocaleString()}>
                  {timeAgo(a.createdAt)}
                  {a.createdBy.role !== 'system' && ` · ${a.createdBy.name}`}
                </span>
              </div>
              {(moved || reason || a.nextFollowUpAt || a.visitAt) && (
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {moved && (
                    <span>
                      {LEAD_STATUS_LABEL[a.statusFrom!]} → {LEAD_STATUS_LABEL[a.statusTo!]}
                    </span>
                  )}
                  {reason && <span>Reason: {reason}</span>}
                  {a.visitAt && <span>Visit: {formatWhen(a.visitAt)}</span>}
                  {a.nextFollowUpAt && a.statusTo !== 'lost' && !a.visitAt && (
                    <span>Next: {formatWhen(a.nextFollowUpAt)}</span>
                  )}
                </div>
              )}
              {a.note && (
                <p className="mt-1 whitespace-pre-line rounded-md bg-muted/60 px-2.5 py-1.5 text-sm">{a.note}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
