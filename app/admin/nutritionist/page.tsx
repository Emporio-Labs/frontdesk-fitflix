'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { IconRefresh, IconSalad } from '@tabler/icons-react'
import { useUsers } from '@/hooks/use-users'
import { User } from '@/lib/services/user.service'
import { StatusBadge } from '@/components/status-badge'

type Segment = 'pending' | 'booked' | 'all'

export default function NutritionistPage() {
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<Segment>('pending')
  const { data: users = [], isLoading, isError, refetch } = useUsers()

  const counts = useMemo(() => {
    const booked = users.filter((u) => !!u.onboardingStatus?.nutritionistBooked).length
    const pending = users.length - booked
    return { booked, pending, total: users.length }
  }, [users])

  const segmented = useMemo(() => {
    if (segment === 'all') return users
    if (segment === 'booked') {
      return users.filter((u) => !!u.onboardingStatus?.nutritionistBooked)
    }
    return users.filter((u) => !u.onboardingStatus?.nutritionistBooked)
  }, [users, segment])

  const filtered = useMemo(() => {
    if (!search) return segmented
    const q = search.toLowerCase()
    return segmented.filter(
      (u: User) =>
        u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [segmented, search])

  const emptyMessage =
    segment === 'booked'
      ? 'No members have booked the nutritionist yet.'
      : segment === 'pending'
      ? 'No pending members for the nutritionist step.'
      : 'No members found.'

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-3">
        <IconSalad className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nutritionist</h2>
          <p className="text-muted-foreground">
            Members segmented by nutritionist onboarding state
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Booked</CardDescription>
            <CardTitle className="text-3xl">{isLoading ? '—' : counts.booked}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl">{isLoading ? '—' : counts.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Members</CardDescription>
            <CardTitle className="text-3xl">{isLoading ? '—' : counts.total}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={segment} onValueChange={(v) => setSegment(v as Segment)}>
        <div className="flex flex-wrap items-center gap-3">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="booked">Booked</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <Input
            placeholder="Search by username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <IconRefresh className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        <TabsContent value={segment} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `${filtered.length} ${filtered.length === 1 ? 'member' : 'members'}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isError && (
                <div className="text-center py-8 text-red-500">
                  Failed to load members. Check credentials.
                </div>
              )}
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Onboarding Step</TableHead>
                        <TableHead>Nutritionist</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            {emptyMessage}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((user) => {
                          const booked = !!user.onboardingStatus?.nutritionistBooked
                          const step = user.onboardingStatus?.currentStep?.replace(/_/g, ' ') ?? '—'
                          return (
                            <TableRow key={user._id}>
                              <TableCell className="font-medium">{user.username}</TableCell>
                              <TableCell className="text-muted-foreground">{user.email}</TableCell>
                              <TableCell className="text-muted-foreground">{user.phone || '—'}</TableCell>
                              <TableCell>{step}</TableCell>
                              <TableCell>
                                <StatusBadge status={booked ? 'booked' : 'pending'} size="sm" />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/admin/users/${user._id}`}>View User</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
