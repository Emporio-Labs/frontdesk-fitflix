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
} from '@tabler/icons-react'
import { useUsers } from '@/hooks/use-users'
import { useBookings } from '@/hooks/use-bookings'
import { useAppointments } from '@/hooks/use-appointments'
import { useDoctors } from '@/hooks/use-doctors'
import { useTrainers } from '@/hooks/use-trainers'
import { useSlots } from '@/hooks/use-slots'
import { BOOKING_STATUS } from '@/lib/services/booking.service'

const STATUS_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280']

export default function DashboardPage() {
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useUsers()
  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useBookings()
  const { data: appointments = [], isLoading: apptLoading } = useAppointments()
  const { data: doctors = [], isLoading: doctorsLoading } = useDoctors()
  const { data: trainers = [], isLoading: trainersLoading } = useTrainers()
  const { data: slots = [] } = useSlots()

  const isLoading = usersLoading || bookingsLoading

  // Compute booking status breakdown for bar chart
  const bookingStatusData = Object.entries(BOOKING_STATUS).map(([key, label]) => ({
    status: label,
    count: bookings.filter((b) => b.status === Number(key)).length,
  }))

  // Recent 5 bookings
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime())
    .slice(0, 5)

  // Recent 5 appointments
  const recentAppointments = [...appointments]
    .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
    .slice(0, 5)

  const availableSlots = slots.reduce((sum, slot) => sum + Math.max(slot.remainingCapacity, 0), 0)

  const handleRefreshAll = () => {
    refetchUsers()
    refetchBookings()
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Live overview of your clinic operations
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefreshAll}>
          <IconRefresh className="w-4 h-4 mr-1" /> Refresh All
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Members"
          icon={<IconUsers className="w-4 h-4 text-blue-500" />}
          value={users.length}
          sub="registered users"
          loading={usersLoading}
          href="/admin/users"
          color="blue"
        />
        <StatCard
          title="Doctors"
          icon={<IconStethoscope className="w-4 h-4 text-emerald-500" />}
          value={doctors.length}
          sub="on staff"
          loading={doctorsLoading}
          href="/admin/doctors"
          color="emerald"
        />
        <StatCard
          title="Trainers"
          icon={<IconRun className="w-4 h-4 text-violet-500" />}
          value={trainers.length}
          sub="on staff"
          loading={trainersLoading}
          href="/admin/trainers"
          color="violet"
        />
        <StatCard
          title="Bookings"
          icon={<IconCalendarEvent className="w-4 h-4 text-amber-500" />}
          value={bookings.length}
          sub="total bookings"
          loading={bookingsLoading}
          href="/admin/bookings"
          color="amber"
        />
        <StatCard
          title="Appointments"
          icon={<IconCalendarStats className="w-4 h-4 text-rose-500" />}
          value={appointments.length}
          sub="total appointments"
          loading={apptLoading}
          href="/admin/appointments"
          color="rose"
        />
        <StatCard
          title="Open Slots"
          icon={<IconClock className="w-4 h-4 text-teal-500" />}
          value={availableSlots}
          sub={`across ${slots.length} slot windows`}
          loading={false}
          href="/admin/slots"
          color="teal"
        />
      </div>

      {/* Charts + Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Booking Status Breakdown */}
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
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No bookings yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={bookingStatusData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  />
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

        {/* Recent Bookings */}
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

      {/* Recent Appointments + Quick Actions */}
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

        {/* Quick Actions */}
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

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({
  title, icon, value, sub, loading, href, color,
}: {
  title: string
  icon: React.ReactNode
  value: number
  sub: string
  loading: boolean
  href: string
  color: string
}) {
  return (
    <Link href={href} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <div className="text-2xl font-bold">{value}</div>
          )}
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
