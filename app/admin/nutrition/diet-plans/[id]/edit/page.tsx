'use client'

import { useParams, useRouter } from 'next/navigation'
import { IconArrowLeft } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/skeleton-loader'
import { ClinicalTemplateForm } from '@/components/nutrition/clinical-template-form'
import { useNutritionTemplate } from '@/hooks/use-nutrition'

export default function EditDietPlanTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? '')

  const { data: template, isLoading, isError } = useNutritionTemplate(id)

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
        <SkeletonCard />
      </div>
    )
  }

  if (isError || !template) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/nutrition?tab=diet-plans')}
        >
          <IconArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="p-8 text-center text-muted-foreground">
          Diet plan template not found.
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
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
          <h2 className="text-3xl font-bold tracking-tight">Edit Diet Plan Template</h2>
          <p className="text-muted-foreground">
            Modifying master template: {template.name}
          </p>
        </div>
      </div>

      <ClinicalTemplateForm template={template} mode="template" />
    </div>
  )
}
