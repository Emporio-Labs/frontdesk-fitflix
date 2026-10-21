'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  IconPhoneCall,
  IconTarget,
  IconUserPlus,
  IconAlertTriangle,
  IconInbox,
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
import { useLeads, useClaimLead, useLeadReminders } from '@/hooks/use-leads'
import type { Lead } from '@/lib/services/lead.service'
import { TodayHeader, KpiCard, KpiGrid } from '@/components/today/today-shared'

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SalesToday() {
  const leads = useLeads()
  const reminders = useLeadReminders()
  const claim = useClaimLead()

  const claimable = useMemo(
    () =>
      (leads.data ?? []).filter(
        (l) => !l.isDeleted && !l.claimedById && l.status !== 'converted' && l.status !== 'lost'
      ),
    [leads.data]
  )
  const callbacksToday = reminders.data?.today ?? []
  const callbacksMissed = reminders.data?.missed ?? []

  const handleRefresh = () => {
    leads.refetch()
    reminders.refetch()
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6 max-w-7xl mx-auto">
      <TodayHeader
        subtitle="Grab the leads nobody owns yet and make today's callbacks before they go cold."
        onRefresh={handleRefresh}
      />

      <KpiGrid>
        <KpiCard
          title="Claimable leads"
          icon={<IconInbox className="h-4 w-4 text-muted-foreground" />}
          value={leads.isLoading ? '…' : claimable.length}
          sub="Unclaimed in the queue"
        />
        <KpiCard
          title="Callbacks today"
          icon={<IconPhoneCall className="h-4 w-4 text-muted-foreground" />}
          value={reminders.isLoading ? '…' : callbacksToday.length}
          sub="Follow-ups due today"
        />
        <KpiCard
          title="Overdue callbacks"
          icon={<IconAlertTriangle className="h-4 w-4 text-muted-foreground" />}
          value={reminders.isLoading ? '…' : callbacksMissed.length}
          sub="Missed follow-ups"
        />
        <KpiCard
          title="All leads"
          icon={<IconTarget className="h-4 w-4 text-muted-foreground" />}
          value={leads.isLoading ? '…' : (leads.data ?? []).length}
          sub="Open the full queue"
          href="/admin/leads"
        />
      </KpiGrid>

      {/* Claimable leads */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <CardTitle className="text-base sm:text-lg">Claimable leads</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/leads">
              <IconTarget className="h-4 w-4 mr-1.5" />
              Lead queue
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {leads.isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : claimable.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<IconInbox className="h-10 w-10" />}
                title="No unclaimed leads"
                description="New leads for your branch that nobody owns yet will show up here to grab."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead className="hidden md:table-cell">Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claimable.map((lead: Lead) => (
                    <TableRow key={lead.id}>
                      <TableCell data-label="Lead" className="font-medium">
                        {lead.name || 'Lead'}
                        {lead.phone && (
                          <div className="text-xs text-muted-foreground">{lead.phone}</div>
                        )}
                      </TableCell>
                      <TableCell data-label="Source" className="hidden md:table-cell capitalize">
                        {lead.source || '—'}
                      </TableCell>
                      <TableCell data-label="Status">
                        <StatusBadge status={lead.status} size="sm" />
                      </TableCell>
                      <TableCell data-hide-label className="text-right">
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1"
                          disabled={claim.isPending}
                          onClick={() => claim.mutate(lead.id)}
                        >
                          <IconUserPlus className="h-3.5 w-3.5" />
                          Claim
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

      {/* Callbacks due */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <CardTitle className="text-base sm:text-lg">Callbacks due</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/leads">
              <IconPhoneCall className="h-4 w-4 mr-1.5" />
              All leads
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {reminders.isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : callbacksToday.length === 0 && callbacksMissed.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<IconPhoneCall className="h-10 w-10" />}
                title="No callbacks due"
                description="Leads with a follow-up date of today or earlier appear here so none slip through."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead className="hidden md:table-cell">Owner</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ...callbacksMissed.map((l) => ({ lead: l, overdue: true })),
                    ...callbacksToday.map((l) => ({ lead: l, overdue: false })),
                  ].map(({ lead, overdue }) => (
                    <TableRow key={lead.id}>
                      <TableCell data-label="Lead" className="font-medium">
                        {lead.name || 'Lead'}
                        {lead.phone && (
                          <div className="text-xs text-muted-foreground">{lead.phone}</div>
                        )}
                      </TableCell>
                      <TableCell data-label="Owner" className="hidden md:table-cell text-muted-foreground">
                        {lead.claimedByName || 'Unclaimed'}
                      </TableCell>
                      <TableCell data-label="Due" className="whitespace-nowrap">
                        {overdue ? (
                          <span className="text-rose-600 font-medium">
                            {formatDate(lead.followUpDate)}
                          </span>
                        ) : (
                          'Today'
                        )}
                      </TableCell>
                      <TableCell data-label="Status">
                        <StatusBadge status={lead.status} size="sm" />
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
