'use client'

import { useParams } from 'next/navigation'
import { useWorkoutStore } from '@/stores/workout-store'
import { useWorkoutPlan } from '@/hooks/use-workout-plans'
import { PlanBuilderLayout } from '@/components/workouts/plan-builder-layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import type { WorkoutPlan } from '@/types/workout'

const isMongoId = (id: string): boolean => /^[0-9a-f]{24}$/i.test(id)

/** Map the raw API/lean response to the frontend WorkoutPlan shape. */
function normalizeApiPlan(raw: any): WorkoutPlan {
  return {
    ...raw,
    // .lean() returns _id; Mongoose Documents expose the virtual `id` too — handle both
    id: raw._id?.toString() ?? raw.id,
    // Backend stores null by default; our Zod schema only accepts string | undefined
    templateCategory: raw.templateCategory ?? undefined,
    description: raw.description ?? undefined,
    // assignedUsers may be populated objects or plain string IDs
    assignedUsers: (raw.assignedUsers || []).map((u: any) =>
      typeof u === 'string' ? u : (u._id?.toString() ?? u.id ?? '')
    ),
  }
}

export default function EditWorkoutPage() {
  const params = useParams()
  const plans = useWorkoutStore((s) => s.plans)
  const planId = params.id as string

  // Only query the API when the URL ID is a real MongoDB ObjectId.
  // Passing '' disables the query (enabled: !!id → false).
  const apiQueryId = isMongoId(planId) ? planId : ''
  const { data: apiData, isLoading } = useWorkoutPlan(apiQueryId)

  // Zustand fallback — used while the API call is in-flight or for local-only plans
  const zustandPlan = plans.find((p) => p.id === planId)

  // Prefer fresh server data once it arrives; fall back to the Zustand snapshot
  const plan: WorkoutPlan | undefined = apiData
    ? normalizeApiPlan(apiData)
    : zustandPlan

  if (isLoading && !zustandPlan) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading plan…</p>
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
