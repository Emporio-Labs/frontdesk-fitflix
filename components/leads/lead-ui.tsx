'use client'

import { cn } from '@/lib/utils'
import {
  istDateOnly,
  LEAD_STATUS_LABEL,
  Lead,
  LeadStatus,
  LeadTemperature,
} from '@/lib/services/lead.service'
import { IconFlame, IconSnowflake, IconSun } from '@tabler/icons-react'

/** Small presentational pieces shared by the lead board, list, sheet and dialogs. */

export const STATUS_TONE: Record<LeadStatus, string> = {
  new: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  contacted: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  visit_booked: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
  qualified: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
  converted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  lost: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300',
}

export function StatusChip({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STATUS_TONE[status], className)}>
      {LEAD_STATUS_LABEL[status]}
    </span>
  )
}

const HEAT: Record<LeadTemperature, { label: string; tone: string; Icon: typeof IconFlame }> = {
  hot: { label: 'Hot', tone: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300', Icon: IconFlame },
  warm: { label: 'Warm', tone: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300', Icon: IconSun },
  cold: { label: 'Cold', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', Icon: IconSnowflake },
}

export function HeatChip({ temperature, compact }: { temperature: LeadTemperature | null; compact?: boolean }) {
  if (!temperature) return null
  const { label, tone, Icon } = HEAT[temperature]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tone)} title={label}>
      <Icon className="h-3 w-3" />
      {!compact && label}
    </span>
  )
}

const TIME = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
const DAY = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
const DAY_YEAR = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })

/** "Today 4:30 pm", "Tomorrow 10:00 am", "Tue, 4 Nov 6:00 pm". */
export function formatWhen(value?: string | Date | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const day = istDateOnly(date)
  const today = istDateOnly(new Date())
  const tomorrow = istDateOnly(new Date(Date.now() + 86_400_000))
  const yesterday = istDateOnly(new Date(Date.now() - 86_400_000))
  const time = TIME.format(date).toLowerCase()
  if (day === today) return `Today ${time}`
  if (day === tomorrow) return `Tomorrow ${time}`
  if (day === yesterday) return `Yesterday ${time}`
  return `${DAY.format(date)} ${time}`
}

export function formatDay(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : DAY_YEAR.format(date)
}

/** "5m ago", "3h ago", "2d ago". */
export function timeAgo(value?: string | null): string {
  if (!value) return ''
  const ms = Date.now() - new Date(value).getTime()
  if (Number.isNaN(ms)) return ''
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return formatDay(value)
}

export type DueState = 'overdue' | 'today' | 'later' | 'none'

export function followUpState(lead: Pick<Lead, 'followUpDate'>): DueState {
  if (!lead.followUpDate) return 'none'
  const due = new Date(lead.followUpDate)
  if (Number.isNaN(due.getTime())) return 'none'
  if (due.getTime() < Date.now()) return 'overdue'
  return istDateOnly(due) === istDateOnly(new Date()) ? 'today' : 'later'
}

const DUE_TONE: Record<DueState, string> = {
  overdue: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
  today: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  later: 'bg-muted text-muted-foreground',
  none: 'bg-muted text-muted-foreground',
}

export function FollowUpChip({ lead }: { lead: Pick<Lead, 'followUpDate'> }) {
  const state = followUpState(lead)
  if (state === 'none') return null
  return (
    <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium', DUE_TONE[state])}>
      {state === 'overdue' ? 'Overdue · ' : ''}
      {formatWhen(lead.followUpDate)}
    </span>
  )
}

/** Value for <input type="datetime-local"> in the browser's own time zone. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function waLink(phone: string, name: string) {
  const digits = phone.replace(/\D/g, '')
  const withCountry = digits.length === 10 ? `91${digits}` : digits
  const text = encodeURIComponent(`Hi ${name}, this is FitFlix following up on your enquiry.`)
  return `https://wa.me/${withCountry}?text=${text}`
}

export function telLink(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

/** Where a lead's sale continues: resume its unpaid invoice, or start one. */
export function saleHref(lead: Pick<Lead, 'id' | 'pendingInvoiceId'>) {
  return lead.pendingInvoiceId
    ? `/admin/sales/new?invoiceId=${encodeURIComponent(lead.pendingInvoiceId)}`
    : `/admin/sales/new?leadId=${encodeURIComponent(lead.id)}`
}
