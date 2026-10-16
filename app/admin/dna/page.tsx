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
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconArrowRight,
  IconDownload,
  IconFileText,
  IconUpload,
} from '@tabler/icons-react'
import { MemberSearchSelect } from '@/components/shared/member-search-select'
import {
  useDnaTests,
  useCreateDnaTest,
  useUpdateDnaTest,
  useDeleteDnaTest,
} from '@/hooks/use-dna'
import type { DNATestItem } from '@/lib/services/dna.service'

export default function DNATestingPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTest, setEditingTest] = useState<DNATestItem | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    memberId: '',
    testDate: new Date().toISOString().split('T')[0],
    reportName: 'DNA Analysis Report',
    status: 'in-progress' as 'not-started' | 'in-progress' | 'completed',
    notes: '',
  })

  // Real backend queries & mutations
  const { data: tests = [], isLoading } = useDnaTests({
    search: searchTerm,
    status: filterStatus,
  })
  const createMutation = useCreateDnaTest()
  const updateMutation = useUpdateDnaTest()
  const deleteMutation = useDeleteDnaTest()

  const resetForm = () => {
    setFormData({
      memberId: '',
      testDate: new Date().toISOString().split('T')[0],
      reportName: 'DNA Analysis Report',
      status: 'in-progress',
      notes: '',
    })
    setSelectedFile(null)
    setEditingTest(null)
  }

  const handleAddTest = async () => {
    if (!formData.memberId) {
      return
    }

    const payload = new FormData()
    payload.append('memberId', formData.memberId)
    payload.append('testDate', formData.testDate)
    payload.append('reportName', formData.reportName)
    payload.append('status', formData.status)
    payload.append('notes', formData.notes)
    if (selectedFile) {
      payload.append('file', selectedFile)
    }

    try {
      await createMutation.mutateAsync(payload)
      resetForm()
      setIsAddDialogOpen(false)
    } catch (_) {}
  }

  const handleEditTest = (test: DNATestItem) => {
    setEditingTest(test)
    setFormData({
      memberId: test.memberId,
      testDate: test.testDate || new Date().toISOString().split('T')[0],
      reportName: test.reportName || 'DNA Analysis Report',
      status: test.status,
      notes: test.notes || '',
    })
    setSelectedFile(null)
    setIsAddDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingTest) return

    const payload = new FormData()
    payload.append('memberId', formData.memberId)
    payload.append('testDate', formData.testDate)
    payload.append('reportName', formData.reportName)
    payload.append('status', formData.status)
    payload.append('notes', formData.notes)
    if (selectedFile) {
      payload.append('file', selectedFile)
    }

    try {
      await updateMutation.mutateAsync({
        id: editingTest.id,
        payload,
      })
      resetForm()
      setIsAddDialogOpen(false)
    } catch (_) {}
  }

  // State machine: not-started → in-progress → completed
  const handleAdvanceStatus = async (test: DNATestItem) => {
    const next = getNextStatus(test.status)
    if (!next) return

    await updateMutation.mutateAsync({
      id: test.id,
      payload: { status: next },
    })
  }

  const handleDeleteTest = async (id: string) => {
    if (confirm('Are you sure you want to delete this DNA test record?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not-started':
        return 'bg-gray-100 text-gray-800'
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getNextStatus = (status: string): 'in-progress' | 'completed' | null => {
    if (status === 'not-started') return 'in-progress'
    if (status === 'in-progress') return 'completed'
    return null
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">DNA Testing</h2>
          <p className="text-muted-foreground">Manage DNA test requests, manual report uploads, and lab statuses</p>
        </div>
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTest(null)}>
              <IconPlus className="w-4 h-4 mr-2" />
              New DNA Test
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTest ? 'Edit DNA Test' : 'Create New DNA Test'}</DialogTitle>
              <DialogDescription>
                {editingTest
                  ? 'Update test details or upload lab report PDF'
                  : 'Select a member by name/phone, set test date, or upload report'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Select Member</label>
                <MemberSearchSelect
                  value={formData.memberId}
                  onChange={(id) => setFormData({ ...formData, memberId: id })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Report Title</label>
                <Input
                  value={formData.reportName}
                  onChange={(e) => setFormData({ ...formData, reportName: e.target.value })}
                  placeholder="e.g., DNA Methylation Panel"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Test Date</label>
                  <Input
                    type="date"
                    value={formData.testDate}
                    onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Upload Lab Report (PDF)</label>
                <div className="border border-dashed rounded-lg p-3 text-center hover:bg-muted/30 transition-colors">
                  <input
                    type="file"
                    id="dna-file-upload"
                    accept=".pdf,application/pdf,image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="dna-file-upload" className="cursor-pointer block">
                    <IconUpload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                    {selectedFile ? (
                      <p className="text-xs font-semibold text-primary truncate max-w-xs mx-auto">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </p>
                    ) : editingTest?.downloadUrl ? (
                      <p className="text-xs text-muted-foreground">
                        Report already attached. Click to replace file.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Click to attach member lab PDF report
                      </p>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Notes / Observations</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Lab notes, clinician insights..."
                  className="w-full px-3 py-2 border rounded-md h-20 resize-none text-sm bg-background"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-md text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-300">Workflow Progression:</p>
                <p className="text-blue-800 dark:text-blue-200 text-xs mt-0.5">
                  Not Started → In Progress (Sample Collected) → Completed (Report Attached)
                </p>
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingTest ? handleSaveEdit : handleAddTest}
                  disabled={!formData.memberId || createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingTest
                    ? 'Save Changes'
                    : 'Create Test'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* DNA Test State Machine Info */}
      <Card className="bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-blue-900 dark:text-blue-300 text-base">DNA Test Lifecycle</CardTitle>
          <CardDescription className="text-blue-800 dark:text-blue-400 text-xs">
            Tests progress from collection to lab processing and clinical signoff. Completed tests automatically synchronize to the member&apos;s app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-start gap-2 text-sm">
            <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>
            <IconArrowRight className="w-4 h-4 text-muted-foreground" />
            <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
            <IconArrowRight className="w-4 h-4 text-muted-foreground" />
            <Badge className="bg-green-100 text-green-800">Completed</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by member name, phone, notes, or test ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="">All Statuses</option>
          <option value="not-started">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* DNA Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>All DNA Tests</CardTitle>
          <CardDescription>
            Total: {tests.length} tests on record
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Loading DNA tests...</div>
          ) : tests.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No DNA tests found. Click &quot;New DNA Test&quot; above to request a test or upload a report.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Test Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Report File</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => {
                    const memberName = test.member?.username || 'Member'
                    const memberPhone = test.member?.phone || test.member?.email || test.memberId

                    return (
                      <TableRow key={test.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{memberName}</p>
                            <p className="text-xs text-muted-foreground">{memberPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{test.reportName}</TableCell>
                        <TableCell className="text-sm">{test.testDate || '—'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(test.status)}>
                            {test.status.replace('-', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {test.downloadUrl ? (
                            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 border-emerald-300 bg-emerald-50/50">
                              <a href={test.downloadUrl} target="_blank" rel="noopener noreferrer">
                                <IconDownload className="w-3.5 h-3.5" />
                                View / Download PDF
                              </a>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 text-xs text-amber-600 hover:text-amber-700 border-amber-300 bg-amber-50/40"
                              onClick={() => handleEditTest(test)}
                              title="Click to attach member lab PDF report"
                            >
                              <IconUpload className="w-3.5 h-3.5" />
                              Attach Lab PDF
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                          {test.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {getNextStatus(test.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-blue-600 hover:text-blue-700"
                                onClick={() => handleAdvanceStatus(test)}
                                title={`Advance to ${getNextStatus(test.status)}`}
                                disabled={updateMutation.isPending}
                              >
                                <IconArrowRight className="w-4 h-4 mr-1" />
                                {getNextStatus(test.status) === 'completed' ? 'Complete' : 'Start'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditTest(test)}
                              title="Edit test / upload PDF"
                            >
                              <IconEdit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteTest(test.id)}
                              title="Delete test"
                              disabled={deleteMutation.isPending}
                            >
                              <IconTrash className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
