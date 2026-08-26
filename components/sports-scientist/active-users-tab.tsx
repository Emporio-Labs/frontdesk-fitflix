'use client'

import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SkeletonTable } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import { useUsers } from '@/hooks/use-users'
import {
  IconSearch,
  IconRefresh,
  IconUsers,
  IconDna,
  IconActivity,
  IconStethoscope,
} from '@tabler/icons-react'

type UserFilter = 'all' | 'activex' | 'vald' | 'sports_scientist'

export function ActiveUsersTab({
  initialFilter = 'all',
}: {
  initialFilter?: UserFilter
}) {
  const [filter, setFilter] = useState<UserFilter>(initialFilter)
  const [search, setSearch] = useState('')
  const { data: users = [], isLoading, isError, refetch } = useUsers()

  useEffect(() => {
    if (initialFilter) setFilter(initialFilter)
  }, [initialFilter])

  const counts = useMemo(() => {
    let activex = 0
    let vald = 0
    let ss = 0
    for (const u of users) {
      if (u.onboardingStatus?.activeXTestCompleted) activex++
      if (u.onboardingStatus?.valdTestCompleted) vald++
      if (u.onboardingStatus?.sportsScientistBooked) ss++
    }
    return {
      all: users.length,
      activex,
      vald,
      sports_scientist: ss,
    }
  }, [users])

  const filtered = useMemo(() => {
    let list = users
    if (filter === 'activex') {
      list = list.filter((u) => u.onboardingStatus?.activeXTestCompleted)
    } else if (filter === 'vald') {
      list = list.filter((u) => u.onboardingStatus?.valdTestCompleted)
    } else if (filter === 'sports_scientist') {
      list = list.filter((u) => u.onboardingStatus?.sportsScientistBooked)
    }

    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? '').toLowerCase().includes(q),
    )
  }, [users, filter, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Active Members</h3>
          <p className="text-sm text-muted-foreground">
            Fitflix members engaged with Sports Science and performance testing
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <IconRefresh className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border ${
                filter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm border-primary'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <IconUsers className="h-3.5 w-3.5" />
              <span>All Members</span>
              <span className="opacity-80">({counts.all})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('activex')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border ${
                filter === 'activex'
                  ? 'bg-emerald-600 text-white shadow-sm border-emerald-600'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              <IconDna className="h-3.5 w-3.5" />
              <span>Active X on File</span>
              <span className="font-bold">({counts.activex})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('vald')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border ${
                filter === 'vald'
                  ? 'bg-blue-600 text-white shadow-sm border-blue-600'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
              }`}
            >
              <IconActivity className="h-3.5 w-3.5" />
              <span>VALD Completed</span>
              <span className="font-bold">({counts.vald})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('sports_scientist')}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border ${
                filter === 'sports_scientist'
                  ? 'bg-purple-600 text-white shadow-sm border-purple-600'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
              }`}
            >
              <IconStethoscope className="h-3.5 w-3.5" />
              <span>SS Booked</span>
              <span className="font-bold">({counts.sports_scientist})</span>
            </button>
          </div>

          <div className="relative max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by username, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <SkeletonTable />
          ) : isError ? (
            <div className="py-8 text-center text-red-500">
              Failed to load users.{' '}
              <button className="underline" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<IconUsers className="h-10 w-10" />}
              title="No members found"
              description={
                search
                  ? 'No members match the current search.'
                  : filter === 'activex'
                  ? 'No members have completed an Active X test yet.'
                  : filter === 'vald'
                  ? 'No members have completed a VALD test yet.'
                  : 'No users to display.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Active X</TableHead>
                    <TableHead>VALD</TableHead>
                    <TableHead>Sports Scientist</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const activeXStatus = u.onboardingStatus?.activeXTestCompleted
                      ? 'completed'
                      : 'not_started'
                    const valdStatus = u.onboardingStatus?.valdTestCompleted
                      ? 'completed'
                      : 'not_started'
                    const ssStatus = u.onboardingStatus?.sportsScientistBooked
                      ? 'booked'
                      : 'pending'

                    return (
                      <TableRow key={u._id}>
                        <TableCell className="font-medium">{u.username}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.phone || '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={activeXStatus} size="sm" />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={valdStatus} size="sm" />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ssStatus} size="sm" />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/users/${u._id}`}>View Profile</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
