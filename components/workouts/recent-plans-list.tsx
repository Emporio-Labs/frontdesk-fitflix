'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlanStatusBadge } from '@/components/workouts/plan-status-badge'
import { DifficultyBadge } from '@/components/workouts/difficulty-badge'
import { useWorkoutPlans } from '@/hooks/use-workout-plans'

export function RecentPlansList() {
  const { data: plansData } = useWorkoutPlans({ limit: 5 })
  const recent = plansData?.plans ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Plans</CardTitle>
          <CardDescription>Latest workout plans created</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/workouts">View all →</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No workout plans yet. Create your first one!
          </p>
        ) : (
          <div className="space-y-2">
            {recent.map((plan) => (
              <Link
                key={plan._id}
                href={`/dashboard/workouts/${plan._id}`}
                className="flex items-center justify-between py-2.5 px-2 rounded-md border-b last:border-0 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{plan.name || 'Untitled Plan'}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.days.length} days · {plan.assignedUsers.length} users
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <DifficultyBadge difficulty={plan.difficulty} />
                  <PlanStatusBadge status={plan.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
