'use client'

import { useParams } from 'next/navigation'
import { useWorkoutPlan } from '@/hooks/use-workout-plans'
import { PlanBuilderLayout } from '@/components/workouts/plan-builder-layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

export default function EditWorkoutPage() {
  const params = useParams()
  const planId = params.id as string
  const { data: plan, isLoading } = useWorkoutPlan(planId)

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <p className="text-sm text-muted-foreground mb-4">Plan not found</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/workouts">Back to Workouts</Link>
        </Button>
      </div>
    )
  }

  return <PlanBuilderLayout mode="edit" plan={plan} />
}
