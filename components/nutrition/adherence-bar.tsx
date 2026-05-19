'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface AdherenceBarProps {
  label: string
  value: number
  /** Optional max for non-percentage values; defaults to 100 */
  max?: number
  className?: string
}

export function AdherenceBar({ label, value, max = 100, className }: AdherenceBarProps) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0))
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(pct)}%</span>
      </div>
      <Progress value={pct} />
    </div>
  )
}
