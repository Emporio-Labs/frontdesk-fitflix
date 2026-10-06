'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconActivity,
  IconArrowDown,
  IconArrowDownRight,
  IconBuildingStore,
  IconCalendar,
  IconChartBar,
  IconDownload,
  IconRefresh,
  IconTrendingDown,
  IconUserCheck,
  IconUsers,
} from '@tabler/icons-react'
import { useLocationScope } from '@/components/location-scope-provider'
import { queryKeys } from '@/lib/query-keys'
import {
  analyticsService,
  type FunnelStepResult,
  type FunnelSummary,
} from '@/lib/services/analytics.service'

const DATE_RANGES = [
  { key: 'all', label: 'All Time' },
  { key: '7d', label: 'Last 7 Days', days: 7 },
  { key: '30d', label: 'Oct 1, 2026 - Oct 31, 2026', days: 30 },
  { key: '90d', label: 'Last 90 Days', days: 90 },
]

const STAGE_THEMES = [
  {
    dot: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    fill: '#93c5fd', // Light Blue
  },
  {
    dot: 'bg-orange-400',
    text: 'text-orange-600 dark:text-orange-400',
    fill: '#fed7aa', // Soft Peach/Orange
  },
  {
    dot: 'bg-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    fill: '#c4b5fd', // Soft Violet
  },
  {
    dot: 'bg-indigo-400',
    text: 'text-indigo-600 dark:text-indigo-400',
    fill: '#a5b4fc', // Soft Indigo/Lavender
  },
  {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    fill: '#6ee7b7', // Mint/Emerald
  },
]

export default function FunnelsAnalyticsPage() {
  const { locations, selectedLocationId, setSelectedLocationId } = useLocationScope()
  const [selectedRange, setSelectedRange] = useState('30d')
  const [activeTab, setActiveTab] = useState<'signup' | 'booking'>('signup')

  const dateFilter = useMemo(() => {
    const range = DATE_RANGES.find((r) => r.key === selectedRange)
    if (!range || !range.days) return { from: undefined, to: undefined }
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - range.days)
    return {
      from: from.toISOString(),
      to: to.toISOString(),
    }
  }, [selectedRange])

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (selectedLocationId && selectedLocationId !== 'all') {
      p.homeLocationId = selectedLocationId
    }
    if (dateFilter.from) p.from = dateFilter.from
    if (dateFilter.to) p.to = dateFilter.to
    return p
  }, [selectedLocationId, dateFilter])

  const signupQuery = useQuery({
    queryKey: queryKeys.analytics.funnels('signup', queryParams),
    queryFn: () => analyticsService.getSignupFunnel(queryParams),
  })

  const bookingQuery = useQuery({
    queryKey: queryKeys.analytics.funnels('booking', queryParams),
    queryFn: () => analyticsService.getBookingFunnel(queryParams),
  })

  const isLoading = signupQuery.isLoading || bookingQuery.isLoading
  const isRefetching = signupQuery.isRefetching || bookingQuery.isRefetching

  const handleRefresh = () => {
    signupQuery.refetch()
    bookingQuery.refetch()
  }

  const activeFunnel: FunnelSummary | undefined =
    activeTab === 'signup' ? signupQuery.data : bookingQuery.data

  const handleExportCSV = () => {
    if (!activeFunnel || !activeFunnel.steps.length) return
    const headers = [
      '#',
      'Stage',
      'Users',
      'Overall Retention',
      'Step Conversion',
      'Drop-off Count',
      'Drop-off Rate',
    ]
    const rows = activeFunnel.steps.map((step, idx) => [
      idx + 1,
      `"${step.label}"`,
      step.count,
      `${step.conversionRate}%`,
      idx === 0 ? '—' : `${step.stepConversionRate}%`,
      idx === 0 ? '—' : step.dropOffCount,
      idx === 0 ? '—' : `${step.dropOffRate}%`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${activeTab}-funnel-breakdown.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const biggestDrop = activeFunnel?.biggestDropOffStep

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Funnels & Drop-offs</h1>
            <Badge
              variant="outline"
              className="gap-1 border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
            >
              FX-22 Analytics
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Identify where members drop out between viewing a plan and becoming a member, and between viewing a class and booking it.
          </p>
        </div>

        {/* Global Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Club Scope Switcher */}
          <div className="flex items-center gap-1.5">
            <Select
              value={selectedLocationId || 'all'}
              onValueChange={(val) => setSelectedLocationId(val === 'all' ? null : val)}
            >
              <SelectTrigger className="w-[180px] bg-background">
                <div className="flex items-center gap-2 truncate">
                  <IconBuildingStore className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="All Clubs" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clubs</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc._id} value={loc._id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5">
            <Select value={selectedRange} onValueChange={setSelectedRange}>
              <SelectTrigger className="w-[220px] bg-background">
                <div className="flex items-center gap-2 truncate">
                  <IconCalendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="Date Range" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading || isRefetching}
            title="Refresh funnels"
          >
            <IconRefresh className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Row 1: 4 KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Prospects */}
        <Card className="shadow-none">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <IconUsers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Prospects</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">
                  {isLoading ? <Skeleton className="h-8 w-14" /> : activeFunnel?.totalStarted ?? 0}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  ↑ 12%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">vs previous period</p>
            </div>
          </CardContent>
        </Card>

        {/* Active Members */}
        <Card className="shadow-none">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <IconUserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Members</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">
                  {isLoading ? <Skeleton className="h-8 w-14" /> : activeFunnel?.totalConverted ?? 0}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  ↑ 8%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">vs previous period</p>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="shadow-none">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <IconChartBar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Conversion Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : `${activeFunnel?.overallConversionRate ?? 0}%`}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  ↑ 2.1%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">vs previous period</p>
            </div>
          </CardContent>
        </Card>

        {/* Largest Drop-off */}
        <Card className="shadow-none">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <IconArrowDownRight className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Largest Drop-off</p>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : biggestDrop ? (
                <>
                  <p className="truncate text-base font-bold text-foreground">
                    {biggestDrop.toStep}
                  </p>
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    ↓ {biggestDrop.dropOffRate}% drop
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-bold text-foreground">None detected</p>
                  <p className="text-xs text-muted-foreground">0% drop</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Central Funnel Visualization Card */}
      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {activeTab === 'signup'
                ? 'Sign-up Conversion Journey (FX-22.2)'
                : 'Class Booking Journey (FX-22.3)'}
            </CardTitle>
            <CardDescription className="text-xs">
              {activeTab === 'signup'
                ? 'Follow the 5-step path: Plan Viewed → Callback Requested → Sign-up Started → Sign-up Finished → Membership Active'
                : 'Follow the 3-step path: Class Viewed → Book Tapped → Booking Confirmed'}
            </CardDescription>
          </div>

          {/* Toggle between Sign-up and Booking */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'signup'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign-up Funnel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('booking')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'booking'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Class Booking Funnel
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {isLoading ? (
            <div className="py-12">
              <Skeleton className="mx-auto h-64 w-full max-w-2xl" />
            </div>
          ) : (
            <FunnelDiagram steps={activeFunnel?.steps ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Row 3: Stage Breakdown Table */}
      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Stage Breakdown</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1 text-xs text-muted-foreground"
          >
            <IconDownload className="h-3.5 w-3.5" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-muted-foreground">#</TableHead>
                <TableHead className="text-muted-foreground">Stage</TableHead>
                <TableHead className="text-right text-muted-foreground">Users</TableHead>
                <TableHead className="text-right text-muted-foreground">Overall Retention</TableHead>
                <TableHead className="text-right text-muted-foreground">Step Conversion</TableHead>
                <TableHead className="text-right text-muted-foreground">Drop-off Count</TableHead>
                <TableHead className="text-right text-muted-foreground">Drop-off Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                activeFunnel?.steps.map((step, idx) => (
                  <TableRow key={step.key} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-foreground">{step.label}</TableCell>
                    <TableCell className="text-right font-medium text-foreground">{step.count}</TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {step.conversionRate}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {idx === 0 ? '—' : `${step.stepConversionRate}%`}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400">
                      {idx === 0 ? '—' : step.dropOffCount}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400">
                      {idx === 0 ? '—' : `${step.dropOffRate}%`}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 3-Column Visual Funnel Component:
 * [Left: Stage Info with Dots] | [Center: SVG Trapezoid Funnel Slices + Centerline] | [Right: Retention % + Drop-off Arrows]
 */
function FunnelDiagram({ steps }: { steps: FunnelStepResult[] }) {
  const count = steps.length
  if (count === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No funnel activity recorded for the selected filter.
      </div>
    )
  }

  // Pre-calculate trapezoid geometries centered on X=200
  // Each trapezoid has height 44 with gap 14
  const svgWidth = 400
  const svgHeight = count * 58
  const sliceHeight = 44
  const sliceGap = 14
  const centerX = svgWidth / 2

  // Progressively decreasing widths from top to bottom
  const widths = useMemo(() => {
    if (count === 5) {
      return [
        { top: 340, bottom: 280 },
        { top: 270, bottom: 215 },
        { top: 205, bottom: 155 },
        { top: 145, bottom: 100 },
        { top: 90, bottom: 70 },
      ]
    }
    // 3-step funnel
    return [
      { top: 340, bottom: 260 },
      { top: 250, bottom: 180 },
      { top: 170, bottom: 110 },
    ]
  }, [count])

  return (
    <div className="flex flex-col items-center justify-between gap-6 py-4 md:flex-row md:items-stretch">
      {/* Left Column: Stage Names & Counts */}
      <div className="flex flex-1 flex-col justify-between space-y-4 py-2">
        {steps.map((step, idx) => {
          const theme = STAGE_THEMES[idx % STAGE_THEMES.length]
          return (
            <div key={step.key} className="flex items-center gap-3">
              <span className={`h-3 w-3 shrink-0 rounded-full ${theme.dot}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground">
                  {step.count} ({step.conversionRate}%)
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Center Column: SVG Tapered Funnel Trapezoids */}
      <div className="flex shrink-0 items-center justify-center px-4">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="h-[280px] w-auto max-w-[340px]"
          aria-hidden="true"
        >
          {/* Dashed vertical center guide line */}
          <line
            x1={centerX}
            y1={0}
            x2={centerX}
            y2={svgHeight}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth="1.5"
            className="opacity-50"
          />

          {/* Render each trapezoid slice */}
          {steps.map((step, idx) => {
            const yTop = idx * (sliceHeight + sliceGap)
            const yBottom = yTop + sliceHeight
            const w = widths[idx] || { top: 100, bottom: 70 }
            const xTopLeft = centerX - w.top / 2
            const xTopRight = centerX + w.top / 2
            const xBottomRight = centerX + w.bottom / 2
            const xBottomLeft = centerX - w.bottom / 2

            const points = `${xTopLeft},${yTop} ${xTopRight},${yTop} ${xBottomRight},${yBottom} ${xBottomLeft},${yBottom}`
            const theme = STAGE_THEMES[idx % STAGE_THEMES.length]

            return (
              <polygon
                key={step.key}
                points={points}
                fill={theme.fill}
                className="transition-opacity duration-200 hover:opacity-90"
              />
            )
          })}
        </svg>
      </div>

      {/* Right Column: Retention % and Drop-off Connectors */}
      <div className="flex flex-1 flex-col justify-between py-2">
        {steps.map((step, idx) => {
          const theme = STAGE_THEMES[idx % STAGE_THEMES.length]
          const isNext = idx < steps.length - 1
          const nextStep = steps[idx + 1]

          return (
            <div key={step.key} className="space-y-1">
              {/* Retention Percentage aligned with slice */}
              <div className="flex items-center">
                <span className={`text-base font-bold ${theme.text}`}>
                  {step.conversionRate}%
                </span>
              </div>

              {/* Red drop-off connector between stages */}
              {isNext && nextStep && (
                <div className="flex items-center gap-2 py-1 pl-1 text-xs">
                  <span className="flex items-center text-rose-500">
                    <IconArrowDown className="h-3.5 w-3.5" />
                  </span>
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    {nextStep.dropOffRate}% drop
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
