'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatAge(hours: number): string {
  if (hours < 1) return 'under an hour'
  if (hours < 24) return `${Math.floor(hours)}h`
  return `${Math.floor(hours / 24)}d`
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-indigo-50/60 text-indigo-700 border-indigo-200/50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
  trainer: 'bg-blue-50/60 text-blue-700 border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  member: 'bg-slate-50/60 text-slate-700 border-slate-200/60 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-semibold px-2 py-0.5 text-[10px] rounded-full capitalize whitespace-nowrap',
        ROLE_STYLES[role] ?? ROLE_STYLES.member
      )}
    >
      {role}
    </Badge>
  )
}

export function VisibilityBadge({ visibility }: { visibility: string }) {
  const membersOnly = visibility === 'members_only'
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap',
        membersOnly
          ? 'bg-amber-50/60 text-amber-700 border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
          : 'bg-transparent text-muted-foreground border-dashed'
      )}
    >
      {membersOnly ? 'Members only' : 'Public'}
    </Badge>
  )
}

export function truncate(text: string, max = 90): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean || '—'
}
