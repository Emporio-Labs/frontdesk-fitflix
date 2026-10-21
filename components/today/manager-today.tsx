'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  IconBellRinging,
  IconCreditCard,
  IconPhoneCall,
  IconUsers,
  IconUserCheck,
  IconReportAnalytics,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/skeleton-loader'
import { StatusBadge } from '@/components/status-badge'
import { useLeadReminders } from '@/hooks/use-leads'
import { useRenewalReminders } from '@/hooks/use-memberships'
import { useAdmins } from '@/hooks/use-admins'
import { useLocationScope } from '@/components/location-scope-provider'
import { TodayHeader, KpiCard, KpiGrid } from '@/components/today/today-shared'

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type AlertRow = {
  id: string
  kind: 'Renewal' | 'Callback'
  who: string
  detail: string
}

export function ManagerToday() {
  const reminders = useLeadReminders()
  const renewals = useRenewalReminders()
  const admins = useAdmins()
  const { selectedLocationId } = useLocationScope()

  const overdueRenewals = renewals.data.overdue
  const missedCallbacks = reminders.data?.missed ?? []

  const alerts: AlertRow[] = useMemo(() => {
    const renewalAlerts: AlertRow[] = overdueRenewals.map((t) => ({
      id: `renewal-${t.membershipId}`,
      kind: 'Renewal',
      who: t.memberName,
      detail: `${Math.abs(t.daysUntilExpiry)}d overdue · ${t.planName}`,
    }))
    const callbackAlerts: AlertRow[] = missedCallbacks.map((l) => ({
      id: `callback-${l.id}`,
      kind: 'Callback',
      who: l.name || 'Lead',
      detail: `Follow-up due ${formatDate(l.followUpDate)}`,
    }))
    return [...renewalAlerts, ...callbackAlerts]
  }, [overdueRenewals, missedCallbacks])

  // FX-47.2 "staff on duty" — no live staff-presence feed exists, so this is the
  // branch's active staff roster: enabled accounts scoped to the selected branch
  // (or all-branches accounts). Best-effort proxy, labelled as a roster.
  const onDuty = useMemo(
    () =>
      (admins.data ?? []).filter((a) => {
        if (a.status !== 'active') return false
        if (!selectedLocationId) return true
        if (a.allBranches) return true
        return (a.branchIds ?? []).includes(selectedLocationId)
      }),
    [admins.data, selectedLocationId]
  )

  const handleRefresh = () => {
    reminders.refetch()
    renewals.refetch()
    admins.refetch()
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6 max-w-7xl mx-auto">
      <TodayHeader
        subtitle="What needs your attention at the branch right now — open alerts and who's on the roster."
        onRefresh={handleRefresh}
      />

      <KpiGrid>
        <KpiCard
          title="Open alerts"
          icon={<IconBellRinging className="h-4 w-4 text-muted-foreground" />}
          value={reminders.isLoading || renewals.isLoading ? '…' : alerts.length}
          sub="Need action today"
        />
        <KpiCard
          title="Overdue renewals"
          icon={<IconCreditCard className="h-4 w-4 text-muted-foreground" />}
          value={renewals.isLoading ? '…' : overdueRenewals.length}
          sub="Payments lapsed"
        />
        <KpiCard
          title="Overdue callbacks"
          icon={<IconPhoneCall className="h-4 w-4 text-muted-foreground" />}
          value={reminders.isLoading ? '…' : missedCallbacks.length}
          sub="Missed follow-ups"
        />
        <KpiCard
          title="Active staff"
          icon={<IconUserCheck className="h-4 w-4 text-muted-foreground" />}
          value={admins.isLoading ? '…' : onDuty.length}
          sub="On the branch roster"
        />
      </KpiGrid>

      {/* Open alerts */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <CardTitle className="text-base sm:text-lg">Open alerts</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/alerts">
              <IconBellRinging className="h-4 w-4 mr-1.5" />
              Concierge alerts
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {reminders.isLoading || renewals.isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<IconBellRinging className="h-10 w-10" />}
                title="Nothing needs attention right now"
                description="Overdue renewals and missed lead callbacks for this branch surface here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="text-right">Go</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell data-label="Type">
                        <StatusBadge
                          status={a.kind === 'Renewal' ? 'expired' : 'pending'}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell data-label="Who" className="font-medium">
                        {a.who}
                      </TableCell>
                      <TableCell data-label="Detail" className="text-sm text-muted-foreground">
                        {a.detail}
                      </TableCell>
                      <TableCell data-hide-label className="text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={a.kind === 'Renewal' ? '/admin/memberships' : '/admin/leads'}>
                            Open
                          </Link>
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

      {/* Staff on duty */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <div>
            <CardTitle className="text-base sm:text-lg">Staff on duty</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Active accounts for this branch</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/reports">
              <IconReportAnalytics className="h-4 w-4 mr-1.5" />
              Reports
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {admins.isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : onDuty.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<IconUsers className="h-10 w-10" />}
                title="No active staff on the roster"
                description="Enabled staff accounts for the selected branch appear here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onDuty.map((a) => (
                    <TableRow key={a._id}>
                      <TableCell data-label="Name" className="font-medium">
                        {a.adminName || a.email}
                      </TableCell>
                      <TableCell data-label="Role" className="hidden md:table-cell capitalize text-muted-foreground">
                        {a.staffRole || 'Staff'}
                      </TableCell>
                      <TableCell data-label="Status">
                        <StatusBadge status={a.status} size="sm" />
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
