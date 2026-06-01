'use client'

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
import { IconFileText, IconDownload, IconExternalLink } from '@tabler/icons-react'
import type { MedicalReport } from '@/lib/services/onboarding.service'

interface OnboardingReportsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reports?: MedicalReport[]
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
}: OnboardingReportsDialogProps) {
  const hasReports = Array.isArray(reports) && reports.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Uploaded Reports</DialogTitle>
          <DialogDescription>
            Medical reports uploaded during onboarding.
          </DialogDescription>
        </DialogHeader>

        {hasReports ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports!.map((r) => (
                <TableRow key={r._id}>
                  <TableCell className="font-medium break-all">{r.reportName}</TableCell>
                  <TableCell className="capitalize">{r.reportType || '—'}</TableCell>
                  <TableCell>{formatDate(r.uploadedAt || r.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {r.reportUrl ? (
                      <div className="flex items-center justify-end gap-1">
                        <a href={r.reportUrl} target="_blank" rel="noreferrer noopener">
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <IconExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </a>
                        <a href={r.reportUrl} download>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <IconDownload className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No file link</span>
                    )}
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
  )
}
