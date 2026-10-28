'use client'

import { useDraggable } from '@dnd-kit/core'
import { IconBrandWhatsapp, IconMessageCircle, IconPhone } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Lead } from '@/lib/services/lead.service'
import { FollowUpChip, HeatChip, formatWhen, timeAgo } from '@/components/leads/lead-ui'

interface KanbanCardProps {
  lead: Lead
  lastOutcomeLabel?: string
  onOpen: () => void
  onCall: () => void
  onWhatsApp: () => void
  onLog: () => void
  isDragDisabled?: boolean
}

/** One lead on the board: who, how keen, when next, and one-tap actions. */
export default function KanbanCard({ lead, lastOutcomeLabel, onOpen, onCall, onWhatsApp, onLog, isDragDisabled = false }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id, disabled: isDragDisabled })
  const awaitingPayment = !!lead.pendingInvoiceId && lead.status !== 'converted'

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }

  return (
    <article
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen()
      }}
      className={cn(
        'group cursor-pointer touch-manipulation rounded-lg border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && 'opacity-40',
        lead.isEscalated && 'border-red-300 dark:border-red-500/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{lead.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {lead.source}
            {lead.ownerName ? ` · ${lead.ownerName}` : ''}
          </p>
        </div>
        <HeatChip temperature={lead.temperature} compact />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {lead.status === 'visit_booked' && lead.visitAt ? (
          <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30">
            Visit {formatWhen(lead.visitAt)}
          </span>
        ) : (
          <FollowUpChip lead={lead} />
        )}
        {awaitingPayment && (
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            Awaiting payment
          </span>
        )}
      </div>

      {(lastOutcomeLabel || lead.attemptCount > 0) && (
        <p className="mt-1.5 truncate text-xs text-muted-foreground">
          {lastOutcomeLabel ?? ''}
          {lead.attemptCount > 0 && ` · ${lead.attemptCount} ${lead.attemptCount === 1 ? 'try' : 'tries'}`}
          {lead.lastAttemptAt && ` · ${timeAgo(lead.lastAttemptAt)}`}
        </p>
      )}

      {lead.status !== 'converted' && (
        <div className="mt-2 flex gap-1 border-t pt-2">
          <button
            type="button"
            onClick={stop(onCall)}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={!lead.phone}
            className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40 dark:text-blue-300 dark:hover:bg-blue-500/10"
            aria-label={`Call ${lead.name}`}
          >
            <IconPhone className="h-3.5 w-3.5" /> Call
          </button>
          <button
            type="button"
            onClick={stop(onWhatsApp)}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={!lead.phone}
            className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
            aria-label={`WhatsApp ${lead.name}`}
          >
            <IconBrandWhatsapp className="h-3.5 w-3.5" /> WhatsApp
          </button>
          <button
            type="button"
            onClick={stop(onLog)}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium hover:bg-muted"
            aria-label={`Log outcome for ${lead.name}`}
          >
            <IconMessageCircle className="h-3.5 w-3.5" /> Log
          </button>
        </div>
      )}
    </article>
  )
}
