'use client'

import { useParams, useRouter } from 'next/navigation'
import { useWorkoutStore } from '@/stores/workout-store'
import { PlanBuilderLayout } from '@/components/workouts/plan-builder-layout'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function EditWorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const plans = useWorkoutStore((s) => s.plans)
  const planId = params.id as string
  const plan = plans.find((p) => p.id === planId)

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
