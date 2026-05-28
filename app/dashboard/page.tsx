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
  IconUsers, IconStethoscope, IconRun, IconCalendarEvent,
  IconCalendarStats, IconClock, IconTrendingUp, IconRefresh,
  IconPhone, IconBrandWhatsapp, IconUserCheck, IconUserPlus,
  IconFlame, IconAlertTriangle, IconArrowRight, IconEye, IconFilter,
} from '@tabler/icons-react'
import { useUsers } from '@/hooks/use-users'
import { useBookings } from '@/hooks/use-bookings'
import { useAppointments } from '@/hooks/use-appointments'
import { useDoctors } from '@/hooks/use-doctors'
import { useTrainers } from '@/hooks/use-trainers'
import { useSlots } from '@/hooks/use-slots'
import {
  useLeads, useLeadReminders, useLeadAnalytics,
  useUpdateLead, useRecordLeadContactAttempt,
} from '@/hooks/use-leads'
import { BOOKING_STATUS } from '@/lib/services/booking.service'
import type { Lead } from '@/lib/services/lead.service'

const STATUS_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280']

const IST_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function toISTDateStr(date: Date) {
  return IST_FORMATTER.format(date)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const FUNNEL_STAGES = [
  { key: 'new', label: 'New', color: 'bg-blue-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-amber-500' },
  { key: 'qualified', label: 'Qualified', color: 'bg-violet-500' },
  { key: 'converted', label: 'Converted', color: 'bg-emerald-500' },
  { key: 'lost', label: 'Lost', color: 'bg-rose-400' },
] as const

export default function DashboardPage() {
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useUsers()
  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useBookings()
  const { data: appointments = [], isLoading: apptLoading } = useAppointments()
  const { data: doctors = [], isLoading: doctorsLoading } = useDoctors()
  const { data: trainers = [], isLoading: trainersLoading } = useTrainers()
  const { data: slots = [] } = useSlots()
  const { data: leads = [], isLoading: leadsLoading } = useLeads()
  const { data: reminders, isLoading: remindersLoading } = useLeadReminders()
  const { data: analytics } = useLeadAnalytics()
  const updateLead = useUpdateLead()
  const recordContact = useRecordLeadContactAttempt()

  // ── CRM computed ─────────────────────────────────────────────────────────────
  const todayStr = toISTDateStr(new Date())

  const signupLeads = leads
    .filter((l) => l.tags.some((t) => t.toLowerCase() === 'signup'))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const todaySignups = signupLeads.filter(
    (l) => toISTDateStr(new Date(l.createdAt)) === todayStr,
  )

  const pendingFollowups = [
    ...(reminders?.missed ?? []),
    ...(reminders?.today ?? []),
  ]

  const stageCounts = analytics?.stageCounts ?? {
    new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0,
  }

  // ── Operational computed ──────────────────────────────────────────────────────
  const bookingStatusData = Object.entries(BOOKING_STATUS).map(([key, label]) => ({
    status: label,
    count: bookings.filter((b) => b.status === Number(key)).length,
  }))
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime())
    .slice(0, 5)
  const recentAppointments = [...appointments]
    .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
    .slice(0, 5)
  const availableSlots = slots.reduce((sum, slot) => sum + Math.max(slot.remainingCapacity, 0), 0)

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleRefreshAll = () => {
    refetchUsers()
    refetchBookings()
  }

  const handleMarkContacted = (lead: Lead) => {
    updateLead.mutate({ id: lead.id, payload: { status: 'contacted' } })
  }

  const handleRecordCall = (lead: Lead) => {
    recordContact.mutate({ id: lead.id, channel: 'call' })
  }

  const handleRecordWhatsapp = (lead: Lead) => {
    recordContact.mutate({ id: lead.id, channel: 'whatsapp' })
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Live CRM + clinic operations overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefreshAll}>
          <IconRefresh className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* ── CRM Metric Cards ───────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">CRM Overview</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CrmStatCard
            title="Today's Signups"
            value={leadsLoading ? null : todaySignups.length}
            sub="new app registrations"
            icon={<IconUserPlus className="w-4 h-4 text-blue-500" />}
            href="/admin/leads"
          />
          <CrmStatCard
            title="Pending Follow-ups"
            value={remindersLoading ? null : pendingFollowups.length}
            sub={`${reminders?.missed?.length ?? 0} overdue`}
            icon={<IconAlertTriangle className="w-4 h-4 text-amber-500" />}
            href="/admin/leads"
            urgent={(reminders?.missed?.length ?? 0) > 0}
          />
          <CrmStatCard
            title="Contacted Leads"
            value={stageCounts.contacted}
            sub="in pipeline"
            icon={<IconPhone className="w-4 h-4 text-violet-500" />}
            href="/admin/leads"
          />
          <CrmStatCard
            title="Converted Members"
            value={stageCounts.converted}
            sub="from leads"
            icon={<IconUserCheck className="w-4 h-4 text-emerald-500" />}
            href="/admin/leads"
          />
        </div>
      </div>

      {/* ── Operational Stats ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operations</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Members" icon={<IconUsers className="w-4 h-4 text-blue-500" />} value={users.length} sub="registered users" loading={usersLoading} href="/admin/users" />
          <StatCard title="Doctors" icon={<IconStethoscope className="w-4 h-4 text-emerald-500" />} value={doctors.length} sub="on staff" loading={doctorsLoading} href="/admin/doctors" />
          <StatCard title="Trainers" icon={<IconRun className="w-4 h-4 text-violet-500" />} value={trainers.length} sub="on staff" loading={trainersLoading} href="/admin/trainers" />
          <StatCard title="Bookings" icon={<IconCalendarEvent className="w-4 h-4 text-amber-500" />} value={bookings.length} sub="total bookings" loading={bookingsLoading} href="/admin/bookings" />
          <StatCard title="Appointments" icon={<IconCalendarStats className="w-4 h-4 text-rose-500" />} value={appointments.length} sub="total appointments" loading={apptLoading} href="/admin/appointments" />
          <StatCard title="Open Slots" icon={<IconClock className="w-4 h-4 text-teal-500" />} value={availableSlots} sub={`across ${slots.length} slot windows`} loading={false} href="/admin/slots" />
        </div>
      </div>

      {/* ── Follow-Up Center + Signup Feed ─────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Follow-Up Action Center */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <IconFlame className="w-4 h-4 text-orange-500" />
                Today's Follow-ups
                {pendingFollowups.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{pendingFollowups.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>Leads needing contact now</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/leads">View all →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {remindersLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-[84px] w-full" />)
            ) : pendingFollowups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <IconUserCheck className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">All caught up for today!</p>
              </div>
            ) : (
              pendingFollowups.slice(0, 6).map((lead) => (
                <FollowUpCard
                  key={lead.id}
                  lead={lead}
                  onCall={() => handleRecordCall(lead)}
                  onWhatsApp={() => handleRecordWhatsapp(lead)}
                  onMarkContacted={() => handleMarkContacted(lead)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* New Signup Feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <IconUserPlus className="w-4 h-4 text-blue-500" />
                New Signups
                {todaySignups.length > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300">
                    {todaySignups.length} today
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Recent app registrations</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/leads">View all →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {leadsLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-[84px] w-full" />)
            ) : signupLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <IconUserPlus className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No app signups yet</p>
              </div>
            ) : (
              signupLeads.slice(0, 6).map((lead) => (
                <SignupLeadCard key={lead.id} lead={lead} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Lead Funnel ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconFilter className="w-4 h-4" />
              Lead Funnel
            </CardTitle>
            <CardDescription>Live pipeline stage distribution</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/leads">Manage leads →</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <FunnelView stageCounts={stageCounts} />
        </CardContent>
      </Card>

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
                      <p className="text-sm font-mono">{b._id.slice(-10)}</p>
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

      {/* ── Recent Appointments + Quick Actions ────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Appointments</CardTitle>
              <CardDescription>5 most recent doctor appointments</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/appointments">View all →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {apptLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : recentAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No appointments yet</p>
            ) : (
              <div className="space-y-2">
                {recentAppointments.map((a) => (
                  <div key={a._id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-mono">{a._id.slice(-10)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <StatusBadge status={a.status as number} map={BOOKING_STATUS} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump to common tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="h-12 text-sm">
              <Link href="/admin/users"><IconUsers className="w-4 h-4 mr-2" />Add Member</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 text-sm">
              <Link href="/admin/bookings"><IconCalendarEvent className="w-4 h-4 mr-2" />New Booking</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 text-sm">
              <Link href="/admin/appointments"><IconCalendarStats className="w-4 h-4 mr-2" />New Appointment</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 text-sm">
              <Link href="/admin/slots"><IconClock className="w-4 h-4 mr-2" />Create Slot</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 text-sm">
              <Link href="/admin/doctors"><IconStethoscope className="w-4 h-4 mr-2" />Add Doctor</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 text-sm">
              <Link href="/admin/trainers"><IconRun className="w-4 h-4 mr-2" />Add Trainer</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── CRM Components ───────────────────────────────────────────────────────────

function CrmStatCard({
  title, value, sub, icon, href, urgent,
}: {
  title: string
  value: number | null
  sub: string
  icon: React.ReactNode
  href: string
  urgent?: boolean
}) {
  return (
    <Link href={href} className="block">
      <Card className={`hover:shadow-md transition-shadow cursor-pointer ${urgent ? 'border-amber-400 dark:border-amber-600' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          {value === null ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <div className={`text-2xl font-bold ${urgent && value > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
              {value}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function FollowUpCard({
  lead, onCall, onWhatsApp, onMarkContacted,
}: {
  lead: Lead
  onCall: () => void
  onWhatsApp: () => void
  onMarkContacted: () => void
}) {
  const isOverdue = lead.followUpDate
    ? new Date(lead.followUpDate) < new Date()
    : false

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        isOverdue
          ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20'
          : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{lead.name}</p>
          <p className="text-xs text-muted-foreground">
            {lead.followUpDate
              ? `Due ${timeAgo(lead.followUpDate)}`
              : `Added ${timeAgo(lead.createdAt)}`}
            {lead.interestedIn ? ` · ${lead.interestedIn}` : ''}
          </p>
          {lead.phone && (
            <p className="text-xs text-muted-foreground">{lead.phone}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isOverdue && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>
          )}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{lead.status}</Badge>
        </div>
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" asChild>
          <a href={`tel:${lead.phone}`} onClick={onCall}>
            <IconPhone className="w-3 h-3 mr-1" />Call
          </a>
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" asChild>
          <a
            href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            onClick={onWhatsApp}
          >
            <IconBrandWhatsapp className="w-3 h-3 mr-1 text-green-600" />WhatsApp
          </a>
        </Button>
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs flex-1"
          onClick={onMarkContacted}
          disabled={lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'converted'}
        >
          <IconUserCheck className="w-3 h-3 mr-1" />Contacted
        </Button>
      </div>
    </div>
  )
}

function SignupLeadCard({ lead }: { lead: Lead }) {
  const isToday = toISTDateStr(new Date(lead.createdAt)) === toISTDateStr(new Date())

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    contacted: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    qualified: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
    converted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    lost: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm truncate">{lead.name}</p>
            {isToday && (
              <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 shrink-0">
                New
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {timeAgo(lead.createdAt)}
            {lead.interestedIn ? ` · ${lead.interestedIn}` : ''}
          </p>
          {lead.phone && (
            <p className="text-xs text-muted-foreground">{lead.phone}</p>
          )}
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 capitalize ${
            statusColors[lead.status] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {lead.status}
        </span>
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
          <a href={`tel:${lead.phone}`}>
            <IconPhone className="w-3 h-3 mr-1" />Call
          </a>
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
          <a
            href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
          >
            <IconBrandWhatsapp className="w-3 h-3 mr-1 text-green-600" />WhatsApp
          </a>
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" asChild>
          <Link href="/admin/leads">
            <IconEye className="w-3 h-3 mr-1" />View
          </Link>
        </Button>
      </div>
    </div>
  )
}

function FunnelView({ stageCounts }: { stageCounts: Record<string, number> }) {
  const total = FUNNEL_STAGES.reduce((sum, s) => sum + (stageCounts[s.key] ?? 0), 0) || 1

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-2">
      {FUNNEL_STAGES.map((stage, idx) => {
        const count = stageCounts[stage.key] ?? 0
        const pct = Math.round((count / total) * 100)
        const isLast = idx === FUNNEL_STAGES.length - 1
        return (
          <div key={stage.key} className="flex sm:flex-col items-center gap-2 flex-1">
            <div
              className={`w-full rounded-xl p-4 text-center text-white ${stage.color} flex-1`}
            >
              <div className="text-2xl font-bold leading-none">{count}</div>
              <div className="text-xs font-medium mt-1 opacity-95">{stage.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{pct}%</div>
            </div>
            {!isLast && (
              <IconArrowRight className="w-4 h-4 text-muted-foreground shrink-0 rotate-90 sm:rotate-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Existing Sub-components ──────────────────────────────────────────────────

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
