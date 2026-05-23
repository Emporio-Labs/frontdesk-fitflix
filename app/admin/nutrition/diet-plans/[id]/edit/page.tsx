'use client'

import { useParams, useRouter } from 'next/navigation'
import { IconArrowLeft } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/skeleton-loader'
import { ClinicalTemplateForm } from '@/components/nutrition/clinical-template-form'
import { useNutritionPlan } from '@/hooks/use-nutrition'

export default function EditAssignedPlanPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? '')

  const { data: plan, isLoading, isError } = useNutritionPlan(id)

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SkeletonCard />
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/nutrition?tab=diet-plans')}
        >
          <IconArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="p-8 text-center text-muted-foreground">
          Assigned plan not found.
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/nutrition?tab=diet-plans')}
        >
          <IconArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Assigned Plan</h2>
          <p className="text-muted-foreground">
            Modifying full nutrition structure for {plan.member?.username || plan.userName || 'Member'}
          </p>
        </div>
      </div>

      <ClinicalTemplateForm plan={plan} mode="plan" />
    </div>
  )
}
