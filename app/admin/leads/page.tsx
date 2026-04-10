'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { IconPlus, IconEdit, IconTrash, IconCheck, IconGripVertical } from '@tabler/icons-react'
import {
  useConvertLead,
  useCreateLead,
  useDeleteLead,
  useLeads,
  useUpdateLead,
} from '@/hooks/use-leads'
import { Lead, LeadStatus, LeadTemperature } from '@/lib/services/lead.service'
import KanbanColumn from './kanban-column'
import KanbanCard from './kanban-card'

export default function LeadsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)

  const {
    data: leads = [],
    isLoading,
    isError,
    refetch,
  } = useLeads()
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()
  const deleteLead = useDeleteLead()
  const convertLead = useConvertLead()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Website',
    status: 'new' as LeadStatus,
    temperature: 'cold' as LeadTemperature,
    notes: '',
    interestedIn: '',
    followUpDate: '',
  })
  const [convertFormData, setConvertFormData] = useState({
    username: '',
    phone: '',
    age: '30',
    gender: '0',
    healthGoals: '',
    password: 'Lead@12345',
  })

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch =
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = !filterStatus || l.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [leads, searchTerm, filterStatus])

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  const followUpsToday = useMemo(
    () => filteredLeads.filter((lead) => lead.followUpDate === today),
    [filteredLeads, today]
  )

  const scheduledCalls = useMemo(
    () => filteredLeads.filter((lead) => lead.followUpDate && lead.followUpDate > today),
    [filteredLeads, today]
  )

  const analytics = useMemo(() => {
    const total = filteredLeads.length || 1
    const converted = filteredLeads.filter((l) => l.status === 'converted').length
    const hot = filteredLeads.filter((l) => l.temperature === 'hot').length
    const warm = filteredLeads.filter((l) => l.temperature === 'warm').length
    const cold = filteredLeads.filter((l) => l.temperature === 'cold').length
    const conversionRate = Math.round((converted / total) * 100)

    const sourceCounts: Record<string, number> = {}
    filteredLeads.forEach((lead) => {
      const key = (lead.source || 'other').toLowerCase()
      sourceCounts[key] = (sourceCounts[key] || 0) + 1
    })

    return { converted, hot, warm, cold, conversionRate, sourceCounts }
  }, [filteredLeads])

  const handleAddLead = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required')
      return
    }

    if (editingLead) {
      await updateLead.mutateAsync({
        id: editingLead.id,
        payload: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          source: formData.source.trim(),
          status: formData.status,
          temperature: formData.temperature,
          tags: editingLead.tags,
          notes: formData.notes.trim(),
          interestedIn: formData.interestedIn.trim(),
          followUpDate: formData.followUpDate ? new Date(formData.followUpDate).toISOString() : undefined,
        },
      })
      setEditingLead(null)
    } else {
      await createLead.mutateAsync({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        source: formData.source.trim(),
        temperature: formData.temperature,
        notes: formData.notes.trim(),
        interestedIn: formData.interestedIn.trim(),
        followUpDate: formData.followUpDate ? new Date(formData.followUpDate).toISOString() : undefined,
      })
    }

    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead)
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      temperature: lead.temperature,
      notes: lead.notes,
      interestedIn: lead.interestedIn,
      followUpDate: lead.followUpDate || '',
    })
    setIsAddDialogOpen(true)
  }

  const handleConvertLead = (lead: Lead) => {
    setConvertingLead(lead)
    setConvertFormData({
      username: lead.name,
      phone: lead.phone || '',
      age: '30',
      gender: '0',
      healthGoals: lead.interestedIn || 'general fitness',
      password: 'Lead@12345',
    })
    setIsConvertDialogOpen(true)
  }

  const handleConfirmConvert = async () => {
    if (convertingLead) {
      if (!convertFormData.phone.trim() || !convertFormData.password.trim()) {
        toast.error('Phone and password are required for conversion')
        return
      }

      await convertLead.mutateAsync({
        id: convertingLead.id,
        payload: {
          username: convertFormData.username.trim() || convertingLead.name,
          phone: convertFormData.phone.trim(),
          age: convertFormData.age.trim() || '30',
          gender: Number.parseInt(convertFormData.gender, 10) || 0,
          healthGoals: convertFormData.healthGoals
            .split(',')
            .map((goal) => goal.trim())
            .filter(Boolean),
          password: convertFormData.password,
        },
      })
      setConvertingLead(null)
      setIsConvertDialogOpen(false)
    }
  }

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const lead = leads.find((item) => item.id === leadId)
    await updateLead.mutateAsync({
      id: leadId,
      payload: {
        status: newStatus,
        ...(lead ? { tags: lead.tags } : {}),
      },
    })
  }

  const statusByTemperature: Record<LeadTemperature, LeadStatus> = {
    cold: 'new',
    warm: 'contacted',
    hot: 'qualified',
  }

  const moveLeadToTemperature = async (lead: Lead, temperature: LeadTemperature) => {
    await updateLead.mutateAsync({
      id: lead.id,
      payload: {
        temperature,
        status: statusByTemperature[temperature],
        tags: lead.tags,
      },
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedLead(null)

    if (!over) return

    const leadId = active.id as string
    const targetColumn = over.id as string
    const lead = leads.find((l) => l.id === leadId)

    if (!lead) return

    // Map target column to temperature
    const temperatureMap: Record<string, LeadTemperature> = {
      'column-cold': 'cold',
      'column-warm': 'warm',
      'column-hot': 'hot',
    }

    const newTemperature = temperatureMap[targetColumn]
    if (newTemperature && newTemperature !== lead.temperature) {
      await moveLeadToTemperature(lead, newTemperature)
    }
  }

  const handleDeleteLead = (id: string) => {
    deleteLead.mutate(id)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      source: 'Website',
      status: 'new',
      temperature: 'cold',
      notes: '',
      interestedIn: '',
      followUpDate: '',
    })
  }

  const isPending =
    createLead.isPending ||
    updateLead.isPending ||
    deleteLead.isPending ||
    convertLead.isPending

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
      case 'Website':
        return 'bg-blue-100 text-blue-800'
      case 'referral':
      case 'Referral':
        return 'bg-green-100 text-green-800'
      case 'social-media':
      case 'Social Media':
        return 'bg-pink-100 text-pink-800'
      case 'direct':
      case 'Direct':
        return 'bg-orange-100 text-orange-800'
      case 'other':
      case 'Other':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTemperatureColor = (temperature: LeadTemperature) => {
    if (temperature === 'cold') return 'bg-sky-100 text-sky-800'
    if (temperature === 'warm') return 'bg-amber-100 text-amber-800'
    return 'bg-red-100 text-red-800'
  }

  const kanbanData = useMemo(() => {
    return {
      cold: filteredLeads.filter((lead) => lead.status !== 'converted' && lead.temperature === 'cold'),
      warm: filteredLeads.filter((lead) => lead.status !== 'converted' && lead.temperature === 'warm'),
      hot: filteredLeads.filter((lead) => lead.status !== 'converted' && lead.temperature === 'hot'),
      converted: filteredLeads.filter((lead) => lead.status === 'converted'),
    }
  }, [filteredLeads])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">Manage sales leads and conversions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
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
                  <label className="text-sm font-medium">Interested In</label>
                  <Input
                    value={formData.interestedIn}
                    onChange={(e) => setFormData({ ...formData, interestedIn: e.target.value })}
                    placeholder="Premium Membership"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Direct">Direct</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {editingLead && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Heat</label>
                      <select
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: e.target.value as LeadTemperature })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="cold">Cold</option>
                        <option value="warm">Warm</option>
                        <option value="hot">Hot</option>
                      </select>
                    </div>
                  </div>
                )}
                {!editingLead && (
                  <div>
                    <label className="text-sm font-medium">Heat</label>
                    <select
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: e.target.value as LeadTemperature })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="cold">Cold</option>
                      <option value="warm">Warm</option>
                      <option value="hot">Hot</option>
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
                <div>
                  <label className="text-sm font-medium">Follow Up Date</label>
                  <Input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    placeholder="Select follow up date"
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
                  <Button onClick={handleAddLead} disabled={isPending}>
                    {isPending ? 'Saving...' : editingLead ? 'Save Changes' : 'Add Lead'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="board" className="space-y-4">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-4">
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

          {/* Kanban Board */}
          <DndContext
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
            onDragStart={(event) => {
              const leadId = event.active.id as string
              const lead = leads.find((l) => l.id === leadId)
              setDraggedLead(lead || null)
            }}
          >
            <div className="grid gap-4 lg:grid-cols-4">
              <KanbanColumn
                id="column-cold"
                title="Cold"
                count={kanbanData.cold.length}
                leadColor="bg-sky-50 border-sky-200"
                headerColor="text-sky-700"
              >
                {kanbanData.cold.map((lead) => (
                  <KanbanCard
                    key={`cold-${lead.id}`}
                    lead={lead}
                    onConvert={() => handleConvertLead(lead)}
                    onEdit={() => handleEditLead(lead)}
                    isPending={isPending}
                    source={lead.source}
                  />
                ))}
              </KanbanColumn>

              <KanbanColumn
                id="column-warm"
                title="Warm"
                count={kanbanData.warm.length}
                leadColor="bg-amber-50 border-amber-200"
                headerColor="text-amber-700"
              >
                {kanbanData.warm.map((lead) => (
                  <KanbanCard
                    key={`warm-${lead.id}`}
                    lead={lead}
                    onConvert={() => handleConvertLead(lead)}
                    onEdit={() => handleEditLead(lead)}
                    isPending={isPending}
                    source={lead.source}
                  />
                ))}
              </KanbanColumn>

              <KanbanColumn
                id="column-hot"
                title="Hot"
                count={kanbanData.hot.length}
                leadColor="bg-red-50 border-red-200"
                headerColor="text-red-700"
              >
                {kanbanData.hot.map((lead) => (
                  <KanbanCard
                    key={`hot-${lead.id}`}
                    lead={lead}
                    onConvert={() => handleConvertLead(lead)}
                    onEdit={() => handleEditLead(lead)}
                    isPending={isPending}
                    source={lead.source}
                  />
                ))}
              </KanbanColumn>

              <KanbanColumn
                id="column-converted"
                title="Converted"
                count={kanbanData.converted.length}
                leadColor="bg-green-50 border-green-200"
                headerColor="text-green-700"
                isDragDisabled
              >
                {kanbanData.converted.map((lead) => (
                  <KanbanCard
                    key={`converted-${lead.id}`}
                    lead={lead}
                    onConvert={() => handleConvertLead(lead)}
                    onEdit={() => handleEditLead(lead)}
                    isPending={isPending}
                    source={lead.source}
                    isDragDisabled
                  />
                ))}
              </KanbanColumn>
            </div>

            <DragOverlay>
              {draggedLead ? (
                <div className="cursor-grabbing rounded-md border-2 border-blue-500 bg-white p-3 shadow-lg space-y-2 opacity-90">
                  <div className="font-medium text-sm">{draggedLead.name}</div>
                  <div className="text-xs text-muted-foreground">{draggedLead.email}</div>
                  <div className="flex gap-1">
                    <Badge className={getTemperatureColor(draggedLead.temperature)}>
                      {draggedLead.temperature}
                    </Badge>
                    <Badge className={getStatusColor(draggedLead.status)}>
                      {draggedLead.status}
                    </Badge>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Leads</CardTitle>
              <CardDescription>Total: {filteredLeads.length} leads</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="space-y-2 pb-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}
              {isError && (
                <p className="pb-4 text-sm text-red-600">Failed to load leads from API. Check auth credentials and backend status.</p>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Heat</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Follow Up</TableHead>
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
                          <Badge className={getTemperatureColor(lead.temperature)}>{lead.temperature}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{lead.createdAt}</TableCell>
                        <TableCell>{lead.followUpDate || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {lead.status !== 'converted' && lead.status !== 'lost' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-yellow-600"
                                onClick={() => handleStatusChange(lead.id, 'contacted')}
                                disabled={isPending}
                              >
                                C
                              </Button>
                            )}
                            {lead.status !== 'qualified' && lead.status !== 'converted' && lead.status !== 'lost' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-indigo-600"
                                onClick={() => handleStatusChange(lead.id, 'qualified')}
                                disabled={isPending}
                              >
                                Q
                              </Button>
                            )}
                            {lead.status !== 'converted' && lead.status !== 'lost' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                                onClick={() => handleConvertLead(lead)}
                                disabled={isPending}
                              >
                                <IconCheck className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditLead(lead)}
                              disabled={isPending}
                            >
                              <IconEdit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteLead(lead.id)}
                              disabled={isPending}
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
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Follow Ups</CardTitle>
              <CardDescription>{followUpsToday.length || 0} due today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {followUpsToday.length === 0 && (
                <p className="text-sm text-muted-foreground">No follow ups scheduled for today.</p>
              )}
              {followUpsToday.map((lead) => (
                <div key={`today-${lead.id}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getTemperatureColor(lead.temperature)}>{lead.temperature}</Badge>
                      <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditLead(lead)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => handleConvertLead(lead)}>
                      Convert
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scheduled Calls</CardTitle>
              <CardDescription>{scheduledCalls.length || 0} upcoming</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {scheduledCalls.length === 0 && (
                <p className="text-sm text-muted-foreground">No upcoming scheduled calls.</p>
              )}
              {scheduledCalls.map((lead) => (
                <div key={`upcoming-${lead.id}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                      <div className="text-xs text-muted-foreground">Follow up: {lead.followUpDate}</div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getTemperatureColor(lead.temperature)}>{lead.temperature}</Badge>
                      <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditLead(lead)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => handleConvertLead(lead)}>
                      Convert
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Converted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.converted}</div>
                <p className="text-xs text-muted-foreground">Total converted leads</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.conversionRate}%</div>
                <p className="text-xs text-muted-foreground">Converted / total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.hot}</div>
                <p className="text-xs text-muted-foreground">Ready to close</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Warm Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.warm}</div>
                <p className="text-xs text-muted-foreground">Keep nurturing</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lead Sources</CardTitle>
              <CardDescription>Breakdown by source</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.keys(analytics.sourceCounts).length === 0 && (
                <p className="text-sm text-muted-foreground">No leads to analyze yet.</p>
              )}
              {Object.entries(analytics.sourceCounts).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <Badge className={getSourceColor(source)}>{source.replace('-', ' ')}</Badge>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                    <div>
                      <label className="text-sm font-medium">Username</label>
                      <Input
                        value={convertFormData.username}
                        onChange={(e) => setConvertFormData({ ...convertFormData, username: e.target.value })}
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={convertFormData.phone}
                        onChange={(e) => setConvertFormData({ ...convertFormData, phone: e.target.value })}
                        placeholder="+1234567890"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium">Age</label>
                        <Input
                          value={convertFormData.age}
                          onChange={(e) => setConvertFormData({ ...convertFormData, age: e.target.value })}
                          placeholder="30"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Gender</label>
                        <select
                          value={convertFormData.gender}
                          onChange={(e) => setConvertFormData({ ...convertFormData, gender: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="0">Male (0)</option>
                          <option value="1">Female (1)</option>
                          <option value="2">Other (2)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Health Goals (comma separated)</label>
                      <Input
                        value={convertFormData.healthGoals}
                        onChange={(e) => setConvertFormData({ ...convertFormData, healthGoals: e.target.value })}
                        placeholder="weight loss, strength"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Temporary Password</label>
                      <Input
                        value={convertFormData.password}
                        onChange={(e) => setConvertFormData({ ...convertFormData, password: e.target.value })}
                        type="password"
                        placeholder="Temporary password"
                      />
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
                      <Button onClick={handleConfirmConvert} disabled={isPending}>
                        {isPending ? 'Converting...' : 'Convert to Member'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
    </div>
  )
}
