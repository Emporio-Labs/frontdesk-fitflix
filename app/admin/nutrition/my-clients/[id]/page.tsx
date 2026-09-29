'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/skeleton-loader'
import { IconArrowLeft } from '@tabler/icons-react'
import { useUser } from '@/hooks/use-users'
import { NutritionistClientGate } from '@/components/nutrition/nutritionist-client-gate'
import { ClientNutritionWorkspace } from '@/components/nutrition/client-nutrition-workspace'

export default function NutritionistClientProfilePage() {
  const params = useParams<{ id?: string | string[] }>()
  const router = useRouter()
  const idParam = params?.id
  const userId = Array.isArray(idParam) ? idParam[0] : idParam || ''

  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Link href="/admin/nutrition/my-clients" className="text-xs text-muted-foreground hover:underline">
          My Clients
        </Link>
      </div>

      <NutritionistClientGate userId={userId}>
        <ClientProfileHeader userId={userId} />
        <ClientNutritionWorkspace userId={userId} />
      </NutritionistClientGate>
    </div>
  )
}

function ClientProfileHeader({ userId }: { userId: string }) {
  const { data: user, isLoading } = useUser(userId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>
    )
  }

  if (!user) return null

  const displayName = user.username || user.email || 'Member'
  const initial = displayName.charAt(0).toUpperCase()
  const goals: string[] = user.healthGoals ?? []

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-lg shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {displayName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user.email || '—'}
              {user.phone ? ` · ${user.phone}` : ''}
            </p>
            {goals.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {goals.slice(0, 4).map((g) => (
                  <Badge key={g} variant="outline" className="text-[11px]">
                    {g}
                  </Badge>
                ))}
                {goals.length > 4 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{goals.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
