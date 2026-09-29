'use client'

import { ReactNode } from 'react'
import { IconLock } from '@tabler/icons-react'
import { useAuth } from '@/hooks/use-auth'
import { useMyNutritionistClient } from '@/hooks/use-nutritionist-clients'
import { EmptyState } from '@/components/empty-state'
import { SkeletonCard } from '@/components/skeleton-loader'

interface NutritionistClientGateProps {
  userId: string
  children: ReactNode
}

// Enforces FX-06.3: a signed-in nutritionist can only see members assigned to
// them. Admin / clinician / other roles pass straight through (FX-06.4).
// Nothing beneath this gate mounts for a nutritionist unless the backend
// confirms ownership via GET /nutritionist/me/members/:id.
export function NutritionistClientGate({ userId, children }: NutritionistClientGateProps) {
  const { role } = useAuth()
  const isNutritionist = role === 'nutritionist'

  // Hook must be called unconditionally; empty userId disables the query.
  const { isLoading, isForbidden, isError } = useMyNutritionistClient(
    isNutritionist ? userId : ''
  )

  if (!isNutritionist) return <>{children}</>

  if (isLoading) return <SkeletonCard />

  if (isForbidden) {
    return (
      <EmptyState
        icon={<IconLock className="h-10 w-10 text-amber-500" />}
        title="Not your client"
        description="This member is assigned to a different nutritionist."
      />
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Unable to load client"
        description="Something went wrong loading this client. Please try again."
      />
    )
  }

  return <>{children}</>
}
