'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  IconArrowLeft, IconBan, IconCircleCheck, IconClockPause, IconShieldCheck, IconShieldOff,
} from '@tabler/icons-react'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState } from '@/components/empty-state'
import {
  useAdminUser, useAssignTrainer, useBanUser, useRevokeTrainer,
  useSuspendUser, useUnbanUser, useUnsuspendUser,
} from '@/hooks/use-community'
import { ModerationDialog } from '../../moderation-dialog'
import { formatDateTime } from '../../shared'

type PendingAction = 'suspend' | 'unsuspend' | 'ban' | 'unban' | null

export default function CommunityUserDetailPage() {
  const params = useParams()
  const userId = String(params?.id ?? '')

  const { data, isLoading, isError } = useAdminUser(userId)

  const suspend = useSuspendUser()
  const unsuspend = useUnsuspendUser()
  const ban = useBanUser()
  const unban = useUnbanUser()
  const assignTrainer = useAssignTrainer()
  const revokeTrainer = useRevokeTrainer()

  const [pending, setPending] = useState<PendingAction>(null)
  // Blank means an indefinite suspension until an admin lifts it.
  const [suspendUntil, setSuspendUntil] = useState('')

  const user = (data?.user ?? {}) as Record<string, any>
  const status = String(user.status ?? 'active')
  const isTrainer = user.communityRole === 'trainer'

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Button asChild variant="ghost" size="sm" className="h-8 px-2 -ml-2 text-muted-foreground">
        <Link href="/admin/community"><IconArrowLeft className="w-4 h-4 mr-1.5" /> Back to community</Link>
      </Button>

      {isError ? (
        <Card><CardContent className="py-10 text-center text-destructive">Member not found.</CardContent></Card>
      ) : isLoading || !data ? (
        <Card><CardContent className="py-6 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </CardContent></Card>
      ) : (
        <>
          <Card className="border-border shadow-sm bg-card">
            <CardHeader className="border-b border-border/60">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex flex-col gap-1.5">
                  <CardTitle className="text-xl font-bold">{user.username ?? 'Unknown member'}</CardTitle>
                  <CardDescription>
                    {user.phone ?? 'No phone on file'} · joined {formatDateTime(user.createdAt)}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  <StatusBadge status={status} />
                  {isTrainer && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">Trainer</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Posts" value={data.postCount} />
                <Stat label="Comments" value={data.commentCount} />
                <Stat label="Reports against" value={data.reportsAgainst} />
                <Stat
                  label="Membership"
                  value={data.membership?.planName ?? 'None'}
                  hint={data.membership?.endDate ? `until ${formatDateTime(data.membership.endDate)}` : undefined}
                />
              </div>

              {status === 'suspended' && user.suspendedUntil && (
                <p className="text-sm text-muted-foreground">
                  Suspended until {formatDateTime(user.suspendedUntil)}.
                </p>
              )}
              {status === 'suspended' && !user.suspendedUntil && (
                <p className="text-sm text-muted-foreground">
                  Suspended indefinitely — stays suspended until an admin lifts it.
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-3 border-t border-border/60">
                {status === 'suspended' ? (
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => setPending('unsuspend')}>
                    <IconCircleCheck className="w-4 h-4 mr-1.5" /> Lift suspension
                  </Button>
                ) : status !== 'banned' && (
                  <Button
                    size="sm" variant="outline"
                    className="h-8 px-3 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => { setSuspendUntil(''); setPending('suspend') }}
                  >
                    <IconClockPause className="w-4 h-4 mr-1.5" /> Suspend
                  </Button>
                )}

                {status === 'banned' ? (
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => setPending('unban')}>
                    <IconCircleCheck className="w-4 h-4 mr-1.5" /> Lift ban
                  </Button>
                ) : (
                  <Button
                    size="sm" variant="outline"
                    className="h-8 px-3 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => setPending('ban')}
                  >
                    <IconBan className="w-4 h-4 mr-1.5" /> Ban
                  </Button>
                )}

                {isTrainer ? (
                  <Button
                    size="sm" variant="outline" className="h-8 px-3 text-xs ml-auto"
                    onClick={() => revokeTrainer.mutate(userId)} disabled={revokeTrainer.isPending}
                  >
                    <IconShieldOff className="w-4 h-4 mr-1.5" /> Revoke trainer role
                  </Button>
                ) : (
                  <Button
                    size="sm" variant="outline" className="h-8 px-3 text-xs ml-auto"
                    onClick={() => assignTrainer.mutate(userId)} disabled={assignTrainer.isPending}
                  >
                    <IconShieldCheck className="w-4 h-4 mr-1.5" /> Grant trainer role
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm bg-card overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-border/60">
              <CardTitle className="text-lg font-bold">Moderation history</CardTitle>
              <CardDescription>
                Every admin action taken against this member. Append-only.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.moderationActions.length === 0 ? (
                <EmptyState title="No moderation actions" description="This member has never been actioned." />
              ) : (
                <div className="overflow-x-auto w-full">
                  <Table>
                    <TableHeader className="bg-muted/30 border-b border-border/60">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6 font-semibold w-[160px]">Action</TableHead>
                        <TableHead className="font-semibold">Reason</TableHead>
                        <TableHead className="font-semibold w-[200px]">When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.moderationActions.map((action: Record<string, any>) => (
                        <TableRow key={String(action._id)} className="border-b border-border/40">
                          <TableCell className="pl-6">
                            <Badge variant="outline" className="text-[10px] px-2 py-0 rounded-full capitalize">
                              {String(action.action ?? '').replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{action.reason || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDateTime(action.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ModerationDialog
        open={pending === 'suspend'}
        onOpenChange={(o) => !o && setPending(null)}
        title="Suspend this member"
        description="The member keeps their account but cannot post, comment or interact in the community."
        confirmLabel="Suspend"
        requireReason
        requireStepUp
        destructive
        pending={suspend.isPending}
        onConfirm={async ({ reason, stepUpToken }) => {
          await suspend.mutateAsync({
            id: userId,
            reason,
            until: suspendUntil ? new Date(suspendUntil).toISOString() : null,
            stepUpToken,
          })
          setPending(null)
        }}
      >
        <div>
          <label className="text-sm font-medium">Suspended until</label>
          <Input
            type="date"
            value={suspendUntil}
            onChange={(e) => setSuspendUntil(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">Leave blank to suspend indefinitely.</p>
        </div>
      </ModerationDialog>

      <ModerationDialog
        open={pending === 'unsuspend'}
        onOpenChange={(o) => !o && setPending(null)}
        title="Lift this suspension"
        description="The member regains full community access immediately."
        confirmLabel="Lift suspension"
        pending={unsuspend.isPending}
        onConfirm={async ({ reason }) => {
          await unsuspend.mutateAsync({ id: userId, reason })
          setPending(null)
        }}
      />

      <ModerationDialog
        open={pending === 'ban'}
        onOpenChange={(o) => !o && setPending(null)}
        title="Ban this member"
        description="The member loses community access indefinitely. Their existing posts stay unless you delete them separately."
        confirmLabel="Ban member"
        requireReason
        requireStepUp
        destructive
        pending={ban.isPending}
        onConfirm={async ({ reason, stepUpToken }) => {
          await ban.mutateAsync({ id: userId, reason, stepUpToken })
          setPending(null)
        }}
      />

      <ModerationDialog
        open={pending === 'unban'}
        onOpenChange={(o) => !o && setPending(null)}
        title="Lift this ban"
        description="The member regains community access immediately."
        confirmLabel="Lift ban"
        pending={unban.isPending}
        onConfirm={async ({ reason }) => {
          await unban.mutateAsync({ id: userId, reason })
          setPending(null)
        }}
      />
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  )
}
