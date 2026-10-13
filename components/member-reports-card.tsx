'use client'

import { useRef, useState } from 'react'
import {
  IconDna2,
  IconEye,
  IconFileText,
  IconLock,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/empty-state'
import { MedicalReportViewerModal } from '@/components/medical-report-viewer-modal'
import { Skeleton } from '@/components/skeleton-loader'
import { useAuth } from '@/hooks/use-auth'
import { useCanAccessMemberReports } from '@/hooks/use-can-access-reports'
import { useDeleteDnaReport, useUploadDnaReport, useUserReports } from '@/hooks/use-users'
import type { UserRole } from '@/lib/rbac'
import type { MedicalReport } from '@/lib/services/onboarding.service'

// The backend lets only admin and frontdesk file a DNA report; these are the
// portal roles those sign in as (see the role map in app/login/page.tsx).
const DNA_UPLOAD_ROLES: UserRole[] = ['super_admin', 'clinic_admin', 'staff']

function formatDate(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function ReportRows({
  reports,
  onRead,
  onDelete,
}: {
  reports: MedicalReport[]
  onRead: (report: MedicalReport) => void
  onDelete?: (report: MedicalReport) => void
}) {
  return (
    <ul className="divide-y rounded-md border">
      {reports.map((report) => (
        <li
          key={report._id || report.id}
          className="flex items-center justify-between gap-3 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium break-words">{report.reportName}</p>
            <p className="text-xs text-muted-foreground">
              {report.category === 'dna' ? 'DNA' : report.reportType || 'Report'} ·{' '}
              {formatDate(report.uploadedAt || report.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => onRead(report)}
            >
              <IconEye className="h-3.5 w-3.5" />
              Read
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-red-600 hover:text-red-700"
                aria-label={`Delete ${report.reportName}`}
                onClick={() => onDelete(report)}
              >
                <IconTrash className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function UploadDnaReportDialog({
  userId,
  memberName,
  open,
  onOpenChange,
}: {
  userId: string
  memberName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const upload = useUploadDnaReport(userId)
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [reportName, setReportName] = useState('')
  const [progress, setProgress] = useState(0)
  const [fileError, setFileError] = useState<string | null>(null)

  const reset = () => {
    setFile(null)
    setReportName('')
    setProgress(0)
    setFileError(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const handleOpenChange = (next: boolean) => {
    if (upload.isPending) return
    if (!next) reset()
    onOpenChange(next)
  }

  const handleFile = (picked: File | null) => {
    setFileError(null)
    if (!picked) {
      setFile(null)
      return
    }
    if (picked.type !== 'application/pdf' && !picked.name.toLowerCase().endsWith('.pdf')) {
      setFile(null)
      setFileError('Choose a PDF file.')
      if (fileInput.current) fileInput.current.value = ''
      return
    }
    setFile(picked)
    if (!reportName.trim()) setReportName(picked.name.replace(/\.pdf$/i, ''))
  }

  const canSubmit = !!file && reportName.trim().length > 0 && !upload.isPending

  const handleSubmit = () => {
    if (!file || !reportName.trim()) return
    upload.mutate(
      { file, reportName: reportName.trim(), onProgress: setProgress },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
        onError: () => setProgress(0),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload DNA report</DialogTitle>
          <DialogDescription>
            {memberName ? `${memberName} will` : 'The member will'} see this report in the DNA
            section of the app as soon as it is uploaded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dna-report-file">PDF file</Label>
            <Input
              id="dna-report-file"
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              disabled={upload.isPending}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {fileError && <p className="text-xs text-red-600">{fileError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dna-report-name">Report name</Label>
            <Input
              id="dna-report-name"
              value={reportName}
              maxLength={200}
              placeholder="e.g. DNA report – October 2026"
              disabled={upload.isPending}
              onChange={(e) => setReportName(e.target.value)}
            />
          </div>
          {upload.isPending && <Progress value={Math.round(progress * 100)} />}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={upload.isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * A member's reports, split the way the rules split them: DNA reports, which
 * only the front desk files (and which feed the DNA section of the member
 * app), and the reports the member uploaded themselves for experts to read.
 */
export function MemberReportsCard({ userId, member }: { userId: string; member?: any }) {
  const { role } = useAuth()
  const access = useCanAccessMemberReports(member || { id: userId, _id: userId })
  const canUploadDna = DNA_UPLOAD_ROLES.includes(role)

  const { data: reports, isLoading, isError } = useUserReports(userId, access.allowed)
  const deleteDna = useDeleteDnaReport(userId)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [reading, setReading] = useState<MedicalReport | null>(null)
  const [deleting, setDeleting] = useState<MedicalReport | null>(null)

  const dnaReports = (reports ?? []).filter((r) => r.category === 'dna')
  const memberReports = (reports ?? []).filter((r) => r.category !== 'dna')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconFileText className="h-4 w-4 text-muted-foreground" />
              Reports
            </CardTitle>
            <CardDescription>
              DNA reports filed by the front desk, and reports the member uploaded from the app.
            </CardDescription>
          </div>
          {canUploadDna && access.allowed && (
            <Button size="sm" className="shrink-0" onClick={() => setUploadOpen(true)}>
              <IconUpload className="mr-2 h-4 w-4" />
              Upload DNA report
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!access.allowed ? (
          <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
            <IconLock className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{access.reason || 'You can only view reports for members you look after.'}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <p className="text-sm text-red-500">Failed to load reports.</p>
        ) : (
          <div className="space-y-6">
            <section className="space-y-2">
              <h4 className="text-sm font-semibold">DNA reports</h4>
              {dnaReports.length === 0 ? (
                <EmptyState
                  icon={<IconDna2 className="h-8 w-8" />}
                  title="No DNA report yet"
                  description={
                    canUploadDna
                      ? 'Upload the PDF here and the member will see it in the app.'
                      : 'The front desk has not filed a DNA report for this member.'
                  }
                />
              ) : (
                <ReportRows
                  reports={dnaReports}
                  onRead={setReading}
                  onDelete={canUploadDna ? setDeleting : undefined}
                />
              )}
            </section>

            <section className="space-y-2">
              <h4 className="text-sm font-semibold">Uploaded by the member</h4>
              {memberReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  The member has not uploaded any reports.
                </p>
              ) : (
                <ReportRows reports={memberReports} onRead={setReading} />
              )}
            </section>
          </div>
        )}
      </CardContent>

      <UploadDnaReportDialog
        userId={userId}
        memberName={member?.username}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />

      <MedicalReportViewerModal
        report={reading}
        userId={userId}
        open={!!reading}
        onOpenChange={(open) => {
          if (!open) setReading(null)
        }}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this DNA report?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.reportName}” will be removed from the member’s app and the file deleted.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleting) deleteDna.mutate(deleting._id || deleting.id)
                setDeleting(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
