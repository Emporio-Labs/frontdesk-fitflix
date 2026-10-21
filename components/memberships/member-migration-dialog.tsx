'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  IconFileSpreadsheet,
  IconDownload,
  IconUpload,
  IconCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
  IconLoader2,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { membershipService } from '@/lib/services/membership.service'

interface MemberMigrationDialogProps {
  onSuccess?: () => void
}

interface MigrationPreviewSummary {
  totalMembers: number
  totalSessions: number
  totalCreditsIncluded: number
  totalCreditsDeducted: number
  netRemainingCredits: number
  existingUsersCount: number
  newUsersCount: number
}

interface MemberPreviewItem {
  phone: string
  name: string
  email?: string
  gender: string
  age: number
  planName: string
  category: string
  startDate: string
  endDate?: string
  totalCredits: number
  creditsUsed: number
  creditsRemaining: number
  price: number
  notes?: string
  sessions: Array<{
    serviceName: string
    serviceType: string
    sessionDate: string
    creditsDeducted: number
    notes?: string
  }>
  userExists: boolean
}

interface MigrationPreviewResult {
  valid: boolean
  summary: MigrationPreviewSummary
  members: MemberPreviewItem[]
  errors: Array<{ sheet: string; row: number; field?: string; message: string }>
  warnings: Array<{ sheet: string; row?: number; message: string }>
}

export function MemberMigrationDialog({ onSuccess }: MemberMigrationDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const [previewData, setPreviewData] = useState<MigrationPreviewResult | null>(null)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true)
      const blob = await membershipService.downloadTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'member-migration-template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Downloaded template (with Memberships & Past_Sessions sheets)')
    } catch (err: unknown) {
      toast.error('Failed to download template. Please try again.')
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setIsLoadingPreview(true)
    setPreviewData(null)
    setExpandedRows({})

    try {
      const data = await membershipService.previewMigration(file)
      setPreviewData(data)
      if (data.valid) {
        toast.success(`Validated ${data.summary.totalMembers} members and ${data.summary.totalSessions} sessions`)
      } else {
        toast.error(`Validation found ${data.errors.length} issue(s). Please review below.`)
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to parse Excel file'
      toast.error(errorMsg)
      setSelectedFile(null)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleExecuteMigration = async () => {
    if (!selectedFile || !previewData?.valid) return

    setIsExecuting(true)
    try {
      const result = await membershipService.executeMigration(selectedFile)
      toast.success(
        result.message || `Successfully imported ${result.result?.summary?.importedMembers || 0} members!`
      )
      setIsOpen(false)
      setSelectedFile(null)
      setPreviewData(null)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to execute migration'
      toast.error(errorMsg)
    } finally {
      setIsExecuting(false)
    }
  }

  const toggleRowExpansion = (phone: string) => {
    setExpandedRows((prev) => ({ ...prev, [phone]: !prev[phone] }))
  }

  const resetDialog = () => {
    setSelectedFile(null)
    setPreviewData(null)
    setIsLoadingPreview(false)
    setIsExecuting(false)
    setExpandedRows({})
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) resetDialog()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 hover:bg-primary/5">
          <IconFileSpreadsheet className="w-4 h-4 mr-2 text-primary" />
          Import Offline Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconFileSpreadsheet className="w-5 h-5 text-primary" />
            Import Offline Members & Past Sessions
          </DialogTitle>
          <DialogDescription>
            Upload a 2-sheet Excel file (<strong>Memberships</strong> & <strong>Past_Sessions</strong>). The system
            creates the member&apos;s plan, records each past therapy and yoga booking with its exact date, and updates their active credit balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Action Header / Upload bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg border bg-muted/40">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-sm font-semibold">1. Get the Excel Format</p>
              <p className="text-xs text-muted-foreground">
                Download the standardized template with sample membership and therapy rows.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              className="w-full sm:w-auto"
            >
              {isDownloadingTemplate ? (
                <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <IconDownload className="w-4 h-4 mr-2" />
              )}
              Download Template (.xlsx)
            </Button>
          </div>

          {/* Upload Area */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">2. Upload Filled Spreadsheet</label>
            <div
              className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors bg-card"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              <IconUpload className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {selectedFile ? selectedFile.name : 'Click to select or drag & drop .xlsx file'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max file size: 10 MB. Supports multiple members & session records.
              </p>
            </div>
          </div>

          {/* Loading Preview Spinner */}
          {isLoadingPreview && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <IconLoader2 className="w-5 h-5 animate-spin text-primary" />
              Analyzing sheets, validating formulas, and matching services...
            </div>
          )}

          {/* Preview & Validation Results */}
          {previewData && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Members</p>
                    <p className="text-xl font-bold text-foreground">{previewData.summary.totalMembers}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {previewData.summary.newUsersCount} new / {previewData.summary.existingUsersCount} existing
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Past Sessions</p>
                    <p className="text-xl font-bold text-foreground">{previewData.summary.totalSessions}</p>
                    <p className="text-[10px] text-muted-foreground">Therapies & Classes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Credits Deducted</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      -{previewData.summary.totalCreditsDeducted}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Pre-recorded usage</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Net Available Credits</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {previewData.summary.netRemainingCredits}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      of {previewData.summary.totalCreditsIncluded} total
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Errors Box if any */}
              {previewData.errors.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                    <IconAlertCircle className="w-5 h-5" />
                    Validation Errors ({previewData.errors.length}) - Please resolve in Excel and re-upload:
                  </div>
                  <ul className="text-xs space-y-1 list-disc pl-5 text-destructive/90 max-h-36 overflow-y-auto">
                    {previewData.errors.map((err, i) => (
                      <li key={i}>
                        [{err.sheet} Row {err.row}] {err.field ? `${err.field}: ` : ''}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings Box if any */}
              {previewData.warnings.length > 0 && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                    <IconAlertTriangle className="w-4 h-4" />
                    Notes & Warnings ({previewData.warnings.length}):
                  </div>
                  <ul className="text-xs space-y-1 list-disc pl-5 text-muted-foreground max-h-24 overflow-y-auto">
                    {previewData.warnings.map((w, i) => (
                      <li key={i}>{w.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="rounded-md border overflow-hidden">
                <div className="bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                  <span>Member Preview Breakdown</span>
                  <span>{previewData.members.length} members ready</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Total Cr</TableHead>
                        <TableHead className="text-right">Used Cr</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.members.map((m) => {
                        const isExpanded = expandedRows[m.phone]
                        return (
                          <div key={m.phone} className="contents">
                            <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRowExpansion(m.phone)}>
                              <TableCell className="p-2">
                                {m.sessions.length > 0 ? (
                                  isExpanded ? (
                                    <IconChevronDown className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <IconChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )
                                ) : null}
                              </TableCell>
                              <TableCell className="font-medium">
                                {m.name}
                                {m.userExists && (
                                  <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">
                                    Existing
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs">{m.phone}</TableCell>
                              <TableCell className="text-xs">{m.planName}</TableCell>
                              <TableCell className="text-right font-medium">{m.totalCredits}</TableCell>
                              <TableCell className="text-right text-amber-600 dark:text-amber-400 font-medium">
                                -{m.creditsUsed}
                              </TableCell>
                              <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-bold">
                                {m.creditsRemaining}
                              </TableCell>
                            </TableRow>

                            {/* Expanded Sessions view */}
                            {isExpanded && m.sessions.length > 0 && (
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={7} className="p-3 pl-10">
                                  <div className="text-xs space-y-1">
                                    <p className="font-semibold text-muted-foreground mb-1">
                                      Recorded Sessions ({m.sessions.length}):
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {m.sessions.map((s, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between border rounded px-2 py-1 bg-background text-xs"
                                        >
                                          <div>
                                            <span className="font-medium">{s.serviceName}</span>
                                            <span className="text-[10px] text-muted-foreground ml-1.5">
                                              ({s.serviceType} • {s.sessionDate})
                                            </span>
                                          </div>
                                          <span className="font-bold text-amber-600 dark:text-amber-400">
                                            -{s.creditsDeducted} cr
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </div>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button variant="outline" onClick={resetDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleExecuteMigration}
                  disabled={!previewData.valid || isExecuting}
                  className="bg-primary text-primary-foreground"
                >
                  {isExecuting ? (
                    <>
                      <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing Members...
                    </>
                  ) : (
                    <>
                      <IconCheck className="w-4 h-4 mr-2" />
                      Confirm &amp; Import ({previewData.summary.totalMembers} Members)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
