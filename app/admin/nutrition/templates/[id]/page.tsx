'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonCard } from '@/components/skeleton-loader'
import { IconArrowLeft } from '@tabler/icons-react'
import { TemplateForm } from '@/components/nutrition/template-form'
import { useNutritionTemplate } from '@/hooks/use-nutrition'

export default function TemplateDetailPage() {
  const params = useParams()
  const id = String(params?.id ?? '')
  const { data: template, isLoading, isError } = useNutritionTemplate(id)

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Link href="/admin/nutrition">
        <Button variant="ghost" size="sm">
          <IconArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </Link>

      {isLoading ? (
        <SkeletonCard />
      ) : isError || !template ? (
        <Card>
          <CardHeader>
            <CardTitle>Template not found</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            This template could not be loaded.
          </CardContent>
        </Card>
      ) : (
        <>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{template.name}</h2>
            <p className="text-muted-foreground">
              {template.goal.replace(/([a-z])([A-Z])/g, '$1 $2')} · {template.targetCaloriesKcal ?? '—'} kcal
            </p>
          </div>
          <TemplateForm template={template} />
        </>
      )}
    </div>
  )
}
