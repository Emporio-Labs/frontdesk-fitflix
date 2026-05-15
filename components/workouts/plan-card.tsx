'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlanStatusBadge } from '@/components/workouts/plan-status-badge'
import { DifficultyBadge } from '@/components/workouts/difficulty-badge'
import { IconCalendar, IconBarbell, IconUsers } from '@tabler/icons-react'
import type { WorkoutPlan } from '@/types/workout'
import { PLAN_GOALS, SPLIT_TYPES } from '@/types/workout'

export function PlanCard({
  plan,
  showUseTemplate,
  onUseTemplate,
}: {
  plan: WorkoutPlan
  showUseTemplate?: boolean
  onUseTemplate?: () => void
}) {
  const goalLabel = PLAN_GOALS.find((g) => g.value === plan.goal)?.label ?? plan.goal
  const splitLabel = SPLIT_TYPES.find((s) => s.value === plan.splitType)?.label ?? plan.splitType
  const exerciseCount = plan.days.reduce((sum, d) => sum + d.exercises.length, 0)

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{plan.name || 'Untitled Plan'}</CardTitle>
          <PlanStatusBadge status={plan.status} />
        </div>
        {plan.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{plan.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <DifficultyBadge difficulty={plan.difficulty} />
          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border text-muted-foreground">
            {goalLabel}
          </span>
          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border text-muted-foreground">
            {splitLabel}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <IconCalendar className="w-3.5 h-3.5" />
            {plan.days.length} days
          </span>
          <span className="flex items-center gap-1">
            <IconBarbell className="w-3.5 h-3.5" />
            {exerciseCount} exercises
          </span>
          <span className="flex items-center gap-1">
            <IconUsers className="w-3.5 h-3.5" />
            {plan.assignedUsers.length}
          </span>
        </div>

        <div className="flex gap-2 pt-1">
          {showUseTemplate && onUseTemplate ? (
            <Button size="sm" variant="default" className="flex-1" onClick={onUseTemplate}>
              Use Template
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="flex-1" asChild>
              <Link href={`/dashboard/workouts/${plan.id}`}>View Plan</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
