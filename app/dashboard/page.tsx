'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  IconUsers, IconRun, IconCalendarEvent,
  IconClock, IconTrendingUp, IconRefresh,
  IconShoppingCart, IconCreditCard, IconRepeat, IconPhoneCall,
} from '@tabler/icons-react'
import { useMemo } from 'react'
import { useUsers } from '@/hooks/use-users'
import { useBookings } from '@/hooks/use-bookings'
import { useTrainers } from '@/hooks/use-trainers'
import { useSlots } from '@/hooks/use-slots'
import { useServices } from '@/hooks/use-services'
import { useTherapies } from '@/hooks/use-therapies'
import { useGroupClasses } from '@/hooks/use-group-classes'
import { BOOKING_STATUS } from '@/lib/services/booking.service'
import { getBookingServiceName } from '@/lib/populated'
import { useInvoices } from '@/hooks/use-invoices'
import { useRenewalReminders } from '@/hooks/use-memberships'
import { useLeadReminders } from '@/hooks/use-leads'
import { useOptionalLocationScope } from '@/components/location-scope-provider'
import type { Invoice } from '@/lib/services/invoice.service'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

const STATUS_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280']

export default function DashboardPage() {
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useUsers()
  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useBookings()
  const { data: trainers = [], isLoading: trainersLoading } = useTrainers()
  const { data: slots = [] } = useSlots()
  const { data: services = [] } = useServices()
  const { data: therapies = [] } = useTherapies()
  const { data: groupClasses = [] } = useGroupClasses()
  const { data: invoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = useInvoices()
  const { data: renewals, isLoading: renewalsLoading } = useRenewalReminders()
  const { data: leadReminders, isLoading: leadRemindersLoading } = useLeadReminders()
  const branchId = useOptionalLocationScope()?.selectedLocationId ?? null

  // ── Desk queue (branch-scoped) ────────────────────────────────────────────────
  // Invoices don't carry a branch on the client type yet, so fall back to the
  // member's home club; anything with no known branch shows everywhere.
  const homeClubByUserId = useMemo(
    () => new Map(users.map((u) => [u.id, u.homeClubId ?? null] as const)),
    [users]
  )
  const inBranch = (branch: string | null | undefined) => !branchId || !branch || branch === branchId
  const awaitingPayment = useMemo(
    () =>
      invoices
        .filter((inv) => inv.paymentStatus === 'DRAFT' || inv.paymentStatus === 'PENDING')
        .filter((inv) =>
          inBranch((inv as Invoice & { locationId?: string }).locationId ?? homeClubByUserId.get(inv.userId.id))
        )
        .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices, homeClubByUserId, branchId]
  )
  const renewalsDue = useMemo(
    () => (renewals?.dueThisWeek ?? []).filter((t) => inBranch(homeClubByUserId.get(t.userId))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [renewals, homeClubByUserId, branchId]
  )
  const followUpsToday = leadReminders?.today ?? []

  const itemNameById = useMemo(
    () =>
      new Map([
        ...services.map((service) => [service.id, service.name] as const),
        ...therapies.map((therapy) => [therapy.id, therapy.name] as const),
      ]),
    [services, therapies]
  )

  const classNameById = useMemo(
    () => new Map(groupClasses.map((c) => [c.id, c.name] as const)),
    [groupClasses]
  )

  // ── Operational computed ──────────────────────────────────────────────────────
  const bookingStatusData = Object.entries(BOOKING_STATUS).map(([key, label]) => ({
    status: label,
    count: bookings.filter((b) => Number(b.status) === Number(key)).length,
  }))
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt || b.bookingDate).getTime() - new Date(a.createdAt || a.bookingDate).getTime())
    .slice(0, 5)
  const availableSlots = slots.reduce((sum, slot) => sum + Math.max(slot.remainingCapacity, 0), 0)

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleRefreshAll = () => {
    refetchUsers()
    refetchBookings()
    refetchInvoices()
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Operations overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefreshAll}>
          <IconRefresh className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* ── Desk queue ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <QueueCard
          title="Awaiting payment"
          description="Unpaid invoices — collect and activate"
          icon={<IconCreditCard className="w-4 h-4 text-amber-600" />}
          count={awaitingPayment.length}
          loading={invoicesLoading}
          viewAllHref="/admin/invoices"
          empty="Nothing waiting on payment."
          rows={awaitingPayment.slice(0, 5).map((inv) => ({
            key: inv.id,
            primary: inv.userId?.name || inv.lead?.name || 'Unknown',
            secondary: `${inv.invoiceNumber} · ${formatINR(inv.total)}`,
            actionLabel: 'Resume',
            actionHref: `/admin/sales/new?invoiceId=${encodeURIComponent(inv.id)}`,
          }))}
        />
        <QueueCard
          title="Renewals due this week"
          description="Memberships expiring in the next 7 days"
          icon={<IconRepeat className="w-4 h-4 text-violet-600" />}
          count={renewalsDue.length}
          loading={renewalsLoading}
          viewAllHref="/admin/renewals"
          empty="No renewals due this week."
          rows={renewalsDue.slice(0, 5).map((t) => ({
            key: t.membershipId,
            primary: t.memberName,
            secondary: `${t.planName} · ends ${t.endDateIst}`,
            actionLabel: 'Renew',
            actionHref: t.memberUnknown
              ? undefined
              : `/admin/sales/new?userId=${encodeURIComponent(t.userId)}&mode=renew`,
          }))}
        />
        <QueueCard
          title="Lead follow-ups today"
          description="Leads scheduled for a call today"
          icon={<IconPhoneCall className="w-4 h-4 text-blue-600" />}
          count={followUpsToday.length}
          loading={leadRemindersLoading}
          viewAllHref="/admin/leads"
          empty="No follow-ups scheduled for today."
          rows={followUpsToday.slice(0, 5).map((lead) => ({
            key: lead.id,
            primary: lead.name,
            secondary: lead.phone || 'No phone',
            actionLabel: lead.pendingInvoiceId ? 'Resume' : 'Sell plan',
            actionHref: lead.pendingInvoiceId
              ? `/admin/sales/new?invoiceId=${encodeURIComponent(lead.pendingInvoiceId)}`
              : `/admin/sales/new?leadId=${encodeURIComponent(lead.id)}`,
          }))}
        />
      </div>

      {/* ── Operational Stats ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operations</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Members" icon={<IconUsers className="w-4 h-4 text-blue-500" />} value={users.length} sub="registered users" loading={usersLoading} href="/admin/users" />
          <StatCard title="Trainers" icon={<IconRun className="w-4 h-4 text-violet-500" />} value={trainers.length} sub="on staff" loading={trainersLoading} href="/admin/trainers" />
          <StatCard title="Bookings" icon={<IconCalendarEvent className="w-4 h-4 text-amber-500" />} value={bookings.length} sub="total bookings" loading={bookingsLoading} href="/admin/bookings" />
          <StatCard title="Open Slots" icon={<IconClock className="w-4 h-4 text-teal-500" />} value={availableSlots} sub={`across ${slots.length} slot windows`} loading={false} href="/admin/slots" />
        </div>
      </div>

      {/* ── Booking Chart + Recent Bookings ────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconTrendingUp className="w-4 h-4" /> Booking Status Breakdown
            </CardTitle>
            <CardDescription>Live count by status across all bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="h-[220px] flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No bookings yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={bookingStatusData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="count" name="Bookings" radius={[4, 4, 0, 0]}>
                    {bookingStatusData.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>5 most recent bookings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/bookings">View all →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No bookings yet</p>
            ) : (
              <div className="space-y-2">
                {recentBookings.map((b) => (
                  <div key={b._id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">
                        {getBookingServiceName(b, classNameById, itemNameById, 'Unknown Service')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(b.bookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <StatusBadge status={b.status as number} map={BOOKING_STATUS} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Jump to common tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button asChild className="h-12 text-sm">
            <Link href="/admin/sales/new"><IconShoppingCart className="w-4 h-4 mr-2" />New sale</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 text-sm">
            <Link href="/admin/bookings"><IconCalendarEvent className="w-4 h-4 mr-2" />New Booking</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 text-sm">
            <Link href="/admin/slots"><IconClock className="w-4 h-4 mr-2" />Create Slot</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 text-sm">
            <Link href="/admin/trainers"><IconRun className="w-4 h-4 mr-2" />Add Trainer</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  title, icon, value, sub, loading, href,
}: {
  title: string
  icon: React.ReactNode
  value: number
  sub: string
  loading: boolean
  href: string
}) {
  return (
    <Link href={href} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-8 w-16 mb-1" /> : <div className="text-2xl font-bold">{value}</div>}
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function QueueCard({
  title, description, icon, count, loading, viewAllHref, empty, rows,
}: {
  title: string
  description: string
  icon: React.ReactNode
  count: number
  loading: boolean
  viewAllHref: string
  empty: string
  rows: Array<{ key: string; primary: string; secondary: string; actionLabel: string; actionHref?: string }>
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {icon} {title}
            {!loading && <Badge variant="secondary">{count}</Badge>}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={viewAllHref}>View all →</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="space-y-1">
            {rows.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.primary}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.secondary}</p>
                </div>
                {row.actionHref && (
                  <Button size="sm" variant="outline" className="shrink-0" asChild>
                    <Link href={row.actionHref}>{row.actionLabel}</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status, map }: { status: number; map: Record<number | string, string> }) {
  const colors: Record<number, string> = {
    0: 'bg-blue-100 text-blue-800',
    1: 'bg-green-100 text-green-800',
    2: 'bg-red-100 text-red-800',
    3: 'bg-emerald-100 text-emerald-800',
    4: 'bg-gray-100 text-gray-800',
  }
  return (
    <span className={`text-xs px-2 py-1 rounded font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {map[status] ?? status}
    </span>
  )
}
