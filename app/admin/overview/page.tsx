'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  IconBuildingStore,
  IconUsers,
  IconActivity,
  IconBellRinging,
  IconCalendarEvent,
  IconCurrencyRupee,
  IconRefresh,
  IconAlertTriangle,
  IconCircleDot,
  IconArrowRight,
  IconClock,
  IconWifi,
  IconWifiOff,
  IconShieldLock,
  IconCheck,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
  IconX,
  IconLogin,
  IconFilter,
} from '@tabler/icons-react'
import { useAuth } from '@/hooks/use-auth'
import { useBranchBoard } from '@/hooks/use-branch-board'
import { useOperationalAlerts } from '@/hooks/use-operational-alerts'
import { useLocationScope } from '@/components/location-scope-provider'
import type {
  BranchBoardItem,
  BranchBoardStaffItem,
  BranchBoardSessionItem,
} from '@/lib/services/branch-board.service'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

export default function OperationsOverviewPage() {
  const router = useRouter()
  const { role, user } = useAuth()
  const locationScope = useLocationScope()

  // Selected branch filter for the board view (optional for admin)
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all')

  // In-page alerts view state (toggles open/close without deleting or dismissing)
  const [showAlertsSection, setShowAlertsSection] = useState(false)

  // Quick view modals for staff and sessions drilldown
  const [staffModalBranch, setStaffModalBranch] = useState<BranchBoardItem | null>(null)
  const [sessionModalBranch, setSessionModalBranch] = useState<BranchBoardItem | null>(null)

  const isClubAdmin =
    role === 'super_admin' ||
    role === 'clinic_admin' ||
    role === ('admin' as any)
  const isAuthorized =
    isClubAdmin ||
    role === 'staff' ||
    role === ('frontdesk' as any)

  const effectiveBranchFilter =
    selectedBranchFilter === 'all' ? undefined : selectedBranchFilter

  const {
    openAlerts,
    acknowledgeAlert,
    isAcknowledging,
  } = useOperationalAlerts(effectiveBranchFilter)

  const {
    branches,
    asOf,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
    isSocketConnected,
  } = useBranchBoard(selectedBranchFilter)

  // Aggregated totals across all visible branches
  const totals = useMemo(() => {
    return branches.reduce(
      (acc, b) => ({
        liveSessions: acc.liveSessions + b.sessions.liveCount,
        upcomingSessions: acc.upcomingSessions + b.sessions.upcomingCount,
        todayCheckIns: acc.todayCheckIns + b.checkIns.todayCount,
        currentlyInGym: acc.currentlyInGym + b.checkIns.currentlyInGym,
        staffOnDuty: acc.staffOnDuty + b.staffOnDuty.count,
        openAlerts: acc.openAlerts + b.alerts.openCount,
        criticalAlerts: acc.criticalAlerts + b.alerts.criticalCount,
        todayRevenue: acc.todayRevenue + b.revenue.todayTotal,
        invoices: acc.invoices + b.revenue.invoiceCount,
      }),
      {
        liveSessions: 0,
        upcomingSessions: 0,
        todayCheckIns: 0,
        currentlyInGym: 0,
        staffOnDuty: 0,
        openAlerts: 0,
        criticalAlerts: 0,
        todayRevenue: 0,
        invoices: 0,
      }
    )
  }, [branches])

  // Drilldown helper: focuses the branch in the global admin scope and navigates
  const navigateToMetric = (
    branchId: string,
    targetUrl: string
  ) => {
    if (locationScope?.setSelectedLocationId) {
      locationScope.setSelectedLocationId(branchId)
    }
    router.push(targetUrl)
  }

  // FX-43.4: Role gating
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
          <IconShieldLock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">
          The Operations Board is restricted to club owners, branch managers, and front desk supervisors.
        </p>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          Return to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Top Header & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Live Operations Board
            </h1>
            {isSocketConnected ? (
              <Badge
                variant="outline"
                className="gap-1.5 border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-medium"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <IconWifi className="w-3.5 h-3.5" />
                Live Real-Time
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1.5 border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-medium"
              >
                <IconWifiOff className="w-3.5 h-3.5" />
                Polling (15s)
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time operational pulse across all clubs. Track sessions, check-ins, staff, alerts, and revenue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Filter dropdown for Admins */}
          {isClubAdmin && (
            <div className="flex items-center gap-2">
              <IconFilter className="w-4 h-4 text-muted-foreground" />
              <Select
                value={selectedBranchFilter}
                onValueChange={(val) => setSelectedBranchFilter(val)}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {locationScope.locations.map((loc) => (
                    <SelectItem key={loc._id} value={loc._id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {asOf && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Updated: {new Date(asOf).toLocaleTimeString()}
            </span>
          )}

          {/* Notification Toggle Button: Opens/Closes the in-page alerts view */}
          <Button
            size="sm"
            variant={showAlertsSection ? 'default' : 'outline'}
            onClick={() => setShowAlertsSection(!showAlertsSection)}
            className={`gap-1.5 h-9 transition-colors ${
              !showAlertsSection && openAlerts.length > 0
                ? totals.criticalAlerts > 0
                  ? 'border-rose-500 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                : ''
            }`}
            title={showAlertsSection ? 'Close alerts view' : 'View active alerts on board'}
          >
            <div className="relative">
              <IconBellRinging
                className={`w-4 h-4 ${
                  totals.criticalAlerts > 0 ? 'animate-bounce text-rose-600' : ''
                }`}
              />
              {openAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
              )}
            </div>
            <span>Alerts ({openAlerts.length})</span>
            {showAlertsSection ? (
              <IconChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <IconChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 h-9"
          >
            <IconRefresh
              className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Aggregate KPI Ribbon (FX-43.1 / Club Owner View) */}
      {isClubAdmin && selectedBranchFilter === 'all' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Live Sessions</span>
                <IconActivity className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{totals.liveSessions}</span>
                <span className="text-xs text-muted-foreground">
                  ({totals.upcomingSessions} upcoming)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Today's Check-ins</span>
                <IconLogin className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{totals.todayCheckIns}</span>
                <span className="text-xs text-emerald-600 font-medium">
                  {totals.currentlyInGym} in gym
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Staff on Duty</span>
                <IconUsers className="w-4 h-4 text-violet-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{totals.staffOnDuty}</span>
                <span className="text-xs text-muted-foreground">across clubs</span>
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setShowAlertsSection(!showAlertsSection)}
            className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs cursor-pointer hover:border-amber-500/50 hover:bg-muted/40 transition-all"
            title="Click to view/hide alerts on board"
          >
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Open Alerts</span>
                <IconBellRinging
                  className={`w-4 h-4 ${
                    totals.criticalAlerts > 0 ? 'text-red-500 animate-pulse' : 'text-amber-500'
                  }`}
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{totals.openAlerts}</span>
                {totals.criticalAlerts > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                    {totals.criticalAlerts} critical
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs col-span-2 sm:col-span-1">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Today's Revenue</span>
                <IconCurrencyRupee className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  ₹{totals.todayRevenue.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({totals.invoices} paid)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* In-Page Collapsible Alerts Section (Toggleable, does NOT delete or dismiss alerts) */}
      {showAlertsSection && (
        <Card className="border-amber-400/80 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 shadow-md transition-all">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2">
              <IconBellRinging className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm font-semibold">
                Active Operational Alerts ({openAlerts.length})
              </CardTitle>
              {totals.criticalAlerts > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                  {totals.criticalAlerts} Critical
                </Badge>
              )}
              <span className="text-xs text-muted-foreground hidden md:inline">
                &bull; Closing this section hides the list; it does not dismiss or delete any alerts.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAlertsSection(false)}
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                title="Close alerts view without deleting"
              >
                <IconX className="w-3.5 h-3.5" />
                Close Alerts View
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 max-h-[380px] overflow-y-auto">
            {openAlerts.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <IconCheck className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                All clear! No active operational alerts.
              </div>
            ) : (
              openAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`p-3 rounded-lg border transition-all ${
                    alert.severity === 'critical'
                      ? 'border-rose-400 bg-rose-50/90 dark:bg-rose-950/50'
                      : alert.severity === 'warning'
                      ? 'border-amber-300 bg-amber-50/70 dark:bg-amber-950/40'
                      : 'border-border/70 bg-card'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            alert.severity === 'critical'
                              ? 'destructive'
                              : alert.severity === 'warning'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {alert.severity}
                        </Badge>
                        {alert.branchId && (
                          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            <IconBuildingStore className="w-3 h-3" />
                            {typeof alert.branchId === 'object' && alert.branchId !== null
                              ? (alert.branchId as any).name
                              : 'Club'}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {alert.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {alert.message}
                      </p>
                      {((alert.relatedEntity?.metadata as any)?.customerName || alert.relatedEntity?.summary) && (
                        <div className="text-xs bg-background/60 rounded px-2 py-1 mt-1 inline-block border border-border/40">
                          Target: {(alert.relatedEntity?.metadata as any)?.customerName || alert.relatedEntity?.summary}
                          {(alert.relatedEntity?.metadata as any)?.goal ? ` - ${(alert.relatedEntity?.metadata as any).goal}` : ''}
                          {(alert.relatedEntity?.metadata as any)?.customerPhone ? ` (${(alert.relatedEntity?.metadata as any).customerPhone})` : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => acknowledgeAlert(alert._id)}
                        disabled={isAcknowledging}
                      >
                        <IconCheck className="w-3 h-3 text-emerald-600" />
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error View */}
      {error && (
        <Card className="border-red-200 bg-red-50/50 p-6 text-center">
          <IconAlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-red-900">Failed to load operations board</h2>
          <p className="text-sm text-red-700 mt-1">
            {(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown network error'}
          </p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            Try Again
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && branches.length === 0 && (
        <Card className="p-12 text-center space-y-3">
          <IconBuildingStore className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-medium">No branch operational data found</h2>
          <p className="text-sm text-muted-foreground">
            Make sure branches are configured and active in Settings &gt; Locations.
          </p>
        </Card>
      )}

      {/* Branch Cards Grid (FX-43.1, FX-43.2, FX-43.3) */}
      {!isLoading && !error && branches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {branches.map((item) => {
            const { branch, sessions, checkIns, staffOnDuty, alerts, revenue } = item
            const hasCriticalAlerts = alerts.criticalCount > 0

            return (
              <Card
                key={branch.id}
                className={`flex flex-col justify-between transition-all border-border/80 hover:shadow-md ${
                  hasCriticalAlerts
                    ? 'border-red-300 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10'
                    : 'bg-card'
                }`}
              >
                {/* Branch Header */}
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold">
                          {branch.name}
                        </CardTitle>
                        <Badge variant="secondary" className="text-[11px] font-mono">
                          {branch.code.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        {branch.timezone} {branch.phone ? `• ${branch.phone}` : ''}
                      </CardDescription>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                      onClick={() => {
                        if (locationScope?.setSelectedLocationId) {
                          locationScope.setSelectedLocationId(branch.id)
                        }
                      }}
                      title="Set as active branch scope"
                    >
                      Focus
                      <IconChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4 flex-1">
                  {/* 5 Core Metric Blocks */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Metric 1: Sessions (Live & Upcoming) */}
                    <div
                      onClick={() => setSessionModalBranch(item)}
                      className="group cursor-pointer rounded-lg border border-border/70 p-3 bg-muted/30 hover:bg-muted/70 hover:border-emerald-500/50 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span className="font-medium">Sessions</span>
                        <IconActivity className="w-3.5 h-3.5 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold">
                          {sessions.liveCount}
                        </span>
                        {sessions.liveCount > 0 ? (
                          <Badge
                            variant="destructive"
                            className="text-[9px] px-1 py-0 h-4 uppercase tracking-wider"
                          >
                            Live
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">live</span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {sessions.upcomingCount} upcoming today
                      </div>
                    </div>

                    {/* Metric 2: Today's Check-ins & Gym Occupancy */}
                    <div
                      onClick={() =>
                        navigateToMetric(
                          branch.id,
                          `/admin/attendance?branchId=${branch.id}`
                        )
                      }
                      className="group cursor-pointer rounded-lg border border-border/70 p-3 bg-muted/30 hover:bg-muted/70 hover:border-blue-500/50 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span className="font-medium">Check-ins</span>
                        <IconLogin className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold">
                          {checkIns.todayCount}
                        </span>
                        <span className="text-[11px] text-muted-foreground">today</span>
                      </div>
                      <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {checkIns.currentlyInGym} in gym right now
                      </div>
                    </div>

                    {/* Metric 3: Staff on Duty */}
                    <div
                      onClick={() => setStaffModalBranch(item)}
                      className="group cursor-pointer rounded-lg border border-border/70 p-3 bg-muted/30 hover:bg-muted/70 hover:border-violet-500/50 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span className="font-medium">Staff on Duty</span>
                        <IconUsers className="w-3.5 h-3.5 group-hover:text-violet-500 transition-colors" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold">
                          {staffOnDuty.count}
                        </span>
                        <span className="text-[11px] text-muted-foreground">staff</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        View active team &rarr;
                      </div>
                    </div>

                    {/* Metric 4: Open Alerts */}
                    <div
                      onClick={() => setShowAlertsSection(true)}
                      className={`group cursor-pointer rounded-lg border p-3 transition-colors space-y-1 ${
                        alerts.criticalCount > 0
                          ? 'border-red-400 bg-red-100/50 dark:bg-red-950/40 hover:bg-red-100/80'
                          : 'border-border/70 bg-muted/30 hover:bg-muted/70 hover:border-amber-500/50'
                      }`}
                      title="Click to view alerts on board"
                    >
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span className="font-medium">Open Alerts</span>
                        <IconBellRinging
                          className={`w-3.5 h-3.5 ${
                            alerts.criticalCount > 0
                              ? 'text-red-600 animate-pulse'
                              : 'group-hover:text-amber-500'
                          }`}
                        />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`text-xl font-bold ${
                            alerts.criticalCount > 0 ? 'text-red-600' : ''
                          }`}
                        >
                          {alerts.openCount}
                        </span>
                        {alerts.criticalCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] px-1 py-0 h-4"
                          >
                            {alerts.criticalCount} crit
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {alerts.warningCount} warnings &bull; View &rarr;
                      </div>
                    </div>
                  </div>

                  {/* Metric 5: Today's Revenue Ribbon */}
                  <div
                    onClick={() =>
                      navigateToMetric(
                        branch.id,
                        `/admin/invoices?branchId=${branch.id}`
                      )
                    }
                    className="group cursor-pointer rounded-lg border border-border/70 p-3 bg-muted/20 hover:bg-muted/60 hover:border-emerald-500/50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <IconCurrencyRupee className="w-3.5 h-3.5 text-emerald-600" />
                        Today's Revenue
                      </div>
                      <div className="text-lg font-bold mt-0.5">
                        ₹{revenue.todayTotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs font-normal">
                        {revenue.invoiceCount} invoices
                      </Badge>
                      <div className="text-[10px] text-muted-foreground mt-1 group-hover:text-foreground">
                        Open ledger &rarr;
                      </div>
                    </div>
                  </div>

                  {/* Quick recent alert preview if any */}
                  {alerts.recentAlerts.length > 0 && (
                    <div className="pt-2 border-t border-border/40">
                      <div className="text-[11px] font-medium text-muted-foreground mb-1.5">
                        Latest Alert:
                      </div>
                      <div
                        onClick={() => setShowAlertsSection(true)}
                        className="cursor-pointer text-xs p-2 rounded bg-background border border-border/60 hover:border-primary/50 transition-colors flex items-start gap-2"
                        title="Click to view alerts on board"
                      >
                        <span
                          className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                            alerts.recentAlerts[0].severity === 'critical'
                              ? 'bg-red-500'
                              : alerts.recentAlerts[0].severity === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {alerts.recentAlerts[0].title}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {alerts.recentAlerts[0].message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Staff On Duty Modal Drilldown (FX-43.3) */}
      <Dialog
        open={Boolean(staffModalBranch)}
        onOpenChange={(open) => !open && setStaffModalBranch(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUsers className="w-5 h-5 text-violet-500" />
              Staff on Duty &mdash; {staffModalBranch?.branch.name}
            </DialogTitle>
            <DialogDescription>
              {staffModalBranch?.staffOnDuty.count} staff members active or signed in at this branch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto py-2">
            {staffModalBranch?.staffOnDuty.members &&
            staffModalBranch.staffOnDuty.members.length > 0 ? (
              staffModalBranch.staffOnDuty.members.map((staff: BranchBoardStaffItem) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-muted/20"
                >
                  <div>
                    <p className="text-sm font-medium">{staff.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {staff.role}
                    </p>
                  </div>
                  <Badge
                    variant={staff.isOnline ? 'default' : 'secondary'}
                    className={`text-xs gap-1 ${
                      staff.isOnline
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : ''
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        staff.isOnline ? 'bg-white' : 'bg-muted-foreground'
                      }`}
                    />
                    {staff.isOnline ? 'Online' : 'Assigned'}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No active staff logged in at this location right now.
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (staffModalBranch) {
                  navigateToMetric(
                    staffModalBranch.branch.id,
                    `/admin/users?branchId=${staffModalBranch.branch.id}`
                  )
                  setStaffModalBranch(null)
                }
              }}
            >
              Open Staff Directory &rarr;
            </Button>
            <Button
              size="sm"
              onClick={() => setStaffModalBranch(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sessions Quick List Drilldown (FX-43.3) */}
      <Dialog
        open={Boolean(sessionModalBranch)}
        onOpenChange={(open) => !open && setSessionModalBranch(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconActivity className="w-5 h-5 text-emerald-500" />
              Sessions &mdash; {sessionModalBranch?.branch.name}
            </DialogTitle>
            <DialogDescription>
              {sessionModalBranch?.sessions.totalToday} total sessions scheduled for today ({sessionModalBranch?.sessions.liveCount} live, {sessionModalBranch?.sessions.upcomingCount} upcoming).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto py-2">
            {sessionModalBranch?.sessions.items &&
            sessionModalBranch.sessions.items.length > 0 ? (
              sessionModalBranch.sessions.items.map((session: BranchBoardSessionItem) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg border ${
                    session.isLive
                      ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                      : 'border-border/70 bg-muted/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {session.className}
                        </span>
                        {session.isLive && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 uppercase">
                            Live Now
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Instructor: {session.instructorName}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {session.startTime} - {session.endTime}
                    </Badge>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-1.5">
                    <span>
                      Bookings: {session.bookingCount} / {session.capacity}
                    </span>
                    <span className="capitalize">
                      Status: {session.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No active or upcoming sessions for today.
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (sessionModalBranch) {
                  navigateToMetric(
                    sessionModalBranch.branch.id,
                    `/admin/therapies?branchId=${sessionModalBranch.branch.id}`
                  )
                  setSessionModalBranch(null)
                }
              }}
            >
              Open Class Schedule &rarr;
            </Button>
            <Button
              size="sm"
              onClick={() => setSessionModalBranch(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
