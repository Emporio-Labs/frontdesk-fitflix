'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkoutPlans } from '@/hooks/use-workout-plans'
import { PlanCard } from '@/components/workouts/plan-card'
import { TemplateCategoryFilter } from '@/components/workouts/template-category-filter'
import { ImportPlanDialog } from '@/components/workouts/import-plan-dialog'
import { AssignTemplateDialog } from '@/components/workouts/assign-template-dialog'
import type { WorkoutPlan } from '@/types/workout'

export default function TemplatesPage() {
  const router = useRouter()
  const [category, setCategory] = useState('All')
  const [assigning, setAssigning] = useState<WorkoutPlan | null>(null)
  // Ask for templates only, at the API's max page size: the default page of 20
  // mixed plans silently dropped templates once there were more than 20 plans.
  const { data: plansData } = useWorkoutPlans({ isTemplate: true, limit: 100 })
  const plans = plansData?.plans ?? []

  const templates = plans.filter((p) => p.isTemplate)
  const filtered =
    category === 'All'
      ? templates
      : templates.filter(
          (t) =>
            t.templateCategory?.toLowerCase() === category.toLowerCase() ||
            t.goal?.replace(/([A-Z])/g, ' $1').trim().toLowerCase().includes(category.toLowerCase())
        )

  // The builder fetches the template itself; handing it over through the
  // store didn't work because create mode resets the store on mount.
  const handleUseTemplate = (plan: WorkoutPlan) => {
    router.push(`/dashboard/workouts/create?from=${plan._id}`)
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Templates</h2>
          <p className="text-muted-foreground">
            Pre-built workout plans ready to customize and assign
          </p>
        </div>
        <ImportPlanDialog triggerVariant="default" />
      </div>

      <TemplateCategoryFilter value={category} onValueChange={setCategory} />

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">
            {templates.length === 0
              ? 'No templates yet. Create a plan and mark it as a template, or import one from Excel.'
              : 'No templates match this filter.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plan) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              showUseTemplate
              onUseTemplate={() => handleUseTemplate(plan)}
              onAssign={() => setAssigning(plan)}
            />
          ))}
        </div>
      )}

      <AssignTemplateDialog plan={assigning} onOpenChange={(open) => !open && setAssigning(null)} />
    </div>
  )
}
