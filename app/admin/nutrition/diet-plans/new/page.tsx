'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { IconArrowLeft } from '@tabler/icons-react'
import { ClinicalTemplateForm } from '@/components/nutrition/clinical-template-form'
import { UserClinicalSummary } from '@/components/nutrition/user-clinical-summary'
import {
  NutritionTargetCards,
  type NutritionTargetValues,
} from '@/components/nutrition/nutrition-target-cards'
import { useUser } from '@/hooks/use-users'
import { useNutritionAssessment } from '@/hooks/use-nutrition'
import { useNutritionistWorkspace } from '@/stores/nutritionist-workspace-store'
import {
  computeNutritionTargets,
  profileFromUser,
} from '@/lib/nutrition/derive-targets'

function NewClinicalTemplatePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedUserId } = useNutritionistWorkspace()
  const userId = searchParams.get('userId') || selectedUserId || ''

  const { data: user } = useUser(userId)
  const { data: assessment } = useNutritionAssessment(userId)

  const derived = useMemo(() => {
    if (!user) return null
    return computeNutritionTargets(null, assessment, profileFromUser(user))
  }, [user, assessment])

  const [targets, setTargets] = useState<NutritionTargetValues>({
    calories: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
    waterMl: null,
  })
  const [touched, setTouched] = useState(false)

  // Sync derived values into local state until the nutritionist edits manually.
  useEffect(() => {
    if (!derived || touched) return
    setTargets({
      calories: derived.calories,
      proteinG: derived.proteinG,
      carbsG: derived.carbsG,
      fatG: derived.fatG,
      waterMl: derived.waterMl,
    })
  }, [derived, touched])

  const handleTargetsChange = (next: NutritionTargetValues) => {
    setTouched(true)
    setTargets(next)
  }

  const backHref = userId
    ? `/admin/nutrition?tab=bookings&review=${userId}`
    : '/admin/nutrition?tab=diet-plans'

  return (
    <div className="flex-1 space-y-5 p-8 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(backHref)}>
          <IconArrowLeft className="mr-2 h-4 w-4" />
          {userId ? 'Back to review' : 'Back'}
        </Button>
        {user && (
          <p className="text-sm text-muted-foreground">
            Reviewing plan for{' '}
            <Link
              href={`/admin/nutrition?tab=bookings&review=${userId}`}
              className="font-semibold text-foreground hover:underline"
            >
              {user.username || user.email}
            </Link>
          </p>
        )}
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          New Clinical Diet Plan
        </h2>
        <p className="text-muted-foreground">
          Personalized clinical plan with multi-option meals, timeline slots, and
          lifestyle recommendations
        </p>
      </div>

      <ClinicalTemplateForm
        userId={userId || undefined}
      />
    </div>
  )
}

export default function NewClinicalTemplatePage() {
  return (
    <Suspense fallback={<div className="flex-1 p-8 pt-6 text-muted-foreground">Loading plan page...</div>}>
      <NewClinicalTemplatePageContent />
    </Suspense>
  )
}
