'use client'

import { Badge } from '@/components/ui/badge'

export function RoleBadge({ role }: { role: 'member' | 'trainer' | 'admin' | string }) {
  if (role === 'admin') {
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">
        Admin
      </Badge>
    )
  }
  if (role === 'trainer') {
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">
        Trainer
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full">
      Member
    </Badge>
  )
}

export function VisibilityBadge({ visibility }: { visibility: string }) {
  if (visibility === 'members_only') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full border-amber-500/40 text-amber-600 dark:text-amber-400">
        Members only
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full">
      Public
    </Badge>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'border-green-500/40 text-green-600 dark:text-green-400' },
    suspended: { label: 'Suspended', className: 'border-amber-500/40 text-amber-600 dark:text-amber-400' },
    banned: { label: 'Banned', className: 'border-destructive/40 text-destructive' },
  }
  const entry = map[status] ?? { label: status, className: '' }
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 rounded-full ${entry.className}`}>
      {entry.label}
    </Badge>
  )
}

export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export function formatAge(hours: number): string {
  if (hours < 1) return 'under an hour'
  if (hours < 24) return `${Math.floor(hours)}h`
  return `${Math.floor(hours / 24)}d`
}

export function truncate(text: string | null | undefined, max = 140): string {
  if (!text) return '—'
  const clean = text.trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trimEnd()}…`
}
