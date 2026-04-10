'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core'
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
import { IconPlus, IconEdit, IconTrash, IconCheck } from '@tabler/icons-react'
import {
  useAddLeadInteraction,
  useConvertLead,
  useCreateLead,
  useDeleteLead,
  useLeadAnalytics,
  useLeadDigest,
  useLeadReminders,
  useLeads,
  useRecordLeadContactAttempt,
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
  const { data: reminderSummary } = useLeadReminders()
  const { data: leadAnalytics } = useLeadAnalytics()
  const { data: leadDigest } = useLeadDigest()
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()
  const deleteLead = useDeleteLead()
  const convertLead = useConvertLead()
  const addInteraction = useAddLeadInteraction()
  const contactAttempt = useRecordLeadContactAttempt()

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
    assignedStaffName: '',
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
        l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.phone.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = !filterStatus || l.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [leads, searchTerm, filterStatus])

  const statusToHeat: Record<LeadStatus, LeadTemperature> = {
    new: 'cold',
    contacted: 'warm',
    qualified: 'hot',
    converted: 'hot',
    lost: 'cold',
  }

  const todayFollowUps = reminderSummary?.today || []
  const missedFollowUps = reminderSummary?.missed || []

  const scheduledCalls = useMemo(
    () => filteredLeads.filter((lead) => lead.followUpDate && !todayFollowUps.some((item) => item.id === lead.id)),
    [filteredLeads, todayFollowUps]
  )

  const analytics = useMemo(() => {
    const sourceCounts: Record<string, number> = {}
    filteredLeads.forEach((lead) => {
      const key = (lead.source || 'other').toLowerCase()
      sourceCounts[key] = (sourceCounts[key] || 0) + 1
    })

    const converted = leadAnalytics?.stageCounts?.converted || 0
    const total = filteredLeads.length || 1
    const conversionRate = Math.round((converted / total) * 100)

    return {
      converted,
      hot: leadAnalytics?.heatDistribution?.hot || 0,
      warm: leadAnalytics?.heatDistribution?.warm || 0,
      cold: leadAnalytics?.heatDistribution?.cold || 0,
      conversionRate,
      sourceCounts,
    }
  }, [filteredLeads, leadAnalytics])

  const handleAddLead = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required')
      return
    }

    const normalizedPhone = formData.phone.replace(/\D/g, '')
    if (!editingLead && normalizedPhone) {
      const duplicate = leads.find((lead) => lead.phone.replace(/\D/g, '') === normalizedPhone)
      if (duplicate) {
        toast.error(`Duplicate phone detected: already used by ${duplicate.name}`)
        return
      }
    }

    const mappedHeat = statusToHeat[formData.status]

    if (editingLead) {
      await updateLead.mutateAsync({
        id: editingLead.id,
        payload: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          source: formData.source.trim(),
          status: formData.status,
          temperature: mappedHeat,
          tags: editingLead.tags,
          notes: formData.notes.trim(),
          interestedIn: formData.interestedIn.trim(),
          assignedStaffName: formData.assignedStaffName.trim(),
          followUpDate: formData.followUpDate ? new Date(formData.followUpDate).toISOString() : undefined,
          expectedRevision: editingLead.revision,
        },
      })
      setEditingLead(null)
    } else {
      await createLead.mutateAsync({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        source: formData.source.trim(),
        status: formData.status,
        temperature: mappedHeat,
        notes: formData.notes.trim(),
        interestedIn: formData.interestedIn.trim(),
        assignedStaffName: formData.assignedStaffName.trim(),
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
      followUpDate: lead.followUpDate ? String(lead.followUpDate).split('T')[0] : '',
      assignedStaffName: lead.assignedStaffName || '',
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
    if (!lead) return

    const isValidForwardMove = (() => {
      const order: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted']
      const from = order.indexOf(lead.status)
      const to = order.indexOf(newStatus)
      if (lead.status === 'lost' || newStatus === 'lost') return true
      if (from < 0 || to < 0) return false
      return to === from + 1 || to === from
    })()

    if (!isValidForwardMove) {
      toast.error('You cannot skip stages. Follow new -> contacted -> qualified -> converted.')
      return
    }

    await updateLead.mutateAsync({
      id: leadId,
      payload: {
        status: newStatus,
        temperature: statusToHeat[newStatus],
        tags: lead.tags,
        expectedRevision: lead.revision,
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

    // Map target column to status and enforce no stage skipping.
    const stageMap: Record<string, LeadStatus> = {
      'column-new': 'new',
      'column-contacted': 'contacted',
      'column-qualified': 'qualified',
      'column-converted': 'converted',
    }

    const nextStage = stageMap[targetColumn]
    if (!nextStage || nextStage === lead.status) return

    const order: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted']
    const from = order.indexOf(lead.status)
    const to = order.indexOf(nextStage)
    if (from < 0 || to < 0 || to !== from + 1) {
      toast.error('Cannot skip stages. Move one step at a time.')
      return
    }

    await handleStatusChange(lead.id, nextStage)
  }

  const handleDeleteLead = (id: string) => {
    deleteLead.mutate(id)
  }

  const handleQuickCall = async (lead: Lead) => {
    if (!lead.phone) {
      toast.error('Phone number is missing for this lead')
      return
    }

    await contactAttempt.mutateAsync({ id: lead.id, channel: 'call' })
    if (typeof window !== 'undefined') {
      window.open(`tel:${lead.phone}`, '_self')
    }
  }

  const handleQuickWhatsApp = async (lead: Lead) => {
    if (!lead.phone) {
      toast.error('Phone number is missing for this lead')
      return
    }

    await contactAttempt.mutateAsync({ id: lead.id, channel: 'whatsapp' })
    if (typeof window !== 'undefined') {
      const digits = lead.phone.replace(/\D/g, '')
      window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer')
    }
  }

  const handleQuickAddNote = async (lead: Lead) => {
    const note = typeof window !== 'undefined' ? window.prompt(`Add a note for ${lead.name}`) : ''
    if (!note || !note.trim()) return
    await addInteraction.mutateAsync({ id: lead.id, note: note.trim(), type: 'note' })
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
      assignedStaffName: '',
    })
  }

  const isPending =
    createLead.isPending ||
    updateLead.isPending ||
    deleteLead.isPending ||
    convertLead.isPending ||
    addInteraction.isPending ||
    contactAttempt.isPending

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

  const getLeadAgeDays = (createdAt: string) => {
    const created = new Date(createdAt)
    if (Number.isNaN(created.getTime())) return 0
    const ms = Date.now() - created.getTime()
    return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
  }

  const formatDateOnly = (value?: string) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) {
      return value.split('T')[0] || value
    }
    return d.toISOString().slice(0, 10)
  }

  const isFollowUpToday = (lead: Lead) => todayFollowUps.some((item) => item.id === lead.id)

  const kanbanData = useMemo(() => {
    const active = filteredLeads.filter((lead) => lead.status !== 'lost')
    return {
      new: active.filter((lead) => lead.status === 'new'),
      contacted: active.filter((lead) => lead.status === 'contacted'),
      qualified: active.filter((lead) => lead.status === 'qualified'),
      converted: active.filter((lead) => lead.status === 'converted'),
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
                  {!!formData.phone.trim() &&
                    leads.some((lead) => lead.phone.replace(/\D/g, '') === formData.phone.replace(/\D/g, '')) && (
                      <p className="mt-1 text-xs text-red-600">Duplicate phone detected in existing leads</p>
                    )}
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
                  <label className="text-sm font-medium">Assigned Staff</label>
                  <Input
                    value={formData.assignedStaffName}
                    onChange={(e) => setFormData({ ...formData, assignedStaffName: e.target.value })}
                    placeholder="Staff member name"
                  />
                </div>
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    Heat is auto-mapped from status: new = cold, contacted = warm, qualified/converted = hot.
                  </p>
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
                id="column-new"
                title="New"
                count={kanbanData.new.length}
                leadColor="bg-sky-50 border-sky-200"
                headerColor="text-sky-700"
              >
                {kanbanData.new.map((lead) => (
                  <KanbanCard
                    key={`new-${lead.id}`}
                    lead={lead}
                    onConvert={() => handleConvertLead(lead)}
                    onEdit={() => handleEditLead(lead)}
                    onCall={() => handleQuickCall(lead)}
                    onWhatsApp={() => handleQuickWhatsApp(lead)}
                    onAddNote={() => handleQuickAddNote(lead)}
                    isPending={isPending}
                    source={lead.source}
                    isFollowUpToday={isFollowUpToday(lead)}
                    leadAgeDays={getLeadAgeDays(lead.createdAt)}
                  />
                ))}
              </KanbanColumn>

              <KanbanColumn
                id="column-contacted"
                title="Contacted"
                count={kanbanData.contacted.length}
                leadColor="bg-amber-50 border-amber-200"
                headerColor="text-amber-700"
              >
                {kanbanData.contacted.map((lead) => (
                  <KanbanCard
                    key={`contacted-${lead.id}`}
                    lead={lead}
                    onConvert={() => handleConvertLead(lead)}
                    onEdit={() => handleEditLead(lead)}
                    onCall={() => handleQuickCall(lead)}
                    onWhatsApp={() => handleQuickWhatsApp(lead)}
                    onAddNote={() => handleQuickAddNote(lead)}
                    isPending={isPending}
                    source={lead.source}
                    isFollowUpToday={isFollowUpToday(lead)}
                    leadAgeDays={getLeadAgeDays(lead.createdAt)}
                  />
                ))}
              </KanbanColumn>

              <KanbanColumn
                id="column-qualified"
                title="Qualified"
                count={kanbanData.qualified.length}
                leadColor="bg-red-50 border-red-200"
                headerColor="text-red-700"
              >
                {kanbanData.qualified.map((lead) => (
                  <KanbanCard
                    key={`qualified-${lead.id}`}
                    lead={lead}
                    onConvert={() => handleConvertLead(lead)}
                    onEdit={() => handleEditLead(lead)}
                    onCall={() => handleQuickCall(lead)}
                    onWhatsApp={() => handleQuickWhatsApp(lead)}
                    onAddNote={() => handleQuickAddNote(lead)}
                    isPending={isPending}
                    source={lead.source}
                    isFollowUpToday={isFollowUpToday(lead)}
                    leadAgeDays={getLeadAgeDays(lead.createdAt)}
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
                    onCall={() => handleQuickCall(lead)}
                    onWhatsApp={() => handleQuickWhatsApp(lead)}
                    onAddNote={() => handleQuickAddNote(lead)}
                    isPending={isPending}
                    source={lead.source}
                    isFollowUpToday={isFollowUpToday(lead)}
                    leadAgeDays={getLeadAgeDays(lead.createdAt)}
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
                      <TableHead>Assigned Staff</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Heat</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contacts</TableHead>
                      <TableHead>Aging</TableHead>
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
                        <TableCell>{lead.assignedStaffName || '-'}</TableCell>
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
                        <TableCell>{lead.contactCount || 0}</TableCell>
                        <TableCell>{getLeadAgeDays(lead.createdAt)}d</TableCell>
                        <TableCell>{formatDateOnly(lead.createdAt)}</TableCell>
                        <TableCell>{formatDateOnly(lead.followUpDate)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickCall(lead)}
                              disabled={isPending || !lead.phone}
                            >
                              Call
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickWhatsApp(lead)}
                              disabled={isPending || !lead.phone}
                            >
                              WA
                            </Button>
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
              <CardTitle>Daily Digest</CardTitle>
              <CardDescription>Auto-generated follow-up notification summary</CardDescription>
            </CardHeader>
            <CardContent>
              {!leadDigest ? (
                <p className="text-sm text-muted-foreground">No digest available yet.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Date:</span> {leadDigest.date} ({leadDigest.timezone})
                  </p>
                  <p>
                    <span className="font-medium">Today follow-ups:</span> {leadDigest.totals?.todayFollowUps || 0}
                  </p>
                  <p>
                    <span className="font-medium">Missed follow-ups:</span> {leadDigest.totals?.missedFollowUps || 0}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Follow Ups</CardTitle>
              <CardDescription>{todayFollowUps.length || 0} due today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayFollowUps.length === 0 && (
                <p className="text-sm text-muted-foreground">No follow ups scheduled for today.</p>
              )}
              {todayFollowUps.map((lead) => (
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
              <CardTitle>Missed Follow-ups</CardTitle>
              <CardDescription>{missedFollowUps.length || 0} overdue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {missedFollowUps.length === 0 && (
                <p className="text-sm text-muted-foreground">No missed follow-ups. Great job.</p>
              )}
              {missedFollowUps.map((lead) => (
                <div key={`missed-${lead.id}`} className="rounded-md border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                      <div className="text-xs text-red-700">Follow up was due: {formatDateOnly(lead.followUpDate)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getTemperatureColor(lead.temperature)}>{lead.temperature}</Badge>
                      <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => handleQuickCall(lead)}>Call</Button>
                    <Button size="sm" variant="outline" onClick={() => handleQuickWhatsApp(lead)}>WhatsApp</Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditLead(lead)}>Edit</Button>
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
                      <div className="text-xs text-muted-foreground">Follow up: {formatDateOnly(lead.followUpDate)}</div>
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
              <CardTitle>Pipeline Health Summary</CardTitle>
              <CardDescription>Cold / Warm / Hot distribution</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Cold</p>
                <p className="text-xl font-semibold">{leadAnalytics?.heatDistribution?.cold || 0}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Warm</p>
                <p className="text-xl font-semibold">{leadAnalytics?.heatDistribution?.warm || 0}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Hot</p>
                <p className="text-xl font-semibold">{leadAnalytics?.heatDistribution?.hot || 0}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stage Drop-off</CardTitle>
                <CardDescription>Lead loss between stages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>New -> Contacted</span><span>{leadAnalytics?.dropOff?.newToContacted || 0}</span></div>
                <div className="flex justify-between"><span>Contacted -> Qualified</span><span>{leadAnalytics?.dropOff?.contactedToQualified || 0}</span></div>
                <div className="flex justify-between"><span>Qualified -> Converted</span><span>{leadAnalytics?.dropOff?.qualifiedToConverted || 0}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avg Time Per Stage (days)</CardTitle>
                <CardDescription>Cycle time across pipeline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>New</span><span>{leadAnalytics?.stageDurations?.new?.averageDays || 0}</span></div>
                <div className="flex justify-between"><span>Contacted</span><span>{leadAnalytics?.stageDurations?.contacted?.averageDays || 0}</span></div>
                <div className="flex justify-between"><span>Qualified</span><span>{leadAnalytics?.stageDurations?.qualified?.averageDays || 0}</span></div>
                <div className="flex justify-between"><span>Converted</span><span>{leadAnalytics?.stageDurations?.converted?.averageDays || 0}</span></div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Timeline</CardTitle>
              <CardDescription>Monthly converted leads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(leadAnalytics?.conversionTimeline || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversion timeline data yet.</p>
              ) : (
                (leadAnalytics?.conversionTimeline || []).map((item) => (
                  <div key={item.month} className="flex items-center justify-between text-sm">
                    <span>{item.month}</span>
                    <span className="font-medium">{item.converted}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Lifecycle Metrics</CardTitle>
              <CardDescription>Operational metrics for dashboard tracking</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5 text-sm">
              <div className="rounded border p-3"><p className="text-muted-foreground">Active Leads</p><p className="font-semibold">{leadAnalytics?.lifecycleMetrics?.totalActiveLeads || 0}</p></div>
              <div className="rounded border p-3"><p className="text-muted-foreground">Converted</p><p className="font-semibold">{leadAnalytics?.lifecycleMetrics?.convertedLeads || 0}</p></div>
              <div className="rounded border p-3"><p className="text-muted-foreground">Lost</p><p className="font-semibold">{leadAnalytics?.lifecycleMetrics?.lostLeads || 0}</p></div>
              <div className="rounded border p-3"><p className="text-muted-foreground">Avg Contacts</p><p className="font-semibold">{leadAnalytics?.lifecycleMetrics?.avgContactAttempts || 0}</p></div>
              <div className="rounded border p-3"><p className="text-muted-foreground">Avg Lead Age</p><p className="font-semibold">{leadAnalytics?.lifecycleMetrics?.avgLeadAgeDays || 0}d</p></div>
            </CardContent>
          </Card>

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
