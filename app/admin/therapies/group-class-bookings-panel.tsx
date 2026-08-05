'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconSearch,
  IconCalendarEvent,
  IconClock,
  IconCoins,
  IconRefresh,
  IconClipboardText,
} from '@tabler/icons-react'
import { useGroupClassBookings } from '@/hooks/use-group-class-bookings'
import { GroupClassBooking } from '@/lib/services/group-class-booking.service'
import { cn } from '@/lib/utils'

// Status Badge styling helper
const STATUS_COLORS: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent dark:bg-blue-900/30 dark:text-blue-300',
  pending: 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-transparent dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-green-100 text-green-800 hover:bg-green-100 border-transparent dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-transparent dark:bg-emerald-900/30 dark:text-emerald-300',
  attended: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-transparent dark:bg-emerald-900/30 dark:text-emerald-300',
  consumed: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-transparent dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-800 hover:bg-red-100 border-transparent dark:bg-red-900/30 dark:text-red-300',
  noshow: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-transparent dark:bg-gray-800/30 dark:text-gray-300',
  'no-show': 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-transparent dark:bg-gray-800/30 dark:text-gray-300',
  unattended: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-transparent dark:bg-gray-800/30 dark:text-gray-300',
}

const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  attended: 'Completed',
  consumed: 'Completed',
  cancelled: 'Cancelled',
  noshow: 'No-Show',
  'no-show': 'No-Show',
  unattended: 'No-Show',
}

function formatStatus(statusStr: string): string {
  const normalized = (statusStr || '').toLowerCase().trim()
  return STATUS_LABELS[normalized] || statusStr || 'Unknown'
}

function getStatusBadgeClass(statusStr: string): string {
  const normalized = (statusStr || '').toLowerCase().trim()
  return STATUS_COLORS[normalized] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

export default function GroupClassBookingsPanel() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<'All' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-Show'>('All')

  const { data: bookings = [], isLoading, isError, refetch } = useGroupClassBookings()

  // Calculate statistics
  const stats = useMemo(() => {
    const total = bookings.length
    const confirmed = bookings.filter(b => {
      const s = (b.status || '').toLowerCase().trim()
      return s === 'confirmed' || s === 'booked'
    }).length
    const pending = bookings.filter(b => (b.status || '').toLowerCase().trim() === 'pending').length
    return { total, confirmed, pending }
  }, [bookings])

  const filteredBookings = useMemo(() => {
    return bookings.filter((b: GroupClassBooking) => {
      // 1. Search term match (Member Name, Email)
      const user = b.user || {}
      const username = (user.username || '').toLowerCase()
      const email = (user.email || '').toLowerCase()
      const search = searchTerm.toLowerCase().trim()

      const matchesSearch = username.includes(search) || email.includes(search)
      if (!matchesSearch) return false

      // 2. Status filter match
      if (activeFilter === 'All') return true
      
      const status = (b.status || '').toLowerCase().trim()
      if (activeFilter === 'Pending') return status === 'pending'
      if (activeFilter === 'Confirmed') return status === 'confirmed' || status === 'booked'
      if (activeFilter === 'Completed') return status === 'completed' || status === 'attended' || status === 'consumed'
      if (activeFilter === 'Cancelled') return status === 'cancelled'
      if (activeFilter === 'No-Show') return status === 'noshow' || status === 'no-show' || status === 'unattended'

      return true
    })
  }, [bookings, searchTerm, activeFilter])

  const handleRowClick = (id: string) => {
    router.push(`/admin/bookings/${id}`)
  }

  const handleRefresh = () => {
    refetch()
  }

  const filters: Array<'All' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-Show'> = [
    'All',
    'Pending',
    'Confirmed',
    'Completed',
    'Cancelled',
    'No-Show',
  ]

  return (
    <div className="space-y-6">
      {/* 1. Gradient Hero Banner */}
      <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-indigo-600 via-blue-500 to-sky-500 text-white">
        <div className="p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/25">
                <IconClipboardText className="h-6 w-6" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight">Group Class Bookings</h2>
              <p className="max-w-2xl text-sm text-indigo-50/95">
                Monitor registration list, search members, and filter booking states from a single dashboard.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <div>
                <p className="text-xs text-indigo-50/90">Total</p>
                <p className="text-xl font-semibold">{stats.total}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-50/90">Confirmed</p>
                <p className="text-xl font-semibold">{stats.confirmed}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-50/90">Pending</p>
                <p className="text-xl font-semibold">{stats.pending}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Heading Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Booking List</h3>
          <p className="text-muted-foreground">Manage and track member registrations for scheduled group classes.</p>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <IconRefresh className="mr-1 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* 3. Search & Filter Header Card */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bookings by member name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          
          {/* Status Filters */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-muted/40 rounded-lg border border-border w-fit">
            {filters.map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'h-8 px-3 rounded-md transition-all text-xs font-medium',
                  activeFilter !== filter && 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {filter}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Bookings Outer List Container */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCalendarEvent className="h-4 w-4 text-indigo-600" />
            Active Bookings
          </CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${filteredBookings.length} bookings found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="py-8 text-center text-red-500">
              Failed to load group class bookings. Please check API connectivity.
            </div>
          ) : isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredBookings.length === 0 ? (
                <Card className="sm:col-span-2 xl:col-span-3 border-dashed">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No bookings found matching your current search/filter.
                  </CardContent>
                </Card>
              ) : (
                filteredBookings.map((booking: GroupClassBooking) => {
                  const dateVal = booking.sessionId?.sessionDate || booking.bookingDate
                  const dateFormatted = dateVal
                    ? new Date(dateVal).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '-'
                  const timeRange =
                    booking.sessionId?.startTime && booking.sessionId?.endTime
                      ? `${booking.sessionId.startTime} - ${booking.sessionId.endTime}`
                      : 'TBD'

                  const instructorName = booking.sessionId?.trainerId?.trainerName || '-'
                  const className = booking.classId?.name || '-'
                  const creditsCost = booking.creditCostSnapshot ?? booking.classId?.creditCost ?? 0

                  return (
                    <Card
                      key={booking._id}
                      className="overflow-hidden rounded-2xl border border-slate-200/85 hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => handleRowClick(booking._id)}
                    >
                      {/* Card Top Header */}
                      <div className="bg-gradient-to-r from-indigo-500/15 to-blue-500/10 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <Badge className={cn('text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full border', getStatusBadgeClass(booking.status))}>
                            {formatStatus(booking.status)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ID: {booking._id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <h4 className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {booking.user?.username || 'Unknown Member'}
                        </h4>
                        <p className="text-xs text-muted-foreground">{booking.user?.email || '-'}</p>
                      </div>

                      {/* Card Content body */}
                      <CardContent className="space-y-3 p-4">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-sm font-semibold text-foreground/90">{className}</span>
                            <span className="text-sm font-medium text-foreground shrink-0 flex items-center gap-0.5">
                              <IconCoins className="h-3.5 w-3.5 text-muted-foreground" /> {creditsCost} cr
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-medium text-slate-500">Instructor: {instructorName}</p>
                        </div>

                        {/* Date & Time Footer */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium">
                            <IconCalendarEvent className="h-3.5 w-3.5" /> {dateFormatted}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <IconClock className="h-3.5 w-3.5" /> {timeRange}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
