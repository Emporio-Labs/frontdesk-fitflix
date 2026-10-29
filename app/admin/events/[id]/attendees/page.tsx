'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  IconArrowLeft,
  IconCalendarEvent,
  IconClock,
  IconMapPin,
  IconUsers,
  IconTicket,
  IconCheck,
  IconRotate2,
  IconSearch,
  IconDownload,
  IconRefresh,
  IconCopy,
  IconQrcode,
  IconCash,
  IconX,
  IconExternalLink,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getEventById,
  getEventRegistrations,
  toggleRegistrationCheckIn,
  type FitflixEvent,
  type EventRegistration,
  type RosterSummary,
} from '@/lib/services/event.service'

export default function EventAttendeesPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = (params?.id as string) || ''

  const [event, setEvent] = useState<FitflixEvent | null>(null)
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [summary, setSummary] = useState<RosterSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTier, setSelectedTier] = useState('all')
  const [checkInStatus, setCheckInStatus] = useState<'all' | 'checked_in' | 'pending'>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')

  // Action states
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null)

  const loadData = useCallback(async (isRefresh = false) => {
    if (!eventId) return
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const [evtData, rosterData] = await Promise.all([
        getEventById(eventId),
        getEventRegistrations(eventId),
      ])

      setEvent(evtData)
      setRegistrations(rosterData.registrations || [])
      if (rosterData.summary) {
        setSummary(rosterData.summary)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load attendees roster'
      toast.error(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Client-side filtering for fast responsive table interactions
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      // 1. Search Query (Name, Email, Phone, TicketId)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = reg.attendeeName?.toLowerCase().includes(q)
        const matchesEmail = reg.attendeeEmail?.toLowerCase().includes(q)
        const matchesPhone = reg.attendeePhone?.toLowerCase().includes(q)
        const matchesTicket = reg.ticketId?.toLowerCase().includes(q)
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesTicket) {
          return false
        }
      }

      // 2. Tier Filter
      if (selectedTier !== 'all' && reg.tierId !== selectedTier) {
        return false
      }

      // 3. Check-In Status
      if (checkInStatus === 'checked_in' && !reg.checkedIn) return false
      if (checkInStatus === 'pending' && reg.checkedIn) return false

      // 4. Payment Status
      if (paymentStatusFilter !== 'all') {
        if (paymentStatusFilter === 'paid' && reg.paymentStatus !== 'paid') return false
        if (
          paymentStatusFilter === 'free_claim' &&
          reg.paymentStatus !== 'free' &&
          reg.paymentStatus !== 'free_claim'
        )
          return false
      }

      return true
    })
  }, [registrations, searchQuery, selectedTier, checkInStatus, paymentStatusFilter])

  // Handle Manual Check-In Toggle
  const handleToggleCheckIn = async (reg: EventRegistration) => {
    const regId = reg._id || reg.id
    if (!regId) return

    try {
      setTogglingId(regId)
      const res = await toggleRegistrationCheckIn(regId)

      // Update local registration state
      setRegistrations((prev) =>
        prev.map((item) => {
          if ((item._id || item.id) === regId) {
            return {
              ...item,
              checkedIn: res.registration.checkedIn,
              checkedInAt: res.registration.checkedInAt,
            }
          }
          return item
        })
      )

      // Update summary counter dynamically
      setSummary((prev) => {
        if (!prev) return null
        const newCheckedIn = res.registration.checkedIn
          ? prev.totalCheckedIn + 1
          : Math.max(0, prev.totalCheckedIn - 1)
        const newPending = Math.max(0, prev.totalRegistered - newCheckedIn)
        const newPct =
          prev.totalRegistered > 0
            ? Math.round((newCheckedIn / prev.totalRegistered) * 100)
            : 0

        return {
          ...prev,
          totalCheckedIn: newCheckedIn,
          totalPending: newPending,
          checkedInPercentage: newPct,
        }
      })

      toast.success(res.message)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update check-in status'
      toast.error(msg)
    } finally {
      setTogglingId(null)
    }
  }

  // Copy Ticket ID
  const handleCopyTicket = (ticketId: string) => {
    navigator.clipboard.writeText(ticketId)
    setCopiedTicketId(ticketId)
    toast.success(`Copied ${ticketId} to clipboard`)
    setTimeout(() => setCopiedTicketId(null), 2000)
  }

  // Export CSV Roster
  const handleExportCSV = () => {
    if (!registrations || registrations.length === 0) {
      toast.error('No attendees available to export')
      return
    }

    const headers = [
      'Ticket ID',
      'Attendee Name',
      'Attendee Email',
      'Attendee Phone',
      'Pass Tier Name',
      'Tier ID',
      'Amount Paid (INR)',
      'Payment Status',
      'Checked In',
      'Checked In At',
      'Registered At',
    ]

    const rows = registrations.map((r) => [
      `"${r.ticketId || ''}"`,
      `"${(r.attendeeName || '').replace(/"/g, '""')}"`,
      `"${(r.attendeeEmail || '').replace(/"/g, '""')}"`,
      `"${r.attendeePhone || ''}"`,
      `"${(r.tierName || '').replace(/"/g, '""')}"`,
      `"${r.tierId || ''}"`,
      r.amountPaid ?? 0,
      `"${r.paymentStatus || ''}"`,
      r.checkedIn ? 'YES' : 'NO',
      `"${r.checkedInAt ? new Date(r.checkedInAt).toLocaleString() : ''}"`,
      `"${r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    const fileSlug = event?.slug || 'event'
    link.setAttribute('download', `Fitflix-${fileSlug}-Attendees-Roster.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Roster CSV downloaded successfully')
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedTier('all')
    setCheckInStatus('all')
    setPaymentStatusFilter('all')
  }

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedTier !== 'all' ||
    checkInStatus !== 'all' ||
    paymentStatusFilter !== 'all'

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-semibold">Event Not Found</h2>
        <p className="text-muted-foreground">The event with ID {eventId} could not be loaded.</p>
        <Link href="/admin/events">
          <Button variant="outline" className="gap-2">
            <IconArrowLeft className="h-4 w-4" /> Back to Events
          </Button>
        </Link>
      </div>
    )
  }

  const capacity = summary?.totalCapacity || event.totalCapacity || 100
  const totalRegistered = summary?.totalRegistered ?? registrations.length
  const totalCheckedIn = summary?.totalCheckedIn ?? registrations.filter((r) => r.checkedIn).length
  const checkedInPct = summary?.checkedInPercentage ?? (totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0)
  const totalRevenue = summary?.totalRevenue ?? registrations.reduce((acc, r) => acc + (r.amountPaid || 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link
              href="/admin/events"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <IconArrowLeft className="h-3.5 w-3.5" /> Events
            </Link>
            <span>/</span>
            <span className="truncate max-w-xs">{event.title}</span>
            <span>/</span>
            <span className="text-foreground font-medium">Attendees & Bookings</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
            <Badge
              variant="outline"
              className="capitalize text-xs font-semibold bg-primary/10 text-primary border-primary/20"
            >
              {event.eventType?.replace('_', ' ')}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <IconCalendarEvent className="h-3.5 w-3.5 text-primary" />
              {new Date(event.startDate).toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <IconClock className="h-3.5 w-3.5 text-primary" />
              Reporting: {event.reportingTime}
            </span>
            <span className="flex items-center gap-1">
              <IconMapPin className="h-3.5 w-3.5 text-primary" />
              {event.venue?.name}, {event.venue?.city}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="gap-1.5 text-xs"
            title="Refresh Roster"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Link href={`/admin/events/demo-ticket?eventId=${event.id || event._id}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <IconTicket className="h-3.5 w-3.5 text-emerald-500" />
              Demo Pass
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <IconDownload className="h-3.5 w-3.5" />
            Export CSV
          </Button>

          <Link href={`/events/${event.slug}`} target="_blank">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
              <IconExternalLink className="h-3.5 w-3.5" />
              Public Page
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Bookings */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Total Bookings</span>
              <IconUsers className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              <span>{totalRegistered}</span>
              <span className="text-xs text-muted-foreground font-normal">
                / {capacity} capacity
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Progress value={Math.min(100, (totalRegistered / capacity) * 100)} className="h-1.5" />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{Math.round((totalRegistered / capacity) * 100)}% Claimed</span>
              <span>{Math.max(0, capacity - totalRegistered)} slots left</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Checked In Attendance */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Checked-In Attendees</span>
              <IconCheck className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-baseline gap-2">
              <span>{totalCheckedIn}</span>
              <span className="text-xs text-muted-foreground font-normal">
                / {totalRegistered} booked
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Progress value={checkedInPct} className="h-1.5 [&>div]:bg-emerald-500" />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{checkedInPct}% Attendance</span>
              <span>{Math.max(0, totalRegistered - totalCheckedIn)} Pending</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Revenue / Value */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Revenue / Collections</span>
              <IconCash className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              ₹{totalRevenue.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">
              Collected across {registrations.filter((r) => r.amountPaid > 0).length} paid &{' '}
              {registrations.filter((r) => r.amountPaid === 0).length} free passes
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Tier Distribution */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Ticket Tiers Breakdown</span>
              <IconTicket className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-base font-semibold">
              {summary?.tierBreakdown?.length || event.ticketTiers?.length || 0} Pass Types
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1 max-h-16 overflow-y-auto pr-1">
              {(summary?.tierBreakdown || []).map((t) => (
                <div key={t.tierId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: t.badgeColor || '#10b981' }}
                    />
                    <span className="truncate text-muted-foreground">{t.name}</span>
                  </div>
                  <span className="font-mono text-[11px] font-medium shrink-0">
                    {t.bookedCount}/{t.totalQuantity}
                  </span>
                </div>
              ))}
              {(!summary?.tierBreakdown || summary.tierBreakdown.length === 0) && (
                <p className="text-[11px] text-muted-foreground">No tier passes configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search attendee name, email, phone (+91...), ticket ID (FFX-COMM-...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Tier Filter */}
            <div className="w-full sm:w-48">
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Pass Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pass Tiers</SelectItem>
                  {(event.ticketTiers || []).map((t) => (
                    <SelectItem key={t.tierId} value={t.tierId}>
                      {t.name} ({t.badgeLabel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Check-in Status Filter */}
            <div className="w-full sm:w-40">
              <Select
                value={checkInStatus}
                onValueChange={(v) => setCheckInStatus(v as 'all' | 'checked_in' | 'pending')}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Check-In Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Check-Ins</SelectItem>
                  <SelectItem value="checked_in">Checked In Only</SelectItem>
                  <SelectItem value="pending">Pending Arrival</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status Filter */}
            <div className="w-full sm:w-36">
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid Passes</SelectItem>
                  <SelectItem value="free_claim">Free RSVP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Reset all filters"
              >
                <IconX className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
            <span>
              Showing <strong className="text-foreground">{filteredRegistrations.length}</strong> of{' '}
              {registrations.length} attendee bookings
            </span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                Filters applied
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendee Roster Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[280px]">Attendee Contact</TableHead>
                <TableHead className="w-[220px]">Ticket Pass & Tier</TableHead>
                <TableHead className="w-[160px]">Registration Time</TableHead>
                <TableHead className="w-[120px]">Payment</TableHead>
                <TableHead className="w-[180px]">Check-In Status</TableHead>
                <TableHead className="text-right w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegistrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                      <IconTicket className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium">
                        {hasActiveFilters
                          ? 'No attendees match the active filters.'
                          : 'No bookings recorded for this event yet.'}
                      </p>
                      {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs">
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegistrations.map((reg) => {
                  const regId = reg._id || reg.id
                  const isToggling = togglingId === regId

                  // Find tier styling
                  const tier = event.ticketTiers?.find((t) => t.tierId === reg.tierId)
                  const badgeColor = tier?.badgeColor || '#10b981'
                  const badgeLabel = tier?.badgeLabel || reg.tierName || 'GENERAL'

                  return (
                    <TableRow key={regId} className="hover:bg-muted/40 transition-colors">
                      {/* 1. Attendee Contact */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                            {reg.attendeeName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[240px]">
                            {reg.attendeeEmail}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {reg.attendeePhone}
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Ticket Pass & Tier */}
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted border text-foreground">
                              {reg.ticketId}
                            </span>
                            <button
                              onClick={() => handleCopyTicket(reg.ticketId)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title="Copy Ticket ID"
                            >
                              {copiedTicketId === reg.ticketId ? (
                                <IconCheck className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <IconCopy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <div>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: `${badgeColor}20`,
                                color: badgeColor,
                                border: `1px solid ${badgeColor}40`,
                              }}
                            >
                              {badgeLabel}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 3. Registration Time */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <div className="font-medium text-foreground">
                            {new Date(reg.createdAt).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[11px]">
                            {new Date(reg.createdAt).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </TableCell>

                      {/* 4. Payment */}
                      <TableCell>
                        {reg.amountPaid > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          >
                            ₹{reg.amountPaid}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                          >
                            Free RSVP
                          </Badge>
                        )}
                      </TableCell>

                      {/* 5. Check-In Status */}
                      <TableCell>
                        {reg.checkedIn ? (
                          <div className="space-y-0.5">
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 text-[11px]">
                              <IconCheck className="h-3 w-3" /> Checked In
                            </Badge>
                            {reg.checkedInAt && (
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {new Date(reg.checkedInAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[11px] text-muted-foreground font-normal bg-muted"
                          >
                            Pending Arrival
                          </Badge>
                        )}
                      </TableCell>

                      {/* 6. Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click Check In / Undo */}
                          <Button
                            variant={reg.checkedIn ? 'ghost' : 'outline'}
                            size="sm"
                            disabled={isToggling}
                            onClick={() => handleToggleCheckIn(reg)}
                            className={`h-7 px-2 text-xs gap-1 ${
                              reg.checkedIn
                                ? 'text-muted-foreground hover:text-amber-500'
                                : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                            }`}
                            title={
                              reg.checkedIn
                                ? 'Undo check-in for attendee'
                                : 'Manually check in attendee'
                            }
                          >
                            {isToggling ? (
                              <IconRefresh className="h-3.5 w-3.5 animate-spin" />
                            ) : reg.checkedIn ? (
                              <>
                                <IconRotate2 className="h-3 w-3" /> Undo
                              </>
                            ) : (
                              <>
                                <IconCheck className="h-3 w-3" /> Check In
                              </>
                            )}
                          </Button>

                          {/* View Digital Pass */}
                          <Link href={`/pass/${reg.ticketId}`} target="_blank">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Open Attendee Digital Pass"
                            >
                              <IconExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
