'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  IconCalendar,
  IconCalendarEvent,
  IconCalendarStats,
  IconCheck,
  IconX,
  IconClock,
  IconCirclePlus,
  IconArrowRight,
  IconRefresh,
  IconSearch,
  IconFilter,
  IconDownload,
  IconEye,
  IconPencil,
  IconTrash,
  IconDotsVertical,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react'
import {
  useBookings,
  useDeleteBooking,
  useChangeBookingStatus,
} from '@/hooks/use-bookings'
import { useSlots } from '@/hooks/use-slots'
import { useServices } from '@/hooks/use-services'
import { useTherapies } from '@/hooks/use-therapies'
import { useUsers } from '@/hooks/use-users'
import {
  BOOKING_STATUS,
  BookingStatusValue,
  Booking,
} from '@/lib/services/booking.service'
import { getBookingServiceName, getBookingTimeSlotLabel } from '@/lib/populated'
import { cn, toUtcDateKey } from '@/lib/utils'
import { toast } from 'sonner'

const UTC_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

function getTodayDateKey() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function formatDateForDisplay(value?: string) {
  if (!value) return '-'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : UTC_DATE_FORMATTER.format(parsed)
}

function formatDateKey(value: string) {
  if (!value) return '-'
  return formatDateForDisplay(`${value}T00:00:00.000Z`)
}

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today')
  const [selectedDateKey, setSelectedDateKey] = useState(getTodayDateKey())
  const [searchTerm, setSearchTerm] = useState('')
  const [todaySearchTerm, setTodaySearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  const { data: bookings = [], isLoading, isError, refetch } = useBookings()
  const { data: slots = [] } = useSlots()
  const { data: services = [] } = useServices()
  const { data: therapies = [] } = useTherapies()
  const { data: users = [] } = useUsers()

  const deleteBooking = useDeleteBooking()
  const changeStatus = useChangeBookingStatus()

  const selectedCalendarDate = useMemo(() => {
    if (!selectedDateKey) return undefined
    const parsed = new Date(`${selectedDateKey}T00:00:00.000Z`)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }, [selectedDateKey])

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    setSelectedDateKey(local.toISOString().slice(0, 10))
  }

  // Lookups
  const userById = useMemo(
    () => new Map(users.map((u) => [u._id, u.username || u.email || 'Member'])),
    [users]
  )

  const serviceById = useMemo(
    () =>
      new Map([
        ...services.map((s) => [s.id, s.name] as const),
        ...therapies.map((t) => [t.id, t.name] as const),
      ]),
    [services, therapies]
  )

  const slotById = useMemo(() => new Map(slots.map((s) => [s._id, s])), [slots])

  // Normalized bookings with names and dates
  const enrichedBookings = useMemo(() => {
    return bookings.map((b) => {
      const uRef = b.user
      const uId = typeof uRef === 'object' && uRef !== null ? uRef._id : (typeof uRef === 'string' ? uRef : '')
      const userName =
        (uId ? userById.get(uId) : null) ||
        (typeof uRef === 'object' && uRef !== null ? uRef.username || uRef.email : null) ||
        'Member'

      const sRef = b.service
      const sId = typeof sRef === 'object' && sRef !== null ? sRef._id : (typeof sRef === 'string' ? sRef : '')
      const serviceName =
        (sId ? serviceById.get(sId) : null) ||
        (typeof sRef === 'object' && sRef !== null ? sRef.serviceName : null) ||
        getBookingServiceName(b, undefined, serviceById, 'Service')

      const timeLabel = getBookingTimeSlotLabel(b, slotById, '10:00 AM')
      const dateKey = toUtcDateKey(b.bookingDate)
      return {
        ...b,
        userName,
        serviceName,
        timeLabel,
        dateKey,
      }
    })
  }, [bookings, userById, serviceById, slotById])

  // Metric counts
  const totalCount = enrichedBookings.length

  const todayBookings = useMemo(() => {
    return enrichedBookings.filter((b) => b.dateKey === selectedDateKey)
  }, [enrichedBookings, selectedDateKey])

  const attendedCount = useMemo(
    () => enrichedBookings.filter((b) => b.status === 1 || b.status === 3).length,
    [enrichedBookings]
  )

  const bookedCount = useMemo(
    () => enrichedBookings.filter((b) => b.status === 0).length,
    [enrichedBookings]
  )

  const cancelledCount = useMemo(
    () => enrichedBookings.filter((b) => b.status === 2).length,
    [enrichedBookings]
  )

  const noShowCount = useMemo(
    () => enrichedBookings.filter((b) => b.status === 4).length,
    [enrichedBookings]
  )

  const attendedPct = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0
  const bookedPct = totalCount > 0 ? Math.round((bookedCount / totalCount) * 100) : 0
  const cancelledPct = totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0
  const noShowPct = totalCount > 0 ? Math.round((noShowCount / totalCount) * 100) : 0

  // Filtered Today's Bookings
  const filteredTodayBookings = useMemo(() => {
    if (!todaySearchTerm.trim()) return todayBookings
    const q = todaySearchTerm.toLowerCase()
    return todayBookings.filter(
      (b) =>
        b.userName.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q) ||
        b._id.toLowerCase().includes(q)
    )
  }, [todayBookings, todaySearchTerm])

  // Filtered All Bookings
  const filteredAllBookings = useMemo(() => {
    return enrichedBookings.filter((b) => {
      if (statusFilter !== 'all' && String(b.status) !== statusFilter) {
        return false
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matches =
          b.userName.toLowerCase().includes(q) ||
          b.serviceName.toLowerCase().includes(q) ||
          b._id.toLowerCase().includes(q)
        if (!matches) return false
      }
      return true
    })
  }, [enrichedBookings, statusFilter, searchTerm])

  // Pagination for All Bookings
  const totalPages = Math.max(1, Math.ceil(filteredAllBookings.length / rowsPerPage))
  const paginatedAllBookings = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredAllBookings.slice(start, start + rowsPerPage)
  }, [filteredAllBookings, currentPage, rowsPerPage])

  const handleStatusChange = (id: string, status: string) => {
    changeStatus.mutate({ id, status: Number(status) as BookingStatusValue })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this booking?')) {
      deleteBooking.mutate(id)
    }
  }

  const handleExportCsv = () => {
    if (filteredAllBookings.length === 0) {
      toast.error('No bookings to export')
      return
    }
    const headers = ['Booking ID', 'Member', 'Service', 'Date', 'Time', 'Credits', 'Status']
    const rows = filteredAllBookings.map((b) => [
      b._id,
      `"${b.userName}"`,
      `"${b.serviceName}"`,
      formatDateForDisplay(b.bookingDate),
      b.timeLabel,
      b.creditCostSnapshot ?? 0,
      BOOKING_STATUS[b.status as keyof typeof BOOKING_STATUS] ?? b.status,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `fitflix_bookings_${selectedDateKey}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Bookings exported to CSV')
  }

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
      case 3:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100/80 text-emerald-700">
            Attended
          </span>
        )
      case 0:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100/80 text-blue-700">
            Booked
          </span>
        )
      case 2:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100/80 text-rose-700">
            Cancelled
          </span>
        )
      case 4:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100/80 text-amber-700">
            No Show
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {BOOKING_STATUS[status as keyof typeof BOOKING_STATUS] ?? status}
          </span>
        )
    }
  }

  return (
    <div className="flex-1 space-y-5 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6 bg-slate-50/50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Bookings</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            View and manage all bookings, today's schedule, and booking history.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Date Picker Button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-medium bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
              >
                <IconCalendar className="w-4 h-4 mr-2 text-slate-500" />
                {formatDateKey(selectedDateKey)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedCalendarDate}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 px-3 text-xs font-medium bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <IconRefresh className="w-4 h-4 mr-1.5 text-slate-500" /> Refresh
          </Button>
        </div>
      </div>

      {/* 6 KPI Stat Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Today's Bookings */}
        <Card className="bg-white border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
              <IconCalendarEvent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Today's Bookings</p>
              <h3 className="text-xl font-bold text-slate-900 leading-tight mt-0.5">{todayBookings.length}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{formatDateKey(selectedDateKey)}</p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Total Bookings */}
        <Card className="bg-white border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <IconCalendarStats className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Total Bookings</p>
              <h3 className="text-xl font-bold text-slate-900 leading-tight mt-0.5">{totalCount}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">All time</p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Attended */}
        <Card className="bg-white border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <IconCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Attended</p>
              <h3 className="text-xl font-bold text-slate-900 leading-tight mt-0.5">{attendedCount}</h3>
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{attendedPct}% of total</p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Booked */}
        <Card className="bg-white border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
              <IconCalendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Booked</p>
              <h3 className="text-xl font-bold text-slate-900 leading-tight mt-0.5">{bookedCount}</h3>
              <p className="text-[10px] text-slate-600 font-medium mt-0.5">{bookedPct}% of total</p>
            </div>
          </CardContent>
        </Card>

        {/* 5. Cancelled */}
        <Card className="bg-white border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <IconX className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Cancelled</p>
              <h3 className="text-xl font-bold text-slate-900 leading-tight mt-0.5">{cancelledCount}</h3>
              <p className="text-[10px] text-rose-600 font-medium mt-0.5">{cancelledPct}% of total</p>
            </div>
          </CardContent>
        </Card>

        {/* 6. No Show */}
        <Card className="bg-white border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <IconClock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">No Show</p>
              <h3 className="text-xl font-bold text-slate-900 leading-tight mt-0.5">{noShowCount}</h3>
              <p className="text-[10px] text-amber-600 font-medium mt-0.5">{noShowPct}% of total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={cn(
            'pb-3 font-semibold transition-all relative flex items-center gap-2',
            activeTab === 'today'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <span>Today's Bookings</span>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-bold',
            activeTab === 'today' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
          )}>
            {todayBookings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'pb-3 font-semibold transition-all relative flex items-center gap-2',
            activeTab === 'all'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <span>All Bookings</span>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-bold',
            activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
          )}>
            {totalCount}
          </span>
        </button>
      </div>

      {/* Promotional / Action Callout Banner */}
      <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <IconCirclePlus className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Need to create a new spot booking?</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Go to Spot Booking to select member, service, and slot with credit-aware actions.
            </p>
          </div>
        </div>
        <Link href="/admin/spot-booking">
          <Button className="h-9 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs shrink-0 flex items-center gap-1.5">
            <span>Go to Spot Booking</span>
            <IconArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Main Table Content */}
      {activeTab === 'today' ? (
        /* Today's Bookings Table Card */
        <Card className="bg-white border-slate-200 shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Today's Bookings</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {todayBookings.length} booking{todayBookings.length === 1 ? '' : 's'} for {formatDateKey(selectedDateKey)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search member, service, or booking ID..."
                  value={todaySearchTerm}
                  onChange={(e) => setTodaySearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
            </div>
          </div>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredTodayBookings.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">
                No bookings scheduled for {formatDateKey(selectedDateKey)}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
                      <TableHead className="text-xs font-semibold text-slate-500 pl-6">Time</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Member</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Service</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Credits</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTodayBookings.map((b) => (
                      <TableRow key={b._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6 text-xs font-medium text-slate-700 whitespace-nowrap">
                          {b.timeLabel}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
                              {b.userName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-xs text-slate-800">{b.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-700 uppercase tracking-tight">
                          {b.serviceName}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium">
                          {b.creditCostSnapshot ?? 0} cr
                        </TableCell>
                        <TableCell>{getStatusBadge(b.status)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1 text-slate-400">
                            {/* Action: Quick Status Select */}
                            <Select onValueChange={(v) => handleStatusChange(b._id, v)}>
                              <SelectTrigger className="h-7 w-28 text-[11px] border-slate-200 bg-white">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(BOOKING_STATUS).map(([key, label]) => (
                                  <SelectItem key={key} value={key} className="text-xs">
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Action: Delete */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => handleDelete(b._id)}
                              title="Delete booking"
                            >
                              <IconTrash className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* All Bookings Table Card */
        <Card className="bg-white border-slate-200 shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">All Bookings</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredAllBookings.length} booking{filteredAllBookings.length === 1 ? '' : 's'} (newest first)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search by ID, member, or service..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
                <SelectTrigger className="h-9 w-32 text-xs border-slate-200 bg-white">
                  <IconFilter className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="0">Booked</SelectItem>
                  <SelectItem value="1">Attended</SelectItem>
                  <SelectItem value="2">Cancelled</SelectItem>
                  <SelectItem value="4">No Show</SelectItem>
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="h-9 px-3 text-xs font-medium bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <IconDownload className="w-4 h-4 mr-1 text-slate-500" /> Export
              </Button>
            </div>
          </div>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : paginatedAllBookings.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">
                No bookings match your search filters.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
                        <TableHead className="text-xs font-semibold text-slate-500 pl-6">Booking ID</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500">Member</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500">Service</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500">Date & Time</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500">Credits</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAllBookings.map((b) => (
                        <TableRow key={b._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6 font-mono text-xs text-slate-500">
                            {b._id.slice(-6)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
                                {b.userName.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-xs text-slate-800">{b.userName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-700 uppercase tracking-tight">
                            {b.serviceName}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                            <span className="font-medium">{formatDateForDisplay(b.bookingDate)}</span>
                            <span className="text-slate-400 ml-1.5">{b.timeLabel}</span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 font-medium">
                            {b.creditCostSnapshot ?? 0} cr
                          </TableCell>
                          <TableCell>{getStatusBadge(b.status)}</TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1 text-slate-400">
                              <Select onValueChange={(v) => handleStatusChange(b._id, v)}>
                                <SelectTrigger className="h-7 w-28 text-[11px] border-slate-200 bg-white">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(BOOKING_STATUS).map(([key, label]) => (
                                    <SelectItem key={key} value={key} className="text-xs">
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => handleDelete(b._id)}
                                title="Delete booking"
                              >
                                <IconTrash className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>Rows per page</span>
                    <Select
                      value={String(rowsPerPage)}
                      onValueChange={(v) => {
                        setRowsPerPage(Number(v))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-8 w-16 text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="ml-2">
                      {(currentPage - 1) * rowsPerPage + 1}-
                      {Math.min(currentPage * rowsPerPage, filteredAllBookings.length)} of {filteredAllBookings.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <IconChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pg) => (
                      <Button
                        key={pg}
                        variant={currentPage === pg ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'h-8 w-8 p-0 text-xs font-semibold',
                          currentPage === pg && 'bg-slate-900 hover:bg-slate-800 text-white'
                        )}
                        onClick={() => setCurrentPage(pg)}
                      >
                        {pg}
                      </Button>
                    ))}
                    {totalPages > 5 && <span className="px-1 text-slate-400">...</span>}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <IconChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
