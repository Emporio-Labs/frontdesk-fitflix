'use client'

import { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PlanBuilderLayout } from '@/components/workouts/plan-builder-layout'
import { Button } from '@/components/ui/button'
import { useWorkoutPlan } from '@/hooks/use-workout-plans'
import { normalizeApiPlan, templateToDraft } from '@/lib/normalize-workout-plan'

const isMongoId = (id: string): boolean => /^[0-9a-f]{24}$/i.test(id)

/** `?from=<planId>` starts the builder from an unsaved copy of that plan. */
function CreateWorkoutContent() {
  const from = useSearchParams().get('from') ?? ''
  const templateId = isMongoId(from) ? from : ''
  const { data, isLoading, isError } = useWorkoutPlan(templateId)

  // Memoised so the builder's load effect runs once per fetched template,
  // not on every render (which would wipe the user's edits).
  const draft = useMemo(() => (data ? templateToDraft(normalizeApiPlan(data)) : undefined), [data])

  if (!templateId) return <PlanBuilderLayout mode="create" />

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading template…</p>
      </div>
    )
  }

  if (isError || !draft) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <p className="text-sm text-muted-foreground mb-4">Template not found</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/workouts/templates">Back to Templates</Link>
        </Button>
      </div>
    )
  }

  return <PlanBuilderLayout mode="create" initialPlan={draft} />
}

export default function CreateWorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <CreateWorkoutContent />
    </Suspense>
  )
}
