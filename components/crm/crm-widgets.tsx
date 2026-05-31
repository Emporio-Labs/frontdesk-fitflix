'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconPhone,
  IconBrandWhatsapp,
  IconUserCheck,
  IconUserPlus,
  IconArrowRight,
  IconEye,
} from '@tabler/icons-react'
import type { Lead } from '@/lib/services/lead.service'

// ─── IST Date Helpers ─────────────────────────────────────────────────────────
// Exported so consuming pages can derive IST-aware date strings without
// duplicating the locale formatter.

export const IST_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function toISTDateStr(date: Date): string {
  return IST_FORMATTER.format(date)
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Funnel Stage Definitions ─────────────────────────────────────────────────

export const FUNNEL_STAGES = [
  { key: 'new',       label: 'New',       color: 'bg-blue-500'   },
  { key: 'contacted', label: 'Contacted', color: 'bg-amber-500'  },
  { key: 'qualified', label: 'Qualified', color: 'bg-violet-500' },
  { key: 'converted', label: 'Converted', color: 'bg-emerald-500'},
  { key: 'lost',      label: 'Lost',      color: 'bg-rose-400'   },
] as const

// ─── CrmStatCard ──────────────────────────────────────────────────────────────

export interface CrmStatCardProps {
  title: string
  value: number | null
  sub: string
  icon: React.ReactNode
  href: string
  urgent?: boolean
}

export function CrmStatCard({
  title,
  value,
  sub,
  icon,
  href,
  urgent,
}: CrmStatCardProps) {
  return (
    <Link href={href} className="block">
      <Card
        className={`hover:shadow-md transition-shadow cursor-pointer ${
          urgent ? 'border-amber-400 dark:border-amber-600' : ''
        }`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          {value === null ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <div
              className={`text-2xl font-bold ${
                urgent && value > 0 ? 'text-amber-600 dark:text-amber-400' : ''
              }`}
            >
              {value}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

// ─── FollowUpCard ─────────────────────────────────────────────────────────────

export interface FollowUpCardProps {
  lead: Lead
  /** Called when the Call button is clicked (after the tel: anchor fires). */
  onCall: () => void
  /** Called when the WhatsApp button is clicked (after the wa.me anchor fires). */
  onWhatsApp: () => void
  /** Called when the Contacted button is clicked. */
  onMarkContacted: () => void
}

export function FollowUpCard({
  lead,
  onCall,
  onWhatsApp,
  onMarkContacted,
}: FollowUpCardProps) {
  const isOverdue = lead.followUpDate
    ? new Date(lead.followUpDate) < new Date()
    : false

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        isOverdue
          ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20'
          : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{lead.name}</p>
          <p className="text-xs text-muted-foreground">
            {lead.followUpDate
              ? `Due ${timeAgo(lead.followUpDate)}`
              : `Added ${timeAgo(lead.createdAt)}`}
            {lead.interestedIn ? ` · ${lead.interestedIn}` : ''}
          </p>
          {lead.phone && (
            <p className="text-xs text-muted-foreground">{lead.phone}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isOverdue && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              Overdue
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
            {lead.status}
          </Badge>
        </div>
      </div>

      <div className="flex gap-1.5">
        {/* tel: anchor handles navigation; onCall records the contact attempt */}
        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" asChild>
          <a href={`tel:${lead.phone}`} onClick={onCall}>
            <IconPhone className="w-3 h-3 mr-1" />
            Call
          </a>
        </Button>

        {/* wa.me anchor handles navigation; onWhatsApp records the contact attempt */}
        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" asChild>
          <a
            href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            onClick={onWhatsApp}
          >
            <IconBrandWhatsapp className="w-3 h-3 mr-1 text-green-600" />
            WhatsApp
          </a>
        </Button>

        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs flex-1"
          onClick={onMarkContacted}
          disabled={
            lead.status === 'contacted' ||
            lead.status === 'qualified' ||
            lead.status === 'converted'
          }
        >
          <IconUserCheck className="w-3 h-3 mr-1" />
          Contacted
        </Button>
      </div>
    </div>
  )
}

// ─── SignupLeadCard ───────────────────────────────────────────────────────────

export interface SignupLeadCardProps {
  lead: Lead
}

const SIGNUP_STATUS_COLORS: Record<string, string> = {
  new:       'bg-blue-100   text-blue-700   dark:bg-blue-900   dark:text-blue-300',
  contacted: 'bg-amber-100  text-amber-700  dark:bg-amber-900  dark:text-amber-300',
  qualified: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  converted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  lost:      'bg-rose-100   text-rose-700   dark:bg-rose-900   dark:text-rose-300',
}

export function SignupLeadCard({ lead }: SignupLeadCardProps) {
  const isToday =
    toISTDateStr(new Date(lead.createdAt)) === toISTDateStr(new Date())

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm truncate">{lead.name}</p>
            {isToday && (
              <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 shrink-0">
                New
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {timeAgo(lead.createdAt)}
            {lead.interestedIn ? ` · ${lead.interestedIn}` : ''}
          </p>
          {lead.phone && (
            <p className="text-xs text-muted-foreground">{lead.phone}</p>
          )}
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 capitalize ${
            SIGNUP_STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {lead.status}
        </span>
      </div>

      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
          <a href={`tel:${lead.phone}`}>
            <IconPhone className="w-3 h-3 mr-1" />
            Call
          </a>
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
          <a
            href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
          >
            <IconBrandWhatsapp className="w-3 h-3 mr-1 text-green-600" />
            WhatsApp
          </a>
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" asChild>
          <Link href="/admin/leads">
            <IconEye className="w-3 h-3 mr-1" />
            View
          </Link>
        </Button>
      </div>
    </div>
  )
}

// ─── FunnelView ───────────────────────────────────────────────────────────────

export interface FunnelViewProps {
  stageCounts: Record<string, number>
}

export function FunnelView({ stageCounts }: FunnelViewProps) {
  const total =
    FUNNEL_STAGES.reduce((sum, s) => sum + (stageCounts[s.key] ?? 0), 0) || 1

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-2">
      {FUNNEL_STAGES.map((stage, idx) => {
        const count = stageCounts[stage.key] ?? 0
        const pct = Math.round((count / total) * 100)
        const isLast = idx === FUNNEL_STAGES.length - 1

        return (
          <div key={stage.key} className="flex sm:flex-col items-center gap-2 flex-1">
            <div
              className={`w-full rounded-xl p-4 text-center text-white ${stage.color} flex-1`}
            >
              <div className="text-2xl font-bold leading-none">{count}</div>
              <div className="text-xs font-medium mt-1 opacity-95">{stage.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{pct}%</div>
            </div>
            {!isLast && (
              <IconArrowRight className="w-4 h-4 text-muted-foreground shrink-0 rotate-90 sm:rotate-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}
