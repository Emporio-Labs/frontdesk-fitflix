'use client'

import { Badge } from '@/components/ui/badge'
import type { PlanStatus } from '@/types/workout'

const STATUS_CONFIG: Record<PlanStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  archived: { label: 'Archived', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
}

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
