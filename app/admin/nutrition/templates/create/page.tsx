'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { IconArrowLeft } from '@tabler/icons-react'
import { TemplateForm } from '@/components/nutrition/template-form'

export default function CreateTemplatePage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Link href="/admin/nutrition/templates">
        <Button variant="ghost" size="sm">
          <IconArrowLeft className="w-4 h-4 mr-2" />
          Back to Templates
        </Button>
      </Link>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">New Template</h2>
        <p className="text-muted-foreground">
          Build a reusable nutrition template with meals and foods
        </p>
      </div>
      <TemplateForm />
    </div>
  )
}
