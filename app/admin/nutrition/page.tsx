'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/skeleton-loader'
import {
  IconApple,
  IconClipboardList,
  IconChartBar,
  IconToolsKitchen2,
} from '@tabler/icons-react'
import {
  useFoods,
  useNutritionTemplates,
  useNutritionPlans,
} from '@/hooks/use-nutrition'

const SECTIONS = [
  {
    href: '/admin/nutrition/foods',
    title: 'Food Catalog',
    description: 'Reusable foods with per-serving macros',
    icon: IconApple,
  },
  {
    href: '/admin/nutrition/templates',
    title: 'Templates',
    description: 'Reusable nutritionist-owned meal plans',
    icon: IconToolsKitchen2,
  },
  {
    href: '/admin/nutrition/plans',
    title: 'Assigned Plans',
    description: 'Plans assigned to members',
    icon: IconClipboardList,
  },
  {
    href: '/admin/nutrition/adherence',
    title: 'Adherence Analytics',
    description: 'Calorie & meal adherence rollups',
    icon: IconChartBar,
  },
]

function StatCard({
  label,
  value,
  loading,
}: {
  label: string
  value: number
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  )
}

export default function NutritionHubPage() {
  const foods = useFoods()
  const templates = useNutritionTemplates()
  const plans = useNutritionPlans()

  const activePlans = (plans.data ?? []).filter(
    (p) => p.status === 'active' || p.status === 'assigned'
  ).length

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Nutrition</h2>
        <p className="text-muted-foreground">
          Manage food catalog, templates, assigned plans and adherence
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Foods in catalog"
          value={foods.data?.length ?? 0}
          loading={foods.isLoading}
        />
        <StatCard
          label="Templates"
          value={templates.data?.length ?? 0}
          loading={templates.isLoading}
        />
        <StatCard
          label="Active / assigned plans"
          value={activePlans}
          loading={plans.isLoading}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          return (
            <Link key={s.href} href={s.href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <Icon className="w-8 h-8 text-muted-foreground" />
                  <CardTitle className="mt-2">{s.title}</CardTitle>
                  <CardDescription>{s.description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
