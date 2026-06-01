'use client'

import { Badge } from '@/components/ui/badge'
import type { PlanStatus } from '@/types/workout'

const STATUS_CONFIG: Record<PlanStatus, { label: string; className: string }> = {
  Draft: { label: 'Draft', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  Published: { label: 'Published', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  Active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  Paused: { label: 'Paused', className: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  Completed: { label: 'Completed', className: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
  Archived: { label: 'Archived', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
}

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: String(status), className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
