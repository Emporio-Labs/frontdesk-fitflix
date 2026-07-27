'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { IconEye, IconRefresh } from '@tabler/icons-react'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTable } from '@/components/skeleton-loader'
import { useAdminUsers } from '@/hooks/use-community'
import { formatDateTime } from './shared'

const ANY = 'any'

export function UsersTab() {
  const [status, setStatus] = useState(ANY)
  const [role, setRole] = useState(ANY)
  const [search, setSearch] = useState('')

  const filters: Record<string, string> = {}
  if (status !== ANY) filters.status = status
  if (role !== ANY) filters.role = role

  const { data: users = [], isLoading, isError, refetch } = useAdminUsers(filters)

  // The list endpoint is capped server-side; searching narrows what came back
  // rather than issuing a second query.
  const term = search.trim().toLowerCase()
  const visible = term
    ? users.filter((u) => (u.username ?? '').toLowerCase().includes(term))
    : users

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-9 bg-background focus-visible:ring-1"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All roles</SelectItem>
            <SelectItem value="trainer">Trainers only</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto h-9 px-3 text-xs">
          <IconRefresh className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </div>

      <Card className="border-border shadow-sm bg-card overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/60">
          <CardTitle className="text-lg font-bold text-foreground">Community members</CardTitle>
          <CardDescription>{isLoading ? 'Loading…' : `${visible.length} shown`}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <div className="text-center py-8 text-destructive">Failed to load members.</div>
          ) : isLoading ? (
            <div className="p-6"><SkeletonTable /></div>
          ) : visible.length === 0 ? (
            <EmptyState title="No members match these filters" />
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader className="bg-muted/30 border-b border-border/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 font-semibold w-[220px]">Member</TableHead>
                    <TableHead className="font-semibold w-[140px]">Status</TableHead>
                    <TableHead className="font-semibold w-[140px]">Community role</TableHead>
                    <TableHead className="font-semibold w-[190px]">Suspended until</TableHead>
                    <TableHead className="font-semibold w-[190px]">Joined</TableHead>
                    <TableHead className="text-right pr-6 font-semibold w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/20 border-b border-border/40 transition-colors">
                      <TableCell className="pl-6 font-semibold text-foreground">
                        {user.username ?? '—'}
                      </TableCell>
                      <TableCell><StatusBadge status={user.status} size="sm" /></TableCell>
                      <TableCell>
                        {user.communityRole === 'trainer' ? (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-full">Trainer</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Member</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {user.suspendedUntil ? formatDateTime(user.suspendedUntil) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDateTime(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-2">
                        <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0" title="Open member">
                          <Link href={`/admin/community/users/${user.id}`}><IconEye className="w-4 h-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
