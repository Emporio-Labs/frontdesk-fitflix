'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SkeletonCard } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import {
  IconChevronLeft,
  IconLock,
  IconAlertTriangle,
  IconMail,
  IconPhone,
} from '@tabler/icons-react'
import { useMyNutritionistClient } from '@/hooks/use-nutritionist-clients'
import { NutritionWorkspace } from '@/components/nutrition/my-nutrition-dashboard'
import type { User } from '@/lib/services/user.service'

// Coerce the untyped `{ member }` payload from the nutritionist scope into the
// shape NutritionWorkspace needs. Anything the backend omits (weight, goals) is
// handled by the workspace's tiered target ladder.
function toUser(raw: any, id: string): User {
  return {
    ...(raw ?? {}),
    _id: String(raw?._id ?? raw?.id ?? id),
    id: String(raw?.id ?? raw?._id ?? id),
    username: raw?.username ?? raw?.name ?? '',
    email: raw?.email ?? '',
    phone: raw?.phone ?? '',
    age: raw?.age ?? 0,
    gender: raw?.gender ?? '',
    healthGoals: Array.isArray(raw?.healthGoals) ? raw.healthGoals : [],
    createdAt: raw?.createdAt ?? '',
    updatedAt: raw?.updatedAt ?? '',
  } as User
}

const BackLink = () => (
  <Button variant="outline" size="sm" asChild className="h-8 px-2">
    <Link href="/admin/nutrition/my-clients">
      <IconChevronLeft className="h-4 w-4" />
      Back to My Clients
    </Link>
  </Button>
)

export default function MyClientProfilePage() {
  const params = useParams<{ userId: string }>()
  const userId = params?.userId ?? ''

  const { data, isLoading, isError, isForbidden, error } = useMyNutritionistClient(userId)

  const member = data?.member
  const user = useMemo(() => (member ? toUser(member, userId) : null), [member, userId])

  const displayName = user?.username || user?.email || user?.phone || 'Member'

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <BackLink />
        <span className="text-xs text-muted-foreground">
          Nutrition / My Clients{user ? ` / ${displayName}` : ''}
        </span>
      </div>

      {isForbidden ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<IconLock className="h-10 w-10" />}
              title="This member isn't on your roster"
              description="You can only view members assigned to you. If you think this is a mistake, contact a clinic admin."
              action={
                <Button asChild variant="outline">
                  <Link href="/admin/nutrition/my-clients">Back to My Clients</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : isLoading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : isError || !user ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<IconAlertTriangle className="h-10 w-10" />}
              title="Couldn't load this client"
              description={
                (error as any)?.response?.data?.message ||
                'Try refreshing the page, or return to your client list.'
              }
              action={
                <Button asChild variant="outline">
                  <Link href="/admin/nutrition/my-clients">Back to My Clients</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="sr-only">Client summary</CardTitle>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-2xl font-bold tracking-tight">{displayName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {user.email && (
                      <span className="flex items-center gap-1">
                        <IconMail className="h-3.5 w-3.5" />
                        {user.email}
                      </span>
                    )}
                    {user.phone && (
                      <span className="flex items-center gap-1">
                        <IconPhone className="h-3.5 w-3.5" />
                        {user.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <NutritionWorkspace userId={user._id} selectedUser={user} />
        </>
      )}
    </div>
  )
}
