<<<<<<< Updated upstream
=======
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton, SkeletonCard } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import {
  IconUsers,
  IconSearch,
  IconArrowRight,
  IconAlertTriangle,
} from '@tabler/icons-react'
import { useMyNutritionistClients } from '@/hooks/use-nutritionist-clients'

type ClientRow = {
  id: string
  name: string
  email?: string
  phone?: string
  goal?: string
}

function normalizeClient(raw: any): ClientRow | null {
  if (!raw) return null
  const id = raw._id ?? raw.id
  if (!id) return null
  const name = raw.username || raw.name || raw.email || raw.phone || 'Member'
  const goalList: string[] | undefined = raw.healthGoals
  const goal = Array.isArray(goalList) && goalList.length ? goalList[0] : undefined
  return {
    id: String(id),
    name,
    email: raw.email,
    phone: raw.phone,
    goal,
  }
}

export default function MyClientsPage() {
  const { data: rawClients = [], isLoading, isError, error } = useMyNutritionistClients()
  const [search, setSearch] = useState('')

  const clients = useMemo(
    () =>
      (rawClients as any[])
        .map(normalizeClient)
        .filter((c): c is ClientRow => c !== null),
    [rawClients]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) =>
      [c.name, c.email, c.phone].filter(Boolean).some((v) => v!.toLowerCase().includes(q))
    )
  }, [clients, search])

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">My Clients</h2>
          <p className="text-muted-foreground text-sm">
            Members currently assigned to your nutritionist roster
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<IconAlertTriangle className="h-10 w-10" />}
              title="Couldn't load your clients"
              description={
                (error as any)?.response?.data?.message ||
                'Try refreshing the page, or contact support if this keeps happening.'
              }
            />
          </CardContent>
        </Card>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<IconUsers className="h-10 w-10" />}
              title="No clients assigned yet"
              description="A clinic admin will assign members to your roster. Once they do, you'll see them here."
            />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<IconSearch className="h-10 w-10" />}
              title="No matches"
              description={`No clients match "${search}".`}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Assigned members</CardTitle>
            <CardDescription>
              {clients.length} client{clients.length === 1 ? '' : 's'} on your roster
              {search ? ` · ${filtered.length} shown` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs font-medium">
                        {c.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      {c.email && (
                        <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                      )}
                      {c.phone && !c.email && (
                        <p className="truncate text-xs text-muted-foreground">{c.phone}</p>
                      )}
                      {c.goal && (
                        <Badge variant="outline" className="mt-1.5 text-[10px]">
                          {c.goal}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 w-full text-xs font-medium"
                  >
                    <Link href={`/admin/nutrition/my-clients/${c.id}`}>
                      Open profile
                      <IconArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
>>>>>>> Stashed changes
