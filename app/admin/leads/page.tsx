'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mockLeads, Lead } from '@/lib/mock-data'
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
import { IconPlus, IconEdit, IconTrash, IconCheck } from '@tabler/icons-react'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'website' as const,
    status: 'new' as const,
    notes: '',
  })

  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || l.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleAddLead = () => {
    if (formData.name && formData.email) {
      if (editingLead) {
        setLeads(leads.map(l =>
          l.id === editingLead.id
            ? {
              ...l,
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              source: formData.source,
              status: formData.status,
              notes: formData.notes,
            }
            : l
        ))
        setEditingLead(null)
      } else {
        const newLead: Lead = {
          id: `l${leads.length + 1}`,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          source: formData.source,
          status: 'new',
          createdAt: new Date().toISOString().split('T')[0],
          notes: formData.notes,
        }
        setLeads([...leads, newLead])
      }
      resetForm()
      setIsAddDialogOpen(false)
    }
  }

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead)
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      notes: lead.notes,
    })
    setIsAddDialogOpen(true)
  }

  const handleConvertLead = (lead: Lead) => {
    setConvertingLead(lead)
    setIsConvertDialogOpen(true)
  }

  const handleConfirmConvert = () => {
    if (convertingLead) {
      setLeads(leads.map(l =>
        l.id === convertingLead.id
          ? { ...l, status: 'converted' }
          : l
      ))
      setConvertingLead(null)
      setIsConvertDialogOpen(false)
    }
  }

  const handleStatusChange = (leadId: string, newStatus: Lead['status']) => {
    setLeads(leads.map(l =>
      l.id === leadId ? { ...l, status: newStatus } : l
    ))
  }

  const handleDeleteLead = (id: string) => {
    setLeads(leads.filter(l => l.id !== id))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      source: 'website',
      status: 'new',
      notes: '',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800'
      case 'qualified':
        return 'bg-purple-100 text-purple-800'
      case 'converted':
        return 'bg-green-100 text-green-800'
      case 'lost':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'website':
        return 'bg-blue-100 text-blue-800'
      case 'referral':
        return 'bg-green-100 text-green-800'
      case 'social-media':
        return 'bg-pink-100 text-pink-800'
      case 'direct':
        return 'bg-orange-100 text-orange-800'
      case 'other':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
                <p className="text-muted-foreground">Manage sales leads and conversions</p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingLead(null)}>
                    <IconPlus className="w-4 h-4 mr-2" />
                    Add Lead
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
                    <DialogDescription>
                      {editingLead ? 'Update lead information' : 'Create a new sales lead'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Email address"
                        type="email"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Source</label>
                      <select
                        value={formData.source}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="website">Website</option>
                        <option value="referral">Referral</option>
                        <option value="social-media">Social Media</option>
                        <option value="direct">Direct</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    {editingLead && (
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="qualified">Qualified</option>
                          <option value="converted">Converted</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Lead notes..."
                        className="w-full px-3 py-2 border rounded-md h-16 resize-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false)
                          setEditingLead(null)
                          resetForm()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddLead}>
                        {editingLead ? 'Save Changes' : 'Add Lead'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Lead Funnel Stats */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leads.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leads.filter(l => l.status === 'new').length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contacted</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leads.filter(l => l.status === 'contacted').length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Qualified</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leads.filter(l => l.status === 'qualified').length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Converted</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leads.filter(l => l.status === 'converted').length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name or email..."
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
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {/* Leads Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Leads</CardTitle>
                <CardDescription>Total: {filteredLeads.length} leads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>{lead.email}</TableCell>
                          <TableCell>{lead.phone}</TableCell>
                          <TableCell>
                            <Badge className={getSourceColor(lead.source)}>
                              {lead.source.replace('-', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(lead.status)}>
                              {lead.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{lead.createdAt}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {lead.status !== 'converted' && lead.status !== 'lost' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600"
                                  onClick={() => handleConvertLead(lead)}
                                >
                                  <IconCheck className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditLead(lead)}
                              >
                                <IconEdit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteLead(lead.id)}
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

            {/* Convert Lead Dialog */}
            {convertingLead && (
              <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convert Lead to Member</DialogTitle>
                    <DialogDescription>
                      Convert {convertingLead.name} from lead to member
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-green-900">Lead Information:</p>
                      <p className="text-sm text-green-800 mt-1">Name: {convertingLead.name}</p>
                      <p className="text-sm text-green-800">Email: {convertingLead.email}</p>
                      <p className="text-sm text-green-800">Phone: {convertingLead.phone}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This will create a new member profile and mark this lead as converted. You can then assign a membership plan.
                    </p>
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsConvertDialogOpen(false)
                          setConvertingLead(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleConfirmConvert}>Convert to Member</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
    </div>
  )
}
