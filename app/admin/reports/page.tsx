'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { IconPlus, IconDownload, IconTrash, IconEye, IconFileText } from '@tabler/icons-react'
import { MemberSearchSelect } from '@/components/shared/member-search-select'
import { useDnaTests } from '@/hooks/use-dna'
import { useUsers } from '@/hooks/use-users'
import type { User } from '@/lib/services/user.service'
import { toast } from 'sonner'

export type ReportType = 'membership' | 'therapy-progress' | 'dna-analysis' | 'financial'

export type ReportItem = {
  id: string
  memberId: string
  memberName?: string
  memberPhone?: string
  reportType: ReportType
  title: string
  generatedDate: string
  downloadUrl: string
  isExternal?: boolean
}

export default function ReportsPage() {
  const { data: users = [] } = useUsers()
  const { data: dnaTests = [] } = useDnaTests()

  const [generatedReports, setGeneratedReports] = useState<ReportItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined)

  const [formData, setFormData] = useState({
    reportType: 'membership' as ReportType,
    memberId: '',
    startDate: '',
    endDate: '',
    format: 'pdf',
  })

  // Merge real DNA tests from backend with generated reports
  const allReports: ReportItem[] = useMemo(() => {
    const dnaReportItems: ReportItem[] = dnaTests.map((t) => ({
      id: t.id,
      memberId: t.memberId,
      memberName: t.member?.username || 'Member',
      memberPhone: t.member?.phone || t.member?.email,
      reportType: 'dna-analysis',
      title: t.reportName || 'DNA Analysis Report',
      generatedDate: t.testDate || (t.createdAt ? t.createdAt.split('T')[0] : '2026-10-16'),
      downloadUrl: t.downloadUrl || '',
      isExternal: true,
    }))

    return [...dnaReportItems, ...generatedReports]
  }, [dnaTests, generatedReports])

  const filteredReports = useMemo(() => {
    return allReports.filter((r) => {
      const q = searchTerm.toLowerCase().trim()
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.memberId.toLowerCase().includes(q) ||
        (r.memberName && r.memberName.toLowerCase().includes(q)) ||
        (r.memberPhone && r.memberPhone.toLowerCase().includes(q)) ||
        r.title.toLowerCase().includes(q)

      const matchesType = !filterType || r.reportType === filterType
      return matchesSearch && matchesType
    })
  }, [allReports, searchTerm, filterType])

  const createReportBlobUrl = (
    type: ReportType,
    member?: User,
    startDate?: string,
    endDate?: string
  ): string => {
    const memberName = member?.username || 'Member'
    const memberPhone = member?.phone || 'N/A'
    const memberEmail = member?.email || 'N/A'
    const memberId = member?.id || member?._id || 'N/A'
    const dateStr = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const title = getReportTypeLabel(type)

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Fitflix ${title} - ${memberName}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 32px; background: #fff; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; }
    .badge { background: #e2e8f0; color: #0f172a; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .title { font-size: 22px; font-weight: 700; margin: 0 0 6px 0; }
    .sub { color: #64748b; font-size: 13px; margin: 0 0 20px 0; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
    .info-label { color: #64748b; font-weight: 500; }
    .info-val { color: #0f172a; font-weight: 600; }
    .section-title { font-size: 15px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 24px 0 12px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    th { background: #f1f5f9; padding: 8px 12px; text-align: left; border: 1px solid #e2e8f0; color: #475569; }
    td { padding: 8px 12px; border: 1px solid #e2e8f0; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">FITFLIX</div>
    <div class="badge">${title}</div>
  </div>

  <div class="title">${title}</div>
  <p class="sub">Generated on ${dateStr} • Fitflix FrontDesk Member Portal</p>

  <div class="info-card">
    <div class="info-grid">
      <div><span class="info-label">Member Name: </span><span class="info-val">${memberName}</span></div>
      <div><span class="info-label">Phone: </span><span class="info-val">${memberPhone}</span></div>
      <div><span class="info-label">Email: </span><span class="info-val">${memberEmail}</span></div>
      <div><span class="info-label">Member ID: </span><span class="info-val">${memberId}</span></div>
      ${
        startDate
          ? `<div><span class="info-label">Period: </span><span class="info-val">${startDate} to ${endDate || 'Present'}</span></div>`
          : ''
      }
    </div>
  </div>

  <div class="section-title">Record Details</div>
  <table>
    <thead>
      <tr>
        <th>Metric / Item</th>
        <th>Recorded Status</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Report Status</td><td>Official & Verified</td></tr>
      <tr><td>Center</td><td>Fitflix Sainikpuri</td></tr>
      <tr><td>Generated By</td><td>FrontDesk Staff</td></tr>
      <tr><td>Format</td><td>PDF Export</td></tr>
    </tbody>
  </table>

  <div class="footer">
    Fitflix Health & Performance Hub • Confidential Document
  </div>
</body>
</html>`

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    return URL.createObjectURL(blob)
  }

  const handleGenerateReport = () => {
    if (!formData.memberId) {
      toast.error('Please select a member first')
      return
    }

    const member =
      selectedUser ||
      users.find((u) => u.id === formData.memberId || u._id === formData.memberId)

    // Check if DNA analysis report already has an uploaded file
    if (formData.reportType === 'dna-analysis') {
      const existingDna = dnaTests.find(
        (t) => (t.memberId === formData.memberId || t.member?.id === formData.memberId) && t.downloadUrl
      )
      if (existingDna && existingDna.downloadUrl) {
        toast.success('Found existing DNA test report. Opening PDF...')
        window.open(existingDna.downloadUrl, '_blank')
        setIsGenerateDialogOpen(false)
        resetForm()
        return
      }
    }

    const blobUrl = createReportBlobUrl(
      formData.reportType,
      member,
      formData.startDate,
      formData.endDate
    )

    const newReport: ReportItem = {
      id: `r${allReports.length + 1}`,
      memberId: formData.memberId,
      memberName: member?.username || 'Member',
      memberPhone: member?.phone || member?.email,
      reportType: formData.reportType,
      title: getReportTypeLabel(formData.reportType),
      generatedDate: new Date().toISOString().split('T')[0],
      downloadUrl: blobUrl,
      isExternal: false,
    }

    setGeneratedReports((prev) => [newReport, ...prev])
    toast.success(`${getReportTypeLabel(formData.reportType)} generated successfully!`)
    resetForm()
    setIsGenerateDialogOpen(false)
  }

  const handleDeleteReport = (id: string) => {
    setGeneratedReports((prev) => prev.filter((r) => r.id !== id))
    toast.success('Report removed from list')
  }

  const resetForm = () => {
    setFormData({
      reportType: 'membership',
      memberId: '',
      startDate: '',
      endDate: '',
      format: 'pdf',
    })
    setSelectedUser(undefined)
  }

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'membership':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
      case 'therapy-progress':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
      case 'dna-analysis':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300'
      case 'financial':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      membership: 'Membership Report',
      'therapy-progress': 'Therapy Progress',
      'dna-analysis': 'DNA Analysis',
      financial: 'Financial Summary',
    }
    return labels[type] || type
  }

  // Count summaries
  const membershipCount = allReports.filter((r) => r.reportType === 'membership').length
  const dnaCount = allReports.filter((r) => r.reportType === 'dna-analysis').length
  const financialCount = allReports.filter((r) => r.reportType === 'financial').length

  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">Generate, download, and manage member clinical and membership reports</p>
        </div>
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <IconPlus className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate New Report</DialogTitle>
              <DialogDescription>Select a report type and member to generate an official document</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Report Type</label>
                <select
                  value={formData.reportType}
                  onChange={(e) => setFormData({ ...formData, reportType: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="membership">Membership Report</option>
                  <option value="therapy-progress">Therapy Progress</option>
                  <option value="dna-analysis">DNA Analysis</option>
                  <option value="financial">Financial Summary</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Select Member</label>
                <MemberSearchSelect
                  value={formData.memberId}
                  onChange={(id, member) => {
                    setFormData({ ...formData, memberId: id })
                    setSelectedUser(member)
                  }}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Start Date (Optional)</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">End Date (Optional)</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Format</label>
                <select
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="html">HTML Print View</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsGenerateDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleGenerateReport} disabled={!formData.memberId}>
                  Generate Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allReports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Membership Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{membershipCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">DNA Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dnaCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Financial Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by member name, phone, or report ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="">All Report Types</option>
          <option value="membership">Membership Reports</option>
          <option value="therapy-progress">Therapy Progress</option>
          <option value="dna-analysis">DNA Analysis</option>
          <option value="financial">Financial Reports</option>
        </select>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Reports</CardTitle>
          <CardDescription>Total: {filteredReports.length} reports available</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No reports found. Click &quot;Generate Report&quot; to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report ID</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Report Type</TableHead>
                    <TableHead>Generated Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{report.memberName || 'Member'}</p>
                          <p className="text-xs text-muted-foreground">{report.memberPhone || report.memberId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getReportTypeColor(report.reportType)}>
                          {getReportTypeLabel(report.reportType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{report.generatedDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {report.downloadUrl ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 hover:text-emerald-700 h-8 gap-1"
                              asChild
                            >
                              <a
                                href={report.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View / Download Document"
                              >
                                <IconEye className="w-4 h-4" />
                                <span className="text-xs">View</span>
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                              <IconFileText className="w-3.5 h-3.5" /> No file
                            </span>
                          )}
                          {!report.isExternal && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteReport(report.id)}
                              title="Delete report"
                            >
                              <IconTrash className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
