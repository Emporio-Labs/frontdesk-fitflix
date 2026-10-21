'use client'

import { useParams, useRouter } from 'next/navigation'
import { ClinicalUserDialog } from '@/components/nutrition/clinical-user-dialog'

export default function NutritionMemberProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.id as string

  return (
    <div className="flex-1 p-4 sm:p-6">
      <ClinicalUserDialog
        userId={userId}
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            router.push('/admin/nutrition/my-clients')
          }
        }}
      />
    </div>
  )
}