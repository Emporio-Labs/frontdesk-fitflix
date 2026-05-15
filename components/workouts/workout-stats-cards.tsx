'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconClipboardList,
  IconPlayerPlay,
  IconEdit,
  IconUsers,
  IconChartBar,
  IconTemplate,
  IconFlame,
  IconBarbell,
} from '@tabler/icons-react'
import { useWorkoutPlans } from '@/hooks/use-workout-plans'
import { useWorkoutStats } from '@/hooks/use-workouts'

export function WorkoutStatsCards() {
  const { data: plansData, isLoading: plansLoading } = useWorkoutPlans()
  const { data: backendStats, isLoading: statsLoading } = useWorkoutStats()

  const plans = plansData?.plans ?? []
  const activePlans = plans.filter((p) => p.status === 'Active').length
  const draftPlans = plans.filter((p) => p.status === 'Draft').length
  const templates = plans.filter((p) => p.isTemplate).length
  const assignedUsers = new Set(plans.flatMap((p) => p.assignedUsers)).size
  const totalExercises = plans.reduce(
    (sum, p) => sum + p.days.reduce((ds, d) => ds + d.exercises.length, 0),
    0
  )

  const stats = [
    {
      title: 'Total Plans',
      value: plans.length,
      sub: 'workout plans created',
      icon: <IconClipboardList className="w-4 h-4 text-blue-500" />,
      href: '/dashboard/workouts',
      loading: plansLoading,
    },
    {
      title: 'Active Plans',
      value: activePlans,
      sub: 'currently assigned',
      icon: <IconPlayerPlay className="w-4 h-4 text-emerald-500" />,
      href: '/dashboard/workouts',
      loading: plansLoading,
    },
    {
      title: 'Weekly Workouts',
      value: backendStats?.weeklyWorkouts ?? 0,
      sub: 'sessions this week',
      icon: <IconFlame className="w-4 h-4 text-orange-500" />,
      href: '/dashboard/workouts',
      loading: statsLoading,
    },
    {
      title: 'Current Streak',
      value: backendStats?.currentStreak ?? 0,
      sub: 'consecutive days',
      icon: <IconBarbell className="w-4 h-4 text-violet-500" />,
      href: '/dashboard/workouts',
      loading: statsLoading,
    },
    {
      title: 'Assigned Users',
      value: assignedUsers,
      sub: 'unique members',
      icon: <IconUsers className="w-4 h-4 text-violet-500" />,
      href: '/dashboard/workouts',
      loading: plansLoading,
    },
    {
      title: 'Drafts',
      value: draftPlans,
      sub: 'in progress',
      icon: <IconEdit className="w-4 h-4 text-amber-500" />,
      href: '/dashboard/workouts',
      loading: plansLoading,
    },
    {
      title: 'Exercises Used',
      value: totalExercises,
      sub: 'across all plans',
      icon: <IconChartBar className="w-4 h-4 text-rose-500" />,
      href: '/dashboard/workouts',
      loading: plansLoading,
    },
    {
      title: 'Templates',
      value: templates,
      sub: 'reusable plans',
      icon: <IconTemplate className="w-4 h-4 text-teal-500" />,
      href: '/dashboard/workouts/templates',
      loading: plansLoading,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
      {stats.map((s) => (
        <Link key={s.title} href={s.href} className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              {s.icon}
            </CardHeader>
            <CardContent>
              {s.loading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className="text-2xl font-bold">{s.value}</div>
              )}
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
