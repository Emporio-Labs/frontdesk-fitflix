'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { WorkoutStatsCards } from '@/components/workouts/workout-stats-cards'
import { WorkoutCompletionChart } from '@/components/workouts/workout-completion-chart'
import { EngagementChart } from '@/components/workouts/engagement-chart'
import { RecentPlansList } from '@/components/workouts/recent-plans-list'
import { ActiveUsersGrid } from '@/components/workouts/active-users-grid'

export default function WorkoutsPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workouts</h2>
          <p className="text-muted-foreground">
            Create, manage, and assign workout plans to members
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/workouts/create">
            <IconPlus className="w-4 h-4 mr-2" />
            Create Plan
          </Link>
        </Button>
      </div>

      <WorkoutStatsCards />

      <div className="grid gap-4 md:grid-cols-2">
        <WorkoutCompletionChart />
        <EngagementChart />
      </div>

      <RecentPlansList />

      <ActiveUsersGrid />
    </div>
  )
}
