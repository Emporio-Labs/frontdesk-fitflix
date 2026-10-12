'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  IconCalendarStats,
  IconCreditCard,
  IconFileInvoice,
  IconRefresh,
  IconUserCheck,
  IconUsers,
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
import { useCurrentlyIn } from '@/hooks/use-gym-visits'
import { useRenewalReminders } from '@/hooks/use-memberships'
import { useInvoices } from '@/hooks/use-invoices'
import { TodayHeader, KpiCard, KpiGrid } from '@/components/today/today-shared'

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const UNPAID_STATUSES = new Set(['PENDING', 'FAILED'])

export function FrontDeskToday() {
  const currentlyIn = useCurrentlyIn()
  const renewals = useRenewalReminders()
  const invoices = useInvoices()

  const inNow = currentlyIn.data ?? []
  const overdue = renewals.data.overdue
  const dueThisWeek = renewals.data.dueThisWeek
  const paymentsDue = useMemo(() => [...overdue, ...dueThisWeek], [overdue, dueThisWeek])
  const unpaidInvoices = useMemo(
    () => (invoices.data ?? []).filter((i) => UNPAID_STATUSES.has(i.paymentStatus)),
    [invoices.data]
  )

  const handleRefresh = () => {
    currentlyIn.refetch()
    renewals.refetch()
    invoices.refetch()
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6 max-w-7xl mx-auto">
      <TodayHeader
        subtitle="Who's in the building and who needs to pay today. Check members in and chase renewals as they come due."
        onRefresh={handleRefresh}
      />

      <KpiGrid>
        <KpiCard
          title="In the building"
          icon={<IconUserCheck className="h-4 w-4 text-muted-foreground" />}
          value={currentlyIn.isLoading ? '…' : inNow.length}
          sub="Checked in now"
        />
        <KpiCard
          title="Payments overdue"
          icon={<IconCreditCard className="h-4 w-4 text-muted-foreground" />}
          value={renewals.isLoading ? '…' : overdue.length}
          sub="Membership expired"
        />
        <KpiCard
          title="Due this week"
          icon={<IconCalendarStats className="h-4 w-4 text-muted-foreground" />}
          value={renewals.isLoading ? '…' : dueThisWeek.length}
          sub="Renewals coming up"
        />
        <KpiCard
          title="Unpaid invoices"
          icon={<IconFileInvoice className="h-4 w-4 text-muted-foreground" />}
          value={invoices.isLoading ? '…' : unpaidInvoices.length}
          sub="Pending or failed"
          href="/admin/invoices"
        />
      </KpiGrid>

      {/* Checked in now */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <CardTitle className="text-base sm:text-lg">In the building now</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/attendance">
              <IconUserCheck className="h-4 w-4 mr-1.5" />
              Check someone in
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {currentlyIn.isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : inNow.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<IconUsers className="h-10 w-10" />}
                title="Nobody is checked in right now"
                description="Members you check in at the desk — or who scan their QR — will appear here."
                action={
                  <Link href="/admin/attendance">
                    <Button variant="outline" size="sm">
                      Open attendance
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead>Visit</TableHead>
                    <TableHead>Since</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inNow.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell data-label="Member" className="font-medium">
                        {v.username || 'Member'}
                      </TableCell>
                      <TableCell
                        data-label="Contact"
                        className="hidden md:table-cell text-sm text-muted-foreground"
                      >
                        {v.email || '—'}
                      </TableCell>
                      <TableCell data-label="Visit">
                        <StatusBadge status={v.visitType} size="sm" />
                      </TableCell>
                      <TableCell data-label="Since" className="whitespace-nowrap">
                        {formatTime(v.checkInAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments due */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <CardTitle className="text-base sm:text-lg">Payments due</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/memberships">
              <IconCreditCard className="h-4 w-4 mr-1.5" />
              Memberships
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {renewals.isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : paymentsDue.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<IconCreditCard className="h-10 w-10" />}
                title="No renewals due right now"
                description="Memberships expiring this month show up here so you can collect payment before they lapse."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="hidden md:table-cell">Plan</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsDue.map((t) => (
                    <TableRow key={t.membershipId}>
                      <TableCell data-label="Member" className="font-medium">
                        {t.memberName}
                        {t.phone && (
                          <div className="text-xs text-muted-foreground">{t.phone}</div>
                        )}
                      </TableCell>
                      <TableCell data-label="Plan" className="hidden md:table-cell">
                        {t.planName}
                      </TableCell>
                      <TableCell data-label="When" className="whitespace-nowrap">
                        {t.daysUntilExpiry < 0
                          ? `${Math.abs(t.daysUntilExpiry)}d overdue`
                          : t.daysUntilExpiry === 0
                          ? 'Today'
                          : `in ${t.daysUntilExpiry}d`}
                      </TableCell>
                      <TableCell data-label="Status">
                        <StatusBadge
                          status={t.bucket === 'overdue' ? 'expired' : 'pending'}
                          size="sm"
                        />
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
