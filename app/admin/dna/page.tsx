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
import { IconPlus, IconEdit, IconTrash, IconArrowRight } from '@tabler/icons-react'

type DNATest = {
  id: string
  memberId: string
  testDate: string
  status: 'not-started' | 'in-progress' | 'completed'
  notes: string
}

export default function DNATestingPage() {
  const [tests, setTests] = useState<DNATest[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTest, setEditingTest] = useState<DNATest | null>(null)
  const [formData, setFormData] = useState({
    memberId: '',
    testDate: '',
    notes: '',
  })

  const filteredTests = tests.filter(t => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.memberId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || t.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleAddTest = () => {
    if (formData.memberId && formData.testDate) {
      const newTest: DNATest = {
        id: `d${tests.length + 1}`,
        memberId: formData.memberId,
        testDate: formData.testDate,
        status: 'not-started',
        notes: formData.notes,
      }
      setTests([...tests, newTest])
      resetForm()
      setIsAddDialogOpen(false)
    }
  }

  const handleEditTest = (test: DNATest) => {
    setEditingTest(test)
    setFormData({
      memberId: test.memberId,
      testDate: test.testDate,
      notes: test.notes,
    })
    setIsAddDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (editingTest && formData.memberId && formData.testDate) {
      setTests(tests.map(t =>
        t.id === editingTest.id
          ? {
            ...t,
            memberId: formData.memberId,
            testDate: formData.testDate,
            notes: formData.notes,
          }
          : t
      ))
      setEditingTest(null)
      resetForm()
      setIsAddDialogOpen(false)
    }
  }

  // State machine: not-started → in-progress → completed
  const handleAdvanceStatus = (testId: string) => {
    setTests(tests.map(t => {
      if (t.id === testId) {
        if (t.status === 'not-started') {
          return { ...t, status: 'in-progress' }
        } else if (t.status === 'in-progress') {
          return { ...t, status: 'completed' }
        }
      }
      return t
    }))
  }

  const handleDeleteTest = (id: string) => {
    setTests(tests.filter(t => t.id !== id))
  }

  const resetForm = () => {
    setFormData({
      memberId: '',
      testDate: '',
      notes: '',
    })
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

  const getNextStatus = (status: string) => {
    if (status === 'not-started') return 'in-progress'
    if (status === 'in-progress') return 'completed'
    return null
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">DNA Testing</h2>
                <p className="text-muted-foreground">Manage DNA test requests and results</p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingTest(null)}>
                    <IconPlus className="w-4 h-4 mr-2" />
                    New DNA Test
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingTest ? 'Edit DNA Test' : 'Create New DNA Test'}</DialogTitle>
                    <DialogDescription>
                      {editingTest ? 'Update test details' : 'Request a new DNA test for a member'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Member ID</label>
                      <Input
                        value={formData.memberId}
                        onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                        placeholder="member123"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Test Date</label>
                      <Input
                        type="date"
                        value={formData.testDate}
                        onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Test notes..."
                        className="w-full px-3 py-2 border rounded-md h-20 resize-none"
                      />
                    </div>
                    <div className="bg-blue-50 p-3 rounded-md text-sm">
                      <p className="font-medium text-blue-900">State Machine:</p>
                      <p className="text-blue-800">Not Started → In Progress → Completed</p>
                      <p className="text-blue-700 text-xs mt-1">Tests follow a linear progression and cannot skip steps.</p>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false)
                          setEditingTest(null)
                          resetForm()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={editingTest ? handleSaveEdit : handleAddTest}>
                        {editingTest ? 'Save Changes' : 'Create Test'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* DNA Test State Machine Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">DNA Test Workflow</CardTitle>
                <CardDescription className="text-blue-800">
                  Tests progress through a defined state machine workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-start gap-2 text-sm">
                  <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>
                  <IconArrowRight className="w-4 h-4" />
                  <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
                  <IconArrowRight className="w-4 h-4" />
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by test ID or member..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="">All Status</option>
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* DNA Tests Table */}
            <Card>
              <CardHeader>
                <CardTitle>All DNA Tests</CardTitle>
                <CardDescription>Total: {filteredTests.length} tests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test ID</TableHead>
                        <TableHead>Member ID</TableHead>
                        <TableHead>Test Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTests.map((test) => (
                        <TableRow key={test.id}>
                          <TableCell className="font-medium">{test.id}</TableCell>
                          <TableCell>{test.memberId}</TableCell>
                          <TableCell>{test.testDate}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(test.status)}>
                              {test.status.replace('-', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{test.notes}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {getNextStatus(test.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600"
                                  onClick={() => handleAdvanceStatus(test.id)}
                                  title={`Advance to ${getNextStatus(test.status)}`}
                                >
                                  <IconArrowRight className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditTest(test)}
                              >
                                <IconEdit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteTest(test.id)}
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
