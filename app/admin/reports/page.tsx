'use client'

import { useState } from 'react'
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
import { IconPlus, IconDownload, IconTrash } from '@tabler/icons-react'

type Report = {
  id: string
  memberId: string
  reportType: 'membership' | 'therapy-progress' | 'dna-analysis' | 'financial'
  generatedDate: string
  downloadUrl: string
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    reportType: 'membership' as const,
    memberId: '',
    startDate: '',
    endDate: '',
    format: 'pdf',
  })

  const filteredReports = reports.filter(r => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.memberId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !filterType || r.reportType === filterType
    return matchesSearch && matchesType
  })

  const handleGenerateReport = () => {
    if (formData.memberId) {
      const newReport: Report = {
        id: `r${reports.length + 1}`,
        memberId: formData.memberId,
        reportType: formData.reportType,
        generatedDate: new Date().toISOString().split('T')[0],
        downloadUrl: `/reports/${formData.reportType}-${formData.memberId}-${Date.now()}.${formData.format}`,
      }
      setReports([...reports, newReport])
      resetForm()
      setIsGenerateDialogOpen(false)
    }
  }

  const handleDeleteReport = (id: string) => {
    setReports(reports.filter(r => r.id !== id))
  }

  const resetForm = () => {
    setFormData({
      reportType: 'membership',
      memberId: '',
      startDate: '',
      endDate: '',
      format: 'pdf',
    })
  }

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'membership':
        return 'bg-blue-100 text-blue-800'
      case 'therapy-progress':
        return 'bg-purple-100 text-purple-800'
      case 'dna-analysis':
        return 'bg-pink-100 text-pink-800'
      case 'financial':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'membership': 'Membership Report',
      'therapy-progress': 'Therapy Progress',
      'dna-analysis': 'DNA Analysis',
      'financial': 'Financial Summary',
    }
    return labels[type] || type
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
                <p className="text-muted-foreground">Generate and manage member reports</p>
              </div>
              <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <IconPlus className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate New Report</DialogTitle>
                    <DialogDescription>Create a new report for a member</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Report Type</label>
                      <select
                        value={formData.reportType}
                        onChange={(e) => setFormData({ ...formData, reportType: e.target.value as any })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="membership">Membership Report</option>
                        <option value="therapy-progress">Therapy Progress</option>
                        <option value="dna-analysis">DNA Analysis</option>
                        <option value="financial">Financial Summary</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Member ID</label>
                      <Input
                        value={formData.memberId}
                        onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                        placeholder="member123"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Start Date (Optional)</label>
                        <Input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">End Date (Optional)</label>
                        <Input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Format</label>
                      <select
                        value={formData.format}
                        onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="pdf">PDF</option>
                        <option value="csv">CSV</option>
                      </select>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsGenerateDialogOpen(false)
                          resetForm()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleGenerateReport}>Generate Report</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by report ID or member..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="">All Types</option>
                <option value="membership">Membership Report</option>
                <option value="therapy-progress">Therapy Progress</option>
                <option value="dna-analysis">DNA Analysis</option>
                <option value="financial">Financial Summary</option>
              </select>
            </div>

            {/* Reports Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reports.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Membership Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reports.filter(r => r.reportType === 'membership').length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">DNA Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reports.filter(r => r.reportType === 'dna-analysis').length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Financial Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reports.filter(r => r.reportType === 'financial').length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Reports Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Reports</CardTitle>
                <CardDescription>Total: {filteredReports.length} reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report ID</TableHead>
                        <TableHead>Member ID</TableHead>
                        <TableHead>Report Type</TableHead>
                        <TableHead>Generated Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.id}</TableCell>
                          <TableCell>{report.memberId}</TableCell>
                          <TableCell>
                            <Badge className={getReportTypeColor(report.reportType)}>
                              {getReportTypeLabel(report.reportType)}
                            </Badge>
                          </TableCell>
                          <TableCell>{report.generatedDate}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600"
                                asChild
                              >
                                <a href={report.downloadUrl} download>
                                  <IconDownload className="w-4 h-4" />
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteReport(report.id)}
                              >
                                <IconTrash className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
    </div>
  )
}
