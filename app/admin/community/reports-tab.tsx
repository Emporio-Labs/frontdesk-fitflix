'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { IconRefresh, IconExternalLink, IconGavel } from '@tabler/icons-react'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTable } from '@/components/skeleton-loader'
import { useAdminReports, useResolveReport } from '@/hooks/use-community'
import { ReportRow, ReportAction } from '@/lib/services/community.service'
import { ModerationDialog } from './moderation-dialog'
import { formatDateTime, truncate } from './shared'

const ACTIONS: { value: ReportAction; label: string; destructive?: boolean; requireStepUp?: boolean }[] = [
  { value: 'dismiss', label: 'Dismiss' },
  { value: 'warn', label: 'Warn author' },
  { value: 'delete_content', label: 'Delete content', destructive: true, requireStepUp: true },
  { value: 'suspend', label: 'Suspend author', destructive: true, requireStepUp: true },
  { value: 'ban', label: 'Ban author', destructive: true, requireStepUp: true },
]

export function ReportsTab() {
  const { data: reports = [], isLoading, isError, refetch } = useAdminReports()
  const resolve = useResolveReport()

  const [pending, setPending] = useState<{ report: ReportRow; action: ReportAction } | null>(null)

  const actionMeta = ACTIONS.find((a) => a.value === pending?.action)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 px-3 text-xs">
          <IconRefresh className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </div>

      <Card className="border-border shadow-sm bg-card overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/60">
          <CardTitle className="text-lg font-bold text-foreground">Open reports</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading…' : `${reports.length} report${reports.length === 1 ? '' : 's'} awaiting a decision`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <div className="text-center py-8 text-destructive">
              Failed to load reports. Your admin session may have expired — sign in again.
            </div>
          ) : isLoading ? (
            <div className="p-6"><SkeletonTable /></div>
          ) : reports.length === 0 ? (
            <EmptyState title="No open reports" description="Every reported item has been resolved." />
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader className="bg-muted/30 border-b border-border/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 font-semibold w-[110px]">Target</TableHead>
                    <TableHead className="font-semibold">Reason & content</TableHead>
                    <TableHead className="font-semibold w-[110px]">Reports</TableHead>
                    <TableHead className="font-semibold w-[150px]">First reported</TableHead>
                    <TableHead className="text-right pr-6 font-semibold w-[220px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/20 border-b border-border/40 transition-colors align-top">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full w-fit uppercase">
                            {report.targetType}
                          </Badge>
                          {report.targetType === 'post' && (
                            <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-xs w-fit">
                              <Link href={`/admin/community/posts/${report.targetId}`}>
                                <IconExternalLink className="w-3 h-3 mr-1" /> Open
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[420px] py-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-medium text-foreground">{report.reason}</span>
                          {report.note && (
                            <span className="text-xs text-muted-foreground">{truncate(report.note, 200)}</span>
                          )}
                          {report.content && (
                            <div className="text-xs text-muted-foreground border-l-2 border-border pl-2 mt-1">
                              {truncate(report.content.content ?? report.content.body ?? '', 180)}
                            </div>
                          )}
                          {report.reporter && (
                            <span className="text-[11px] text-muted-foreground">
                              First reporter: {report.reporter}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm font-semibold text-foreground">{report.reportCount}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap py-4">
                        {formatDateTime(report.createdAt)}
                        <div className="text-[11px] text-muted-foreground">
                          {report.ageHours < 1
                            ? '< 1h ago'
                            : report.ageHours < 24
                              ? `${Math.round(report.ageHours)}h ago`
                              : `${Math.round(report.ageHours / 24)}d ago`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <Select
                          value=""
                          onValueChange={(action) =>
                            setPending({ report, action: action as ReportAction })
                          }
                        >
                          <SelectTrigger className="h-9 w-[180px] ml-auto text-xs">
                            <SelectValue placeholder="Resolve as…" />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIONS.map((a) => (
                              <SelectItem key={a.value} value={a.value}>
                                <span className="flex items-center gap-2">
                                  <IconGavel className="w-3 h-3" />
                                  {a.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ModerationDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending ? `Resolve as: ${actionMeta?.label}` : ''}
        description="Recorded in the append-only audit log with your admin identity."
        confirmLabel={actionMeta?.label ?? 'Confirm'}
        destructive={actionMeta?.destructive}
        requireReason={pending?.action !== 'dismiss'}
        requireStepUp={actionMeta?.requireStepUp}
        pending={resolve.isPending}
        onConfirm={async ({ reason, stepUpToken }) => {
          if (!pending) return
          await resolve.mutateAsync({
            id: pending.report.id,
            action: pending.action,
            reason: reason || undefined,
            stepUpToken,
          })
          setPending(null)
        }}
      />
    </div>
  )
}
