'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  IconBroadcast,
  IconCalendarEvent,
  IconClock,
  IconCopy,
  IconPlayerPlay,
  IconRefresh,
  IconUserCheck,
  IconUsers,
  IconVideo,
  IconWifi,
  IconX,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLiveSessions, useEndSession } from '@/hooks/use-live-sessions'
import { SessionTypeBadge } from '@/components/live-sessions/session-type-badge'
import type { LiveSession } from '@/lib/services/live-session.service'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

type StatusFilter = 'ALL' | 'SCHEDULED' | 'FULL' | 'COMPLETED' | 'CANCELLED'

function formatSessionDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTimeRange(start: string, end: string): string {
  return `${start} – ${end}`
}

// `startsAtUtc`/`endsAtUtc` are computed server-side in the business timezone;
// reconstructing from sessionDate + "HH:mm" with the browser's local Date()
// drifts by whatever offset separates the browser from the gym (5h30m for a
// US/UK browser against an IST gym) — prefer the absolute instant whenever
// the backend has provided one.
function resolveSessionStart(session: LiveSession): Date | null {
  if (session.startsAtUtc) {
    const d = new Date(session.startsAtUtc)
    if (!Number.isNaN(d.getTime())) return d
  }
  const sessionStart = new Date(session.sessionDate)
  const [hours, minutes] = session.startTime.split(':').map(Number)
  if (Number.isNaN(sessionStart.getTime()) || Number.isNaN(hours) || Number.isNaN(minutes)) return null
  sessionStart.setHours(hours, minutes, 0, 0)
  return sessionStart
}

function resolveSessionEnd(session: LiveSession): Date | null {
  if (session.endsAtUtc) {
    const d = new Date(session.endsAtUtc)
    if (!Number.isNaN(d.getTime())) return d
  }
  const sessionEnd = new Date(session.sessionDate)
  const [hours, minutes] = session.endTime.split(':').map(Number)
  if (Number.isNaN(sessionEnd.getTime()) || Number.isNaN(hours) || Number.isNaN(minutes)) return null
  sessionEnd.setHours(hours, minutes, 0, 0)
  return sessionEnd
}

// The backend's actual join window is the authority (30 min lead, no fixed
// upper bound while the host keeps re-minting past the scheduled end) — this
// only needs to be loose enough not to hide the Start button prematurely.
// Closing happens on status, not the clock: COMPLETED/CANCELLED, not "too late".
function canStartSession(session: LiveSession): boolean {
  if (session.status !== 'SCHEDULED' && session.status !== 'FULL') return false

  const sessionStart = resolveSessionStart(session)
  if (!sessionStart) return false

  const earliestStart = new Date(sessionStart.getTime() - 30 * 60 * 1000)
  return new Date() >= earliestStart
}

function getSessionTimeStatus(session: LiveSession): { label: string; color: string } {
  if (session.status === 'COMPLETED') return { label: 'Completed', color: 'text-gray-500' }
  if (session.status === 'CANCELLED') return { label: 'Cancelled', color: 'text-red-500' }

  const sessionStart = resolveSessionStart(session)
  const sessionEnd = resolveSessionEnd(session)
  if (!sessionStart) return { label: session.status, color: 'text-muted-foreground' }

  const now = new Date()
  const diffMs = sessionStart.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / 60000)

  if (diffMins > 60) {
    const diffHours = Math.round(diffMins / 60)
    return { label: `Starts in ${diffHours}h`, color: 'text-muted-foreground' }
  }
  if (diffMins > 0) {
    return { label: `Starts in ${diffMins}m`, color: 'text-amber-600' }
  }
  if (diffMins > -15) {
    return { label: 'Starting now', color: 'text-emerald-600 font-semibold animate-pulse' }
  }
  if (sessionEnd && now > sessionEnd) {
    return { label: 'Passed', color: 'text-muted-foreground' }
  }
  return { label: 'In progress', color: 'text-emerald-600' }
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  FULL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  COMPLETED: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export function LiveSessionsPanel() {
  const router = useRouter()
  let authUser: any = null
  let userRole: string = 'admin'
  try {
    const auth = useAuth()
    authUser = auth.user
    userRole = auth.role
  } catch {
    /* fallback if auth provider not present */
  }

  const { data: sessions = [], isLoading, isError, refetch } = useLiveSessions()
  const endSession = useEndSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [mySessionsOnly, setMySessionsOnly] = useState(false)
  const [dateTab, setDateTab] = useState<'today' | 'tomorrow' | 'all' | 'custom'>('today')

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const tomorrowStr = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().slice(0, 10)
  }, [])

  const handleTabChange = (val: string) => {
    setDateTab(val as any)
    if (val === 'today') {
      setSelectedDate(todayStr)
    } else if (val === 'tomorrow') {
      setSelectedDate(tomorrowStr)
    } else if (val === 'all') {
      setSelectedDate('')
    }
  }

  const handleDateChange = (val: string) => {
    setSelectedDate(val)
    if (val === todayStr) {
      setDateTab('today')
    } else if (val === tomorrowStr) {
      setDateTab('tomorrow')
    } else if (val === '') {
      setDateTab('all')
    } else {
      setDateTab('custom')
    }
  }

  const filteredSessions = useMemo(() => {
    let list = sessions
    if (statusFilter !== 'ALL') {
      list = list.filter((s: LiveSession) => s.status === statusFilter)
    }
    if (selectedDate) {
      list = list.filter((s: LiveSession) => {
        if (!s.sessionDate) return false
        const sDate = s.sessionDate.includes('T') ? s.sessionDate.split('T')[0] : s.sessionDate
        return sDate === selectedDate
      })
    } else {
      const todayStr = new Date().toISOString().slice(0, 10)
      list = list.filter((s: LiveSession) => {
        if (!s.sessionDate) return false
        const sDate = s.sessionDate.includes('T') ? s.sessionDate.split('T')[0] : s.sessionDate
        return sDate >= todayStr
      })
    }
    if (mySessionsOnly && authUser) {
      list = list.filter((s: LiveSession) => {
        const matchId = s.instructorUserId && s.instructorUserId === authUser.id
        const matchName =
          s.instructor &&
          authUser.name &&
          s.instructor.toLowerCase().trim() === authUser.name.toLowerCase().trim()
        return matchId || matchName
      })
    }
    const q = searchTerm.toLowerCase()
    if (q) {
      list = list.filter(
        (s: LiveSession) =>
          s.className.toLowerCase().includes(q) ||
          s.instructor.toLowerCase().includes(q) ||
          s.videoConferenceId.toLowerCase().includes(q)
      )
    }
    return list
  }, [sessions, statusFilter, selectedDate, mySessionsOnly, authUser, searchTerm])

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const activePeriodSessions = sessions.filter((s: LiveSession) => {
      if (!s.sessionDate) return false
      const sDate = s.sessionDate.includes('T') ? s.sessionDate.split('T')[0] : s.sessionDate
      return sDate >= todayStr
    })

    const total = activePeriodSessions.length
    const scheduled = activePeriodSessions.filter((s: LiveSession) => s.status === 'SCHEDULED' || s.status === 'FULL').length
    const live = activePeriodSessions.filter((s: LiveSession) => {
      if (s.status !== 'SCHEDULED' && s.status !== 'FULL') return false
      const sessionStart = resolveSessionStart(s)
      return sessionStart ? new Date() >= sessionStart : false
    }).length
    const completed = activePeriodSessions.filter((s: LiveSession) => s.status === 'COMPLETED').length
    return { total, scheduled, live, completed }
  }, [sessions])

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success('Conference ID copied')
  }

  const handleStartSession = (session: LiveSession) => {
    router.push(`/admin/live-session/${session.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white">
        <div className="p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/25">
                <IconBroadcast className="h-6 w-6" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight">Live Sessions</h2>
              <p className="max-w-2xl text-sm text-purple-100/95">
                Monitor online sessions, manage live streaming and video conferences, and launch hosting in one place.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <div>
                <p className="text-xs text-purple-100/90">Total</p>
                <p className="text-xl font-semibold">{stats.total}</p>
              </div>
              <div>
                <p className="text-xs text-purple-100/90">Upcoming</p>
                <p className="text-xl font-semibold">{stats.scheduled}</p>
              </div>
              <div>
                <p className="text-xs text-purple-100/90">Live Now</p>
                <p className="text-xl font-semibold text-emerald-300">{stats.live}</p>
              </div>
              <div>
                <p className="text-xs text-purple-100/90">Completed</p>
                <p className="text-xl font-semibold">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Online Sessions</h3>
          <p className="text-muted-foreground">View and manage video conference and live streaming sessions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <IconRefresh className="mr-1 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex justify-start">
        <Tabs value={dateTab} onValueChange={handleTabChange} className="w-[360px]">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
            <TabsTrigger value="all">All Upcoming</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search by class name, instructor, or conference ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer border rounded-md px-2.5 py-2 bg-background hover:bg-muted/40 transition-colors">
              <Checkbox
                checked={mySessionsOnly}
                onCheckedChange={(c) => setMySessionsOnly(Boolean(c))}
              />
              <span className="font-medium text-foreground">My Sessions</span>
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-[160px]"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="FULL">Full</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || statusFilter !== 'ALL' || selectedDate || mySessionsOnly) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                  setSelectedDate('')
                  setDateTab('all')
                  setMySessionsOnly(false)
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <IconX className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconWifi className="h-4 w-4 text-purple-600" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${filteredSessions.length} session${filteredSessions.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError && (
            <div className="py-8 text-center text-red-500">
              Failed to load sessions. Please check API connectivity.
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <IconBroadcast className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="text-lg font-medium">No online sessions found</p>
              <p className="text-sm">Sessions with Online or Hybrid delivery type will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session: LiveSession) => {
                const timeStatus = getSessionTimeStatus(session)
                const canStart = canStartSession(session)
                const isAuthorized =
                  !authUser ||
                  userRole === 'admin' ||
                  userRole === 'superadmin' ||
                  (session.instructorUserId && session.instructorUserId === authUser.id) ||
                  (session.instructor && authUser.name && session.instructor.toLowerCase().trim() === authUser.name.toLowerCase().trim())
                const canLaunch = canStart && isAuthorized

                return (
                  <div
                    key={session.id}
                    className={cn(
                      'flex flex-col gap-3 rounded-lg border p-4 transition-all hover:shadow-sm sm:flex-row sm:items-center sm:justify-between',
                      canLaunch && 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-800/50 dark:bg-emerald-950/10'
                    )}
                  >
                    {/* Left: Info */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-base">{session.className}</span>
                        <SessionTypeBadge sessionType={session.sessionType} />
                        <Badge className={cn('text-xs', STATUS_BADGE_STYLES[session.status] || '')}>
                          {session.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <IconCalendarEvent className="h-3.5 w-3.5" />
                          {formatSessionDate(session.sessionDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconClock className="h-3.5 w-3.5" />
                          {formatTimeRange(session.startTime, session.endTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconUsers className="h-3.5 w-3.5" />
                          {session.currentBookings}/{session.capacity} booked
                        </span>
                        <span>Instructor: <span className="font-medium text-foreground">{session.instructor}</span></span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>ID: {session.videoConferenceId.slice(0, 8)}...</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleCopyId(session.videoConferenceId)}
                        >
                          <IconCopy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      <span className={cn('text-sm', timeStatus.color)}>{timeStatus.label}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={!canLaunch}
                          onClick={() => handleStartSession(session)}
                          className={cn(
                            canLaunch
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : ''
                          )}
                          title={!isAuthorized ? `Assigned to ${session.instructor}` : undefined}
                        >
                          <IconPlayerPlay className="mr-1 h-4 w-4" />
                          {!isAuthorized ? 'Assigned' : 'Start Session'}
                        </Button>
                        {isAuthorized && (session.status === 'SCHEDULED' || session.status === 'FULL') && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={endSession.isPending}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
                            title="End this class for everyone — for a host who closed their hosting tab without ending it"
                            onClick={() => {
                              if (!window.confirm(`End "${session.className}" for everyone? This can't be undone.`)) return
                              endSession.mutate(session.id)
                            }}
                          >
                            <IconX className="mr-1 h-4 w-4" />
                            End
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
