'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  IconRefresh, IconGavel, IconShield, IconShieldOff, IconBan,
  IconLockOpen, IconStarFilled, IconStarOff, IconEye,
} from '@tabler/icons-react'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTable } from '@/components/skeleton-loader'
import {
  useAdminUsers, useSuspendUser, useUnsuspendUser, useBanUser, useUnbanUser,
  useAssignTrainer, useRevokeTrainer,
} from '@/hooks/use-community'
import { AdminUserRow } from '@/lib/services/community.service'
import { ModerationDialog } from './moderation-dialog'
import { StatusBadge, formatDateTime } from './shared'

const ANY = 'any'

type UserAction = 'suspend' | 'unsuspend' | 'ban' | 'unban'

const ACTION_META: Record<UserAction, {
  title: string
  description: string
  confirmLabel: string
  destructive: boolean
  requireStepUp: boolean
  requireReason: boolean
}> = {
  suspend: {
    title: 'Suspend member',
    description: 'The member cannot post or comment while suspended. Their content stays visible.',
    confirmLabel: 'Suspend',
    destructive: true,
    requireStepUp: true,
    requireReason: true,
  },
  unsuspend: {
    title: 'Lift suspension',
    description: 'The member regains posting and commenting privileges immediately.',
    confirmLabel: 'Lift suspension',
    destructive: false,
    requireStepUp: false,
    requireReason: false,
  },
  ban: {
    title: 'Ban member',
    description: 'The member is permanently blocked from the community. Their content stays visible unless deleted separately.',
    confirmLabel: 'Ban',
    destructive: true,
    requireStepUp: true,
    requireReason: true,
  },
  unban: {
    title: 'Lift ban',
    description: 'The member is restored to normal standing.',
    confirmLabel: 'Lift ban',
    destructive: false,
    requireStepUp: false,
    requireReason: false,
  },
}

export function MembersTab() {
  const [status, setStatus] = useState(ANY)
  const [role, setRole] = useState(ANY)
  const [search, setSearch] = useState('')

  const filters: Record<string, string> = {}
  if (status !== ANY) filters.status = status
  if (role !== ANY) filters.communityRole = role
  if (search.trim()) filters.q = search.trim()

  const { data: users = [], isLoading, isError, refetch } = useAdminUsers(filters)

  const suspend = useSuspendUser()
  const unsuspend = useUnsuspendUser()
  const ban = useBanUser()
  const unban = useUnbanUser()
  const assignTrainer = useAssignTrainer()
  const revokeTrainer = useRevokeTrainer()

  const [pending, setPending] = useState<{ user: AdminUserRow; action: UserAction } | null>(null)
  const meta = pending ? ACTION_META[pending.action] : null

  const runAction = async ({ reason, stepUpToken }: { reason: string; stepUpToken: string }) => {
    if (!pending) return
    const id = pending.user.id
    switch (pending.action) {
      case 'suspend':
        await suspend.mutateAsync({ id, reason, until: null, stepUpToken })
        break
      case 'unsuspend':
        await unsuspend.mutateAsync({ id, reason: reason || undefined })
        break
      case 'ban':
        await ban.mutateAsync({ id, reason, stepUpToken })
        break
      case 'unban':
        await unban.mutateAsync({ id, reason: reason || undefined })
        break
    }
    setPending(null)
  }

  const busy =
    suspend.isPending || unsuspend.isPending || ban.isPending || unban.isPending

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username…"
          className="w-[240px] h-9"
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
            <SelectItem value="insider">Members</SelectItem>
            <SelectItem value="trainer">Trainers</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 px-3 text-xs">
            <IconRefresh className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/60">
          <CardTitle className="text-lg font-bold text-foreground">Members</CardTitle>
          <CardDescription>{isLoading ? 'Loading…' : `${users.length} members`}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <div className="text-center py-8 text-destructive">
              Failed to load members. Your admin session may have expired — sign in again.
            </div>
          ) : isLoading ? (
            <div className="p-6"><SkeletonTable /></div>
          ) : users.length === 0 ? (
            <EmptyState title="No members match these filters" description="Try clearing the search or the status filter." />
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader className="bg-muted/30 border-b border-border/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 font-semibold">Username</TableHead>
                    <TableHead className="font-semibold w-[130px]">Status</TableHead>
                    <TableHead className="font-semibold w-[130px]">Community role</TableHead>
                    <TableHead className="font-semibold w-[170px]">Joined</TableHead>
                    <TableHead className="text-right pr-6 font-semibold w-[260px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isSuspended = user.status === 'suspended'
                    const isBanned = user.status === 'banned'
                    const isTrainer = user.communityRole === 'trainer'
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/20 border-b border-border/40 transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-foreground">{user.username ?? 'Unknown'}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">{user.id.slice(-8)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={user.status} />
                          {isSuspended && user.suspendedUntil && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              until {formatDateTime(user.suspendedUntil)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.communityRole ?? 'member'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {user.createdAt ? formatDateTime(user.createdAt) : '—'}
                        </TableCell>
                        <TableCell className="text-right pr-6 py-2">
                          <div className="flex justify-end items-center gap-1">
                            <Button
                              asChild
                              size="sm" variant="ghost" className="h-8 px-2 text-xs"
                              title="View member details"
                            >
                              <Link href={`/admin/community/users/${user.id}`}>
                                <IconEye className="w-4 h-4 mr-1" /> View
                              </Link>
                            </Button>

                            {isTrainer ? (
                              <Button
                                size="sm" variant="ghost" className="h-8 px-2 text-xs"
                                title="Revoke trainer role"
                                onClick={() => revokeTrainer.mutate(user.id)}
                                disabled={revokeTrainer.isPending}
                              >
                                <IconStarOff className="w-4 h-4 mr-1" /> Revoke trainer
                              </Button>
                            ) : (
                              <Button
                                size="sm" variant="ghost" className="h-8 px-2 text-xs"
                                title="Assign trainer role"
                                onClick={() => assignTrainer.mutate(user.id)}
                                disabled={assignTrainer.isPending}
                              >
                                <IconStarFilled className="w-4 h-4 mr-1" /> Make trainer
                              </Button>
                            )}

                            {isSuspended ? (
                              <Button
                                size="sm" variant="ghost" className="h-8 w-8 p-0"
                                title="Lift suspension"
                                onClick={() => setPending({ user, action: 'unsuspend' })}
                              >
                                <IconLockOpen className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm" variant="ghost"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                                title="Suspend"
                                onClick={() => setPending({ user, action: 'suspend' })}
                                disabled={isBanned}
                              >
                                <IconShieldOff className="w-4 h-4" />
                              </Button>
                            )}

                            {isBanned ? (
                              <Button
                                size="sm" variant="ghost" className="h-8 w-8 p-0"
                                title="Lift ban"
                                onClick={() => setPending({ user, action: 'unban' })}
                              >
                                <IconShield className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm" variant="ghost"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Ban"
                                onClick={() => setPending({ user, action: 'ban' })}
                              >
                                <IconBan className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
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

      <ModerationDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={meta?.title ?? ''}
        description={meta?.description}
        confirmLabel={meta?.confirmLabel ?? 'Confirm'}
        destructive={meta?.destructive}
        requireReason={meta?.requireReason}
        requireStepUp={meta?.requireStepUp}
        pending={busy}
        onConfirm={runAction}
      />
    </div>
  )
}
