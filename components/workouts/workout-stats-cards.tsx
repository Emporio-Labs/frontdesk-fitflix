'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  IconClipboardList,
  IconPlayerPlay,
  IconEdit,
  IconUsers,
  IconChartBar,
  IconTemplate,
} from '@tabler/icons-react'
import { useWorkoutStore } from '@/stores/workout-store'

export function WorkoutStatsCards() {
  const plans = useWorkoutStore((s) => s.plans)

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
    },
    {
      title: 'Active Plans',
      value: activePlans,
      sub: 'currently assigned',
      icon: <IconPlayerPlay className="w-4 h-4 text-emerald-500" />,
      href: '/dashboard/workouts',
    },
    {
      title: 'Drafts',
      value: draftPlans,
      sub: 'in progress',
      icon: <IconEdit className="w-4 h-4 text-amber-500" />,
      href: '/dashboard/workouts',
    },
    {
      title: 'Assigned Users',
      value: assignedUsers,
      sub: 'unique members',
      icon: <IconUsers className="w-4 h-4 text-violet-500" />,
      href: '/dashboard/workouts',
    },
    {
      title: 'Exercises Used',
      value: totalExercises,
      sub: 'across all plans',
      icon: <IconChartBar className="w-4 h-4 text-rose-500" />,
      href: '/dashboard/workouts',
    },
    {
      title: 'Templates',
      value: templates,
      sub: 'reusable plans',
      icon: <IconTemplate className="w-4 h-4 text-teal-500" />,
      href: '/dashboard/workouts/templates',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((s) => (
        <Link key={s.title} href={s.href} className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              {s.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
