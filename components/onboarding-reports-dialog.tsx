'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/empty-state'
import { IconFileText, IconEye, IconLock } from '@tabler/icons-react'
import type { MedicalReport } from '@/lib/services/onboarding.service'
import { MedicalReportViewerModal } from '@/components/medical-report-viewer-modal'
import { useCanAccessMemberReports } from '@/hooks/use-can-access-reports'

interface OnboardingReportsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reports?: MedicalReport[]
  userId?: string
  member?: any
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : DATE_FORMATTER.format(parsed)
}

export function OnboardingReportsDialog({
  open,
  onOpenChange,
  reports,
  userId,
  member,
}: OnboardingReportsDialogProps) {
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null)
  const reportAccess = useCanAccessMemberReports(member || { id: userId, _id: userId })
  const hasReports = Array.isArray(reports) && reports.length > 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Uploaded Reports</DialogTitle>
            <DialogDescription>
              Medical reports uploaded during member onboarding.
            </DialogDescription>
          </DialogHeader>

          {!reportAccess.allowed ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-3 my-2">
              <IconLock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold">Confidential Medical Reports</p>
                <p className="text-xs mt-1">
                  {reportAccess.reason || 'You can only view medical reports for members you look after.'}
                </p>
              </div>
            </div>
          ) : hasReports ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports!.map((r) => (
                  <TableRow key={r._id || r.id}>
                    <TableCell className="font-medium break-all">{r.reportName}</TableCell>
                    <TableCell className="capitalize">{r.reportType || '—'}</TableCell>
                    <TableCell>{formatDate(r.uploadedAt || r.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        id={`onboarding-read-report-${r._id || r.id}`}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 hover:bg-primary hover:text-primary-foreground"
                        onClick={() => setSelectedReport(r)}
                      >
                        <IconEye className="h-3.5 w-3.5" />
                        Read Report
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={<IconFileText className="h-10 w-10" />}
              title="No reports uploaded"
              description="This member has not uploaded any medical reports yet."
            />
          )}
        </DialogContent>
      </Dialog>

      {/* In-Page Viewer Modal */}
      <MedicalReportViewerModal
        report={selectedReport}
        userId={userId || member?._id || member?.id || ''}
        open={!!selectedReport}
        onOpenChange={(open) => {
          if (!open) setSelectedReport(null)
        }}
      />
    </>
  )
}
