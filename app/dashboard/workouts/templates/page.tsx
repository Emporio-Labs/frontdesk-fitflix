'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkoutStore } from '@/stores/workout-store'
import { PlanCard } from '@/components/workouts/plan-card'
import { TemplateCategoryFilter } from '@/components/workouts/template-category-filter'
import { toast } from 'sonner'

export default function TemplatesPage() {
  const router = useRouter()
  const [category, setCategory] = useState('All')
  const { plans, loadPlan } = useWorkoutStore()

  const templates = plans.filter((p) => p.isTemplate)
  const filtered =
    category === 'All'
      ? templates
      : templates.filter(
          (t) =>
            t.templateCategory?.toLowerCase() === category.toLowerCase() ||
            t.goal?.replace('_', ' ').toLowerCase().includes(category.toLowerCase())
        )

  const handleUseTemplate = (plan: typeof plans[0]) => {
    loadPlan({
      ...plan,
      id: '',
      name: `${plan.name} (Copy)`,
      status: 'draft',
      isTemplate: false,
      assignedUsers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    toast.success('Template loaded into builder')
    router.push('/dashboard/workouts/create')
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Templates</h2>
        <p className="text-muted-foreground">
          Pre-built workout plans ready to customize and assign
        </p>
      </div>

      <TemplateCategoryFilter value={category} onValueChange={setCategory} />

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">
            {templates.length === 0
              ? 'No templates yet. Create a plan and mark it as a template.'
              : 'No templates match this filter.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              showUseTemplate
              onUseTemplate={() => handleUseTemplate(plan)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
