'use client'

import { StatusBadge } from '@/components/status-badge'

interface NutritionStatusCellProps {
  status: string
}

/** Thin wrapper so nutrition tables share one status rendering point. */
export function NutritionStatusCell({ status }: NutritionStatusCellProps) {
  return <StatusBadge status={status.toLowerCase()} size="sm" />
}
