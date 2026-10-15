'use client'

import React, { useState, useMemo } from 'react'
import {
  IconFileSpreadsheet,
  IconRefresh,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconUsers,
  IconShieldCheck,
  IconBuildingStore,
  IconCalendar,
  IconFilter,
  IconArrowRight,
  IconFlame,
  IconChecklist,
  IconUserCheck,
  IconLock,
  IconChevronRight,
  IconActivity,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAlertReport } from '@/hooks/use-alert-report'
import { useLocations } from '@/hooks/use-locations'
import { useOptionalLocationScope } from '@/components/location-scope-provider'
import { useAuth } from '@/hooks/use-auth'
import { AlertBreachItem } from '@/lib/services/alert-report.service'

function formatSeconds(seconds?: number): string {
  if (seconds === undefined || seconds === null || seconds < 0) return '—'
  if (seconds === 0) return '0s'
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const mins = Math.floor(s / 60)
  const remSec = s % 60
  if (mins < 60) {
    return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`
  }
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return `${hours}h ${remMins}m`
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  } catch {
    return iso
  }
}

type DateRangePreset = 'today' | '7days' | '30days' | 'all' | 'custom'

export function AlertSlaReportsView() {
  const { role } = useAuth()
  const isAdmin = role === 'super_admin' || role === 'clinic_admin'

  const locationScope = useOptionalLocationScope()
  const currentBranchId = locationScope?.selectedLocationId ?? null
  const currentBranchName = locationScope?.selectedLocation?.name ?? 'All Clubs'

  const { data: locations = [] } = useLocations(false)

  // Filter states
  const [selectedBranch, setSelectedBranch] = useState<string>(
    isAdmin ? 'all' : (currentBranchId || 'all')
  )
  const [preset, setPreset] = useState<DateRangePreset>('7days')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  // Drilldown dialog for escalation history
  const [selectedBreach, setSelectedBreach] = useState<AlertBreachItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Calculate actual ISO date strings based on preset
  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    if (preset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      return { startDate: start.toISOString(), endDate: now.toISOString() }
    }
    if (preset === '7days') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { startDate: start.toISOString(), endDate: now.toISOString() }
    }
    if (preset === '30days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { startDate: start.toISOString(), endDate: now.toISOString() }
    }
    if (preset === 'custom') {
      return {
        startDate: customStartDate ? new Date(customStartDate).toISOString() : undefined,
        endDate: customEndDate ? new Date(`${customEndDate}T23:59:59.999Z`).toISOString() : undefined,
      }
    }
    return { startDate: undefined, endDate: undefined }
  }, [preset, customStartDate, customEndDate])

  const reportBranchId = isAdmin
    ? (selectedBranch === 'all' ? undefined : selectedBranch)
    : (currentBranchId || undefined)

  const {
    report,
    isLoading,
    isRefetching,
    refetch,
    isExporting,
    exportCsv,
  } = useAlertReport({
    startDate,
    endDate,
    branchId: reportBranchId,
  })

  const summary = report?.summary ?? {
    totalFired: 0,
    totalAcknowledged: 0,
    totalBreached: 0,
    overallComplianceRate: 100,
    avgResponseSeconds: 0,
    slowestResponseSeconds: 0,
  }

  const handleOpenBreachDetails = (breach: AlertBreachItem) => {
    setSelectedBreach(breach)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Top Controls: Date range & Branch filters + Export */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Presets & Branch */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Branch Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <IconBuildingStore className="h-3.5 w-3.5" />
                  Branch:
                </span>
                {isAdmin ? (
                  <Select
                    value={selectedBranch}
                    onValueChange={(val) => setSelectedBranch(val)}
                  >
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue placeholder="All Clubs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clubs (Consolidated)</SelectItem>
                      {locations.map((loc) => {
                        const locId = loc._id || loc.id || ''
                        return (
                          <SelectItem key={locId} value={locId}>
                            {loc.name}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="gap-1 text-xs py-1">
                    <IconLock className="h-3 w-3 text-muted-foreground" />
                    <span>{currentBranchName}</span>
                  </Badge>
                )}
              </div>

              {/* Date Presets */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
                <Button
                  variant={preset === 'today' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setPreset('today')}
                >
                  Today
                </Button>
                <Button
                  variant={preset === '7days' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setPreset('7days')}
                >
                  Last 7 Days
                </Button>
                <Button
                  variant={preset === '30days' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setPreset('30days')}
                >
                  Last 30 Days
                </Button>
                <Button
                  variant={preset === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setPreset('all')}
                >
                  All Time
                </Button>
                <Button
                  variant={preset === 'custom' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setPreset('custom')}
                >
                  Custom
                </Button>
              </div>

              {/* Custom Date Inputs */}
              {preset === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    className="h-8 w-36 text-xs"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    placeholder="From"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="date"
                    className="h-8 w-36 text-xs"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    placeholder="To"
                  />
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => refetch()}
                disabled={isLoading || isRefetching}
              >
                <IconRefresh className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>

              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={exportCsv}
                disabled={isExporting || isLoading}
              >
                <IconFileSpreadsheet className="h-4 w-4" />
                <span>{isExporting ? 'Exporting...' : 'Export Spreadsheet (CSV)'}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FX-44 Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Fired */}
        <Card className="border-border">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <IconAlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Alerts Fired
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{summary.totalFired}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            Total incidents triggered
          </CardContent>
        </Card>

        {/* Acknowledged */}
        <Card className="border-border">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <IconCheck className="h-3.5 w-3.5 text-emerald-500" />
              Acknowledged
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {summary.totalAcknowledged}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            Handled by staff
          </CardContent>
        </Card>

        {/* Breached */}
        <Card className={`border-border ${summary.totalBreached > 0 ? 'bg-rose-500/[0.04] border-rose-500/30' : ''}`}>
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <IconFlame className="h-3.5 w-3.5 text-rose-500" />
              SLA Breached
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600">
              {summary.totalBreached}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            Missed SLA target
          </CardContent>
        </Card>

        {/* Compliance Rate */}
        <Card className="border-border">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <IconShieldCheck className="h-3.5 w-3.5 text-blue-500" />
              SLA Compliance
            </CardDescription>
            <CardTitle
              className={`text-2xl font-bold ${
                summary.overallComplianceRate >= 90
                  ? 'text-emerald-600'
                  : summary.overallComplianceRate >= 75
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              {summary.overallComplianceRate}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            Within SLA window
          </CardContent>
        </Card>

        {/* Avg Response Time */}
        <Card className="border-border">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <IconClock className="h-3.5 w-3.5 text-indigo-500" />
              Avg Acknowledge
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {formatSeconds(summary.avgResponseSeconds)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            Average response time
          </CardContent>
        </Card>

        {/* Slowest Response Time */}
        <Card className="border-border">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <IconActivity className="h-3.5 w-3.5 text-purple-500" />
              Slowest Time
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {formatSeconds(summary.slowestResponseSeconds)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            Maximum response delay
          </CardContent>
        </Card>
      </div>

      {/* FX-44.1: Alerts by Alert Type */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <IconChecklist className="h-4 w-4 text-emerald-600" />
                Alert Type Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Alerts fired, acknowledged and breached by operational trigger type
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {report?.byType?.length || 0} Alert Types
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold">Alert Type & Name</TableHead>
                  <TableHead className="text-xs font-bold text-right">Fired</TableHead>
                  <TableHead className="text-xs font-bold text-right">Acknowledged</TableHead>
                  <TableHead className="text-xs font-bold text-right">Breached</TableHead>
                  <TableHead className="text-xs font-bold text-right">Compliance Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                      Loading alert metrics...
                    </TableCell>
                  </TableRow>
                ) : !report?.byType || report.byType.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                      No alerts recorded for the selected range and branch.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.byType.map((item) => (
                    <TableRow key={item.type} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{item.title}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{item.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">{item.firedCount}</TableCell>
                      <TableCell className="text-right text-xs text-emerald-600 font-semibold">
                        {item.acknowledgedCount}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {item.breachedCount > 0 ? (
                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                            {item.breachedCount} breached
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full ${
                                item.complianceRate >= 90
                                  ? 'bg-emerald-500'
                                  : item.complianceRate >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(item.complianceRate, 100)}%` }}
                            />
                          </div>
                          <span
                            className={
                              item.complianceRate >= 90
                                ? 'text-emerald-600'
                                : item.complianceRate >= 75
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            }
                          >
                            {item.complianceRate}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* FX-44.2: Staff & Role Performance Leaderboards */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <IconUsers className="h-4 w-4 text-indigo-600" />
                Response Time & Accountability Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">
                Average and slowest time to acknowledge, grouped per person and per role
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Tabs defaultValue="staff" className="space-y-4">
            <TabsList className="bg-muted/60 p-1 rounded-lg">
              <TabsTrigger value="staff" className="text-xs gap-1.5">
                <IconUserCheck className="h-3.5 w-3.5" />
                <span>Per Staff Member ({report?.byPerson?.length || 0})</span>
              </TabsTrigger>
              <TabsTrigger value="roles" className="text-xs gap-1.5">
                <IconUsers className="h-3.5 w-3.5" />
                <span>Per Department / Role ({report?.byRole?.length || 0})</span>
              </TabsTrigger>
            </TabsList>

            {/* Per Staff Member Table */}
            <TabsContent value="staff" className="m-0">
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-bold">Staff Member</TableHead>
                      <TableHead className="text-xs font-bold">Role</TableHead>
                      <TableHead className="text-xs font-bold text-right">Handled Alerts</TableHead>
                      <TableHead className="text-xs font-bold text-right">Avg Response Time</TableHead>
                      <TableHead className="text-xs font-bold text-right">Slowest Response Time</TableHead>
                      <TableHead className="text-xs font-bold text-right">SLA Breaches</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                          Loading staff performance...
                        </TableCell>
                      </TableRow>
                    ) : !report?.byPerson || report.byPerson.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                          No acknowledged alerts found for this filter range.
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.byPerson.map((person, idx) => (
                        <TableRow key={person.userId || `${person.name}-${idx}`} className="hover:bg-muted/20">
                          <TableCell className="text-xs font-semibold text-foreground">
                            {person.name}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="font-mono text-[10px] uppercase">
                              {person.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {person.handledCount}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-emerald-600">
                            {formatSeconds(person.avgResponseSeconds)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-amber-600">
                            {formatSeconds(person.slowestResponseSeconds)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {person.breachCount > 0 ? (
                              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                {person.breachCount}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Per Role Table */}
            <TabsContent value="roles" className="m-0">
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-bold">Role / Department</TableHead>
                      <TableHead className="text-xs font-bold text-right">Handled Alerts</TableHead>
                      <TableHead className="text-xs font-bold text-right">Avg Response Time</TableHead>
                      <TableHead className="text-xs font-bold text-right">Slowest Response Time</TableHead>
                      <TableHead className="text-xs font-bold text-right">SLA Breaches</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                          Loading role metrics...
                        </TableCell>
                      </TableRow>
                    ) : !report?.byRole || report.byRole.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                          No acknowledged alerts found for this filter range.
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.byRole.map((roleItem) => (
                        <TableRow key={roleItem.role} className="hover:bg-muted/20">
                          <TableCell className="text-xs font-semibold text-foreground">
                            <Badge variant="secondary" className="font-mono text-xs uppercase">
                              {roleItem.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {roleItem.handledCount}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-emerald-600">
                            {formatSeconds(roleItem.avgResponseSeconds)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-amber-600">
                            {formatSeconds(roleItem.slowestResponseSeconds)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {roleItem.breachCount > 0 ? (
                              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                {roleItem.breachCount}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* FX-44.3: Breached Alerts & Escalation History */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <IconFlame className="h-4 w-4 text-rose-600" />
                Breached Alerts & Full Escalation Log
              </CardTitle>
              <CardDescription className="text-xs">
                Every alert that exceeded its response SLA, with its multi-step escalation ladder
              </CardDescription>
            </div>
            <Badge variant={summary.totalBreached > 0 ? 'destructive' : 'outline'} className="text-xs">
              {report?.breaches?.length || 0} Breaches
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold">Severity</TableHead>
                  <TableHead className="text-xs font-bold">Alert Title & Type</TableHead>
                  <TableHead className="text-xs font-bold">Branch</TableHead>
                  <TableHead className="text-xs font-bold">Fired At</TableHead>
                  <TableHead className="text-xs font-bold">SLA Target</TableHead>
                  <TableHead className="text-xs font-bold">Response Time</TableHead>
                  <TableHead className="text-xs font-bold">Status / Handled By</TableHead>
                  <TableHead className="text-xs font-bold text-right">Escalation Trail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                      Loading breached alerts...
                    </TableCell>
                  </TableRow>
                ) : !report?.breaches || report.breaches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <IconCheck className="h-6 w-6 text-emerald-600" />
                        <span className="font-semibold text-foreground">Zero SLA Breaches</span>
                        <span>All alerts were acknowledged within SLA limits for this period.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  report.breaches.map((breach) => (
                    <TableRow key={breach.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs">
                        <Badge
                          variant={
                            breach.severity === 'critical'
                              ? 'destructive'
                              : breach.severity === 'warning'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-[10px] uppercase font-mono"
                        >
                          {breach.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{breach.title}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{breach.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {breach.branch?.name || breach.branch?.code || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(breach.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        <Badge variant="outline" className="text-[10px]">
                          {breach.slaMinutes}m window
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-rose-600">
                        {breach.responseSeconds ? formatSeconds(breach.responseSeconds) : 'Unacknowledged'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {breach.acknowledgedBy ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{breach.acknowledgedBy.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">
                              {breach.acknowledgedBy.role}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            Still Open
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                          onClick={() => handleOpenBreachDetails(breach)}
                        >
                          <span>View Ladder</span>
                          <IconChevronRight className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Escalation Ladder & Audit Trail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge
                variant={selectedBreach?.severity === 'critical' ? 'destructive' : 'secondary'}
                className="uppercase text-[10px]"
              >
                {selectedBreach?.severity}
              </Badge>
              <DialogTitle className="text-base font-bold text-foreground">
                Escalation Ladder & Audit History
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              Incident {selectedBreach?.id} • {selectedBreach?.title} ({selectedBreach?.branch?.name})
            </DialogDescription>
          </DialogHeader>

          {selectedBreach && (
            <div className="space-y-4 py-2">
              {/* Breach Meta Header */}
              <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs border border-border">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Fired At</span>
                    <span className="font-semibold">{formatDate(selectedBreach.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">SLA Breached At</span>
                    <span className="font-semibold text-rose-600">{formatDate(selectedBreach.slaBreachedAt)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">SLA Window</span>
                    <span className="font-semibold">{selectedBreach.slaMinutes} minutes</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Total Response Time</span>
                    <span className="font-semibold text-rose-600">
                      {selectedBreach.responseSeconds ? formatSeconds(selectedBreach.responseSeconds) : 'Still Open'}
                    </span>
                  </div>
                </div>

                {selectedBreach.acknowledgedBy && (
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Acknowledged By</span>
                      <span className="font-semibold">
                        {selectedBreach.acknowledgedBy.name} ({selectedBreach.acknowledgedBy.role})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px] uppercase">Acknowledged At</span>
                      <span className="font-semibold">{formatDate(selectedBreach.acknowledgedAt)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step-by-Step Escalation Milestones */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <IconArrowRight className="h-3.5 w-3.5 text-foreground" />
                  Escalation Ladder Steps
                </h4>

                <div className="space-y-2">
                  {selectedBreach.escalationLadder && selectedBreach.escalationLadder.length > 0 ? (
                    selectedBreach.escalationLadder.map((step, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                          step.escalated
                            ? 'border-rose-500/40 bg-rose-500/[0.04]'
                            : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                              step.escalated
                                ? 'bg-rose-500 text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground uppercase">
                              Role: {step.role}
                            </span>
                            <span className="text-[11px] text-muted-foreground block">
                              Triggered after {step.afterMinutes}m (due {formatDate(step.scheduledAt)})
                            </span>
                          </div>
                        </div>

                        <div>
                          {step.escalated ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Escalated Unanswered
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Pending / Not Reached
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground p-2 text-center bg-muted/20 rounded">
                      No custom ladder steps recorded for this alert.
                    </div>
                  )}
                </div>
              </div>

              {/* Full Audit Log Trail */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <IconChecklist className="h-3.5 w-3.5 text-foreground" />
                  Chronological Audit Trail
                </h4>

                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedBreach.fullEscalationTrail && selectedBreach.fullEscalationTrail.length > 0 ? (
                    selectedBreach.fullEscalationTrail.map((log, index) => (
                      <div
                        key={index}
                        className="text-[11px] font-mono text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-foreground/70">•</span>
                        <span>{log}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">No audit entries found.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
