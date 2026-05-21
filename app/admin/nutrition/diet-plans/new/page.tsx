'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { IconArrowLeft } from '@tabler/icons-react'
import { ClinicalTemplateForm } from '@/components/nutrition/clinical-template-form'

export default function NewClinicalTemplatePage() {
  const router = useRouter()
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <IconArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          New Clinical Diet Plan
        </h2>
        <p className="text-muted-foreground">
          Multi-option meals with timeline slots, clinical reasoning, and
          lifestyle recommendations
        </p>
      </div>
      <ClinicalTemplateForm />
    </div>
  )
}
