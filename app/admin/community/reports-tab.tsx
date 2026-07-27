'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  IconRefresh, IconShieldCheck, IconAlertTriangle, IconExternalLink,
} from '@tabler/icons-react'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTable } from '@/components/skeleton-loader'
import { useAdminReports, useResolveReport } from '@/hooks/use-community'
import { ReportAction, ReportRow } from '@/lib/services/community.service'
import { ModerationDialog } from './moderation-dialog'
import { formatAge, formatDateTime } from './shared'

// Reason is mandatory for the three actions the backend guards with
// requireReason(); dismiss and warn accept an optional note.
const ACTIONS: {
  value: ReportAction
  label: string
  requireReason: boolean
  destructive: boolean
  description: string
}[] = [
  { value: 'dismiss', label: 'Dismiss', requireReason: false, destructive: false, description: 'Close the report with no action. The content stays live.' },
  { value: 'warn', label: 'Warn author', requireReason: false, destructive: false, description: 'Log a warning against the author. The content stays live.' },
  { value: 'delete_content', label: 'Delete content', requireReason: true, destructive: true, description: 'Soft-delete the reported post or comment and close the report.' },
  { value: 'suspend', label: 'Suspend author', requireReason: true, destructive: true, description: 'Suspend the author’s account and close the report.' },
  { value: 'ban', label: 'Ban author', requireReason: true, destructive: true, description: 'Permanently ban the author and close the report.' },
]

function reportedText(report: ReportRow): string {
  const c = report.content
  if (!c) return 'Content no longer available.'
  return c.content ?? c.body ?? '—'
}

export function ReportsTab() {
  const { data: reports = [], isLoading, isError, refetch } = useAdminReports()
  const resolve = useResolveReport()

  const [pending, setPending] = useState<{ report: ReportRow; action: (typeof ACTIONS)[number] } | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Oldest first — the longest-waiting report is at the top.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto h-9 px-3 text-xs">
          <IconRefresh className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </div>

      <Card className="border-border shadow-sm bg-card overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/60">
          <CardTitle className="text-lg font-bold text-foreground">Pending reports</CardTitle>
          <CardDescription>{isLoading ? 'Loading…' : `${reports.length} awaiting review`}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <div className="text-center py-8 text-destructive">Failed to load the report queue.</div>
          ) : isLoading ? (
            <div className="p-6"><SkeletonTable /></div>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<IconShieldCheck className="w-10 h-10" />}
              title="Queue is clear"
              description="No pending reports. New reports appear here as members submit them."
            />
          ) : (
            <div className="divide-y divide-border/50">
              {reports.map((report) => (
                <div key={report.id} className="p-6 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-2 py-0 rounded-full capitalize">
                      {report.targetType}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-full">
                      {report.reason.replace(/_/g, ' ')}
                    </Badge>
                    {report.reportCount > 1 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0 rounded-full border-destructive/40 text-destructive"
                      >
                        <IconAlertTriangle className="w-3 h-3 mr-1" />
                        {report.reportCount} reports
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                      Waiting {formatAge(report.ageHours)} · {formatDateTime(report.createdAt)}
                    </span>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{reportedText(report)}</p>
                    {report.content?.visibility && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Visibility: {report.content.visibility === 'members_only' ? 'Members only' : 'Public'}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Reported by: {report.reporter ?? 'Unknown'}</p>
                    {report.note && <p className="text-foreground/80">Note: “{report.note}”</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {ACTIONS.map((action) => (
                      <Button
                        key={action.value}
                        size="sm"
                        variant={action.destructive ? 'outline' : 'secondary'}
                        className={
                          action.destructive
                            ? 'h-8 px-3 text-xs border-destructive/30 text-destructive hover:bg-destructive/10'
                            : 'h-8 px-3 text-xs'
                        }
                        onClick={() => setPending({ report, action })}
                      >
                        {action.label}
                      </Button>
                    ))}
                    {report.targetType === 'post' && (
                      <Button asChild size="sm" variant="ghost" className="h-8 px-3 text-xs ml-auto">
                        <Link href={`/admin/community/posts/${report.targetId}`}>
                          Open post <IconExternalLink className="w-3.5 h-3.5 ml-1.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ModerationDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending ? `${pending.action.label}` : ''}
        description={pending?.action.description ?? ''}
        confirmLabel={pending?.action.label ?? 'Confirm'}
        requireReason={pending?.action.requireReason}
        requireStepUp
        destructive={pending?.action.destructive}
        pending={resolve.isPending}
        onConfirm={async ({ reason, stepUpToken }) => {
          if (!pending) return
          await resolve.mutateAsync({
            id: pending.report.id,
            action: pending.action.value,
            reason,
            stepUpToken,
          })
          setPending(null)
        }}
      />
    </div>
  )
}
