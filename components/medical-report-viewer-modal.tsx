'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  IconFileText,
  IconPhoto,
  IconCopy,
  IconCheck,
  IconZoomIn,
  IconZoomOut,
  IconRotateClockwise,
  IconRefresh,
  IconShieldLock,
  IconAlertCircle,
  IconLoader2,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import type { MedicalReport } from '@/lib/services/onboarding.service'
import { userService } from '@/lib/services/user.service'
import { createExpiringReportLink } from '@/lib/report-link'

interface MedicalReportViewerModalProps {
  report: MedicalReport | null
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatUploadDate(value?: string | null): string {
  if (!value) return 'Unknown upload date'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : DATE_FORMATTER.format(parsed)
}

function detectFileType(report: MedicalReport | null, url: string): 'pdf' | 'image' | 'other' {
  if (!report && !url) return 'pdf'
  const name = (report?.reportName || '').toLowerCase()
  const type = (report?.reportType || '').toLowerCase()
  const cleanUrl = url.split('?')[0].toLowerCase()

  if (name.endsWith('.pdf') || cleanUrl.endsWith('.pdf') || type.includes('pdf')) {
    return 'pdf'
  }

  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp']
  if (
    imageExts.some((ext) => name.endsWith(ext) || cleanUrl.endsWith(ext)) ||
    type.includes('image') ||
    type.includes('scan') ||
    type.includes('photo')
  ) {
    return 'image'
  }

  return 'pdf' // Default to PDF for medical reports
}

export function MedicalReportViewerModal({
  report,
  userId,
  open,
  onOpenChange,
}: MedicalReportViewerModalProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>('')
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [copied, setCopied] = useState<boolean>(false)

  // Image viewer interaction controls
  const [zoom, setZoom] = useState<number>(1)
  const [rotation, setRotation] = useState<number>(0)

  // Fetch or resolve short-lived signed URL (AC FX-07.4)
  useEffect(() => {
    if (!open || !report) {
      setResolvedUrl('')
      setUrlError(null)
      setZoom(1)
      setRotation(0)
      return
    }

    let isMounted = true
    setIsLoadingUrl(true)
    setUrlError(null)

    const reportId = report._id || report.id
    if (userId && reportId) {
      userService
        .getReportSignedUrl(userId, reportId)
        .then((res) => {
          if (!isMounted) return
          if (res?.url) {
            setResolvedUrl(res.url)
          } else if (report.reportUrl) {
            setResolvedUrl(report.reportUrl)
          } else {
            setUrlError('No accessible link available for this medical report.')
          }
        })
        .catch(() => {
          if (!isMounted) return
          if (report.reportUrl) {
            setResolvedUrl(report.reportUrl)
          } else {
            setUrlError('Unable to generate secure report viewing link.')
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingUrl(false)
        })
    } else if (report.reportUrl) {
      setResolvedUrl(report.reportUrl)
      setIsLoadingUrl(false)
    } else {
      setUrlError('Report file URL not found.')
      setIsLoadingUrl(false)
    }

    return () => {
      isMounted = false
    }
  }, [open, report, userId])

  const fileType = useMemo(
    () => detectFileType(report, resolvedUrl),
    [report, resolvedUrl]
  )

  const handleCopyLink = async () => {
    if (!resolvedUrl) return
    try {
      const expiringLink = createExpiringReportLink(resolvedUrl, 900)
      await navigator.clipboard.writeText(expiringLink)
      setCopied(true)
      toast.success('Report link copied to clipboard', {
        description: 'Notice: For confidentiality, this copied link stops working in 15 minutes.',
      })
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5))
  const handleResetView = () => {
    setZoom(1)
    setRotation(0)
  }
  const handleRotate = () => setRotation((r) => (r + 90) % 360)

  if (!report) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="medical-report-in-page-modal"
        className="w-[calc(100%-1rem)] max-w-4xl p-4 sm:p-6 max-h-[92vh] flex flex-col gap-3 sm:gap-4 overflow-hidden"
      >
        <DialogHeader className="space-y-1.5 shrink-0 border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              {fileType === 'pdf' ? (
                <div className="p-1.5 rounded bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 shrink-0">
                  <IconFileText className="h-5 w-5" />
                </div>
              ) : (
                <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                  <IconPhoto className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-semibold truncate leading-snug">
                  {report.reportName || 'Medical Report'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                  <span>Uploaded {formatUploadDate(report.uploadedAt || report.createdAt)}</span>
                  {report.reportType && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{report.reportType}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="text-[11px] gap-1 px-2 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                title="Protected medical record: copied link expires in 15 minutes"
              >
                <IconShieldLock className="h-3 w-3" />
                <span className="hidden xs:inline">Confidential •</span> Expires in 15m
              </Badge>
              <Button
                id="copy-report-link-btn"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 px-2"
                onClick={handleCopyLink}
                disabled={!resolvedUrl || isLoadingUrl}
                title="Copy secure expiring link"
              >
                {copied ? (
                  <>
                    <IconCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="hidden sm:inline">Copied</span>
                  </>
                ) : (
                  <>
                    <IconCopy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Copy Link</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Report Content Container */}
        <div className="relative flex-1 min-h-[360px] max-h-[70vh] sm:max-h-[72vh] rounded-lg border bg-muted/40 overflow-hidden flex flex-col">
          {isLoadingUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
              <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading secure report viewer…</p>
            </div>
          ) : urlError ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <IconAlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm font-medium text-destructive">{urlError}</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                The medical report file could not be rendered inside the profile.
              </p>
            </div>
          ) : fileType === 'pdf' ? (
            /* PDF In-Page Reader (Optimized for Phone-Sized and Desktop Screens) */
            <div className="relative w-full h-full min-h-[380px] flex-1 flex flex-col bg-background">
              <iframe
                id="in-page-pdf-frame"
                src={`${resolvedUrl}#toolbar=0&navpanes=0`}
                title={report.reportName || 'PDF Medical Report'}
                className="w-full h-full flex-1 border-0 rounded-md"
              />
              <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm border rounded px-2 py-1 text-[11px] text-muted-foreground shadow-sm">
                In-Profile Reader
              </div>
            </div>
          ) : (
            /* Image In-Page Reader with Zoom / Pan / Rotate Controls */
            <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
              {/* Image Controls Bar */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-background/85 backdrop-blur border rounded-md p-1 shadow-sm">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  disabled={zoom >= 3}
                >
                  <IconZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  disabled={zoom <= 0.5}
                >
                  <IconZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleRotate}
                  title="Rotate 90°"
                >
                  <IconRotateClockwise className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleResetView}
                  title="Reset View"
                >
                  <IconRefresh className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] px-1 text-muted-foreground font-mono">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-4">
                <img
                  id="in-page-image-report"
                  src={resolvedUrl}
                  alt={report.reportName || 'Medical Report Image'}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-in-out',
                  }}
                  className="max-h-[62vh] max-w-full object-contain select-none shadow-md rounded"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
