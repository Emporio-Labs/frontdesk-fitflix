'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const LEAD_DRAFT_KEY = 'add_lead_form_draft'

type LeadFormState = {
  name: string
  email: string
  phone: string
  source: string
  status: LeadStatus
  temperature: LeadTemperature
  notes: string
  interestedIn: string
  followUpDate: string
  assignedStaffName: string
}

function defaultLeadForm(): LeadFormState {
  return {
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
  }
}

function saveLeadDraft(data: LeadFormState) {
  try {
    sessionStorage.setItem(LEAD_DRAFT_KEY, JSON.stringify(data))
  } catch (e) {}
}

function loadLeadDraft(): LeadFormState | null {
  try {
    const item = sessionStorage.getItem(LEAD_DRAFT_KEY)
    return item ? JSON.parse(item) : null
  } catch (e) {
    return null
  }
}

function clearLeadDraft() {
  try {
    sessionStorage.removeItem(LEAD_DRAFT_KEY)
  } catch (e) {}
}
import {
  IconPlus, IconEdit, IconTrash, IconShoppingCart, IconCreditCard,
  IconFlame, IconUserPlus, IconAlertTriangle, IconPhone, IconUserCheck, IconFilter,
  IconBellRinging, IconBrandWhatsapp, IconArrowRight, IconClock,
  IconDots, IconLayoutKanban, IconList, IconSearch,
} from '@tabler/icons-react'
import {
  CrmStatCard,
  FollowUpCard,
  SignupLeadCard,
  FunnelView,
  toISTDateStr,
} from '@/components/crm/crm-widgets'
import { InterestSummary } from '@/components/crm/interest-summary'
import {
  useAddLeadInteraction,
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
import { validateEmail, validatePhoneNumber } from '@/lib/schemas'
import KanbanColumn from './kanban-column'
import KanbanCard from './kanban-card'

const KANBAN_COLUMNS = [
  { key: 'new', title: 'New', leadColor: 'bg-sky-50 border-sky-200', headerColor: 'text-sky-700' },
  { key: 'contacted', title: 'Contacted', leadColor: 'bg-amber-50 border-amber-200', headerColor: 'text-amber-700' },
  { key: 'qualified', title: 'Qualified', leadColor: 'bg-red-50 border-red-200', headerColor: 'text-red-700' },
  { key: 'converted', title: 'Converted', leadColor: 'bg-green-50 border-green-200', headerColor: 'text-green-700' },
] as const

const CONVERTED_BY_PAYMENT =
  'Leads move to Converted when their invoice is paid. Use "Sell plan" to start the sale.'

/** Where a lead's sale continues: resume its unpaid invoice, or start one. */
function saleHref(lead: Lead) {
  return lead.pendingInvoiceId
    ? `/admin/sales/new?invoiceId=${encodeURIComponent(lead.pendingInvoiceId)}`
    : `/admin/sales/new?leadId=${encodeURIComponent(lead.id)}`
}

export default function LeadsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterHeat, setFilterHeat] = useState<string>('')
  // Board (kanban) or List (table) — shown one at a time, remembered per browser.
  const [view, setView] = useState<'board' | 'list'>('board')
  useEffect(() => {
    try {
      const saved = localStorage.getItem('leads_view')
      if (saved === 'board' || saved === 'list') setView(saved)
    } catch {}
  }, [])
  const changeView = (next: string) => {
    if (next !== 'board' && next !== 'list') return
    setView(next)
    try {
      localStorage.setItem('leads_view', next)
    } catch {}
  }
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)

  const {
    data: leads = [],
    isLoading: leadsLoading,
    isError,
    refetch,
  } = useLeads()
  const { data: reminderSummary, isLoading: remindersLoading } = useLeadReminders()
  const { data: leadAnalytics } = useLeadAnalytics()
  const { data: leadDigest } = useLeadDigest() as any
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()
  const deleteLead = useDeleteLead()
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
  const [showLeadUnsavedConfirm, setShowLeadUnsavedConfirm] = useState(false)

  // Auto-persist form draft to sessionStorage while filling in Add Lead mode
  useEffect(() => {
    if (isAddDialogOpen && !editingLead) {
      saveLeadDraft(formData)
    }
  }, [formData, isAddDialogOpen, editingLead])

  const isLeadFormDirty = useMemo(() => {
    if (editingLead) {
      return (
        formData.name !== (editingLead.name || '') ||
        formData.email !== (editingLead.email || '') ||
        formData.phone !== (editingLead.phone || '') ||
        formData.source !== (editingLead.source || 'Website') ||
        formData.status !== (editingLead.status || 'new') ||
        formData.notes !== (editingLead.notes || '') ||
        formData.interestedIn !== (editingLead.interestedIn || '') ||
        formData.assignedStaffName !== (editingLead.assignedStaffName || '') ||
        formData.followUpDate !== (editingLead.followUpDate ? String(editingLead.followUpDate).split('T')[0] : '')
      )
    }
    const def = defaultLeadForm()
    return (
      formData.name.trim() !== def.name ||
      formData.email.trim() !== def.email ||
      formData.phone.trim() !== def.phone ||
      formData.source !== def.source ||
      formData.status !== def.status ||
      formData.notes.trim() !== def.notes ||
      formData.interestedIn.trim() !== def.interestedIn ||
      formData.assignedStaffName.trim() !== def.assignedStaffName ||
      formData.followUpDate !== def.followUpDate
    )
  }, [formData, editingLead])

  const handleCloseAddLeadDialog = () => {
    if (isLeadFormDirty) {
      setShowLeadUnsavedConfirm(true)
    } else {
      if (!editingLead) {
        clearLeadDraft()
      }
      setIsAddDialogOpen(false)
      setEditingLead(null)
      resetForm()
    }
  }

  const openAddLeadModal = () => {
    setEditingLead(null)
    const draft = loadLeadDraft()
    if (draft) {
      setFormData(draft)
    } else {
      resetForm()
    }
    setIsAddDialogOpen(true)
  }
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch =
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.phone && l.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = !filterStatus || l.status === filterStatus
      const matchesHeat = !filterHeat || l.temperature === filterHeat
      return matchesSearch && matchesStatus && matchesHeat
    })
  }, [leads, searchTerm, filterStatus, filterHeat])

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

  // ── CRM Overview computed ─────────────────────────────────────────────────
  const todayStr = toISTDateStr(new Date())

  const signupLeads = useMemo(
    () =>
      leads
        .filter((l) => l.tags.some((t) => t.toLowerCase() === 'signup'))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [leads],
  )

  const todaySignups = useMemo(
    () => signupLeads.filter((l) => toISTDateStr(new Date(l.createdAt)) === todayStr),
    [signupLeads, todayStr],
  )

  const pendingFollowups = useMemo(
    () => [...(reminderSummary?.missed ?? []), ...(reminderSummary?.today ?? [])],
    [reminderSummary],
  )

  const stageCounts = leadAnalytics?.stageCounts ?? {
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
  }

  const handleAddLead = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    if (!formData.phone.trim()) {
      toast.error('Phone number is required')
      return
    }

    if (!validatePhoneNumber(formData.phone)) {
      toast.error('Please enter a valid phone number (at least 10 digits)')
      return
    }

    const trimmedEmail = formData.email.trim()
    if (trimmedEmail && !validateEmail(trimmedEmail)) {
      toast.error('Please enter a valid email address')
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
          // Only payment sets Converted; don't echo it back on an edit.
          status: formData.status === 'converted' ? undefined : formData.status,
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
      clearLeadDraft()
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

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const lead = leads.find((item) => item.id === leadId)
    if (!lead) return

    if (newStatus === 'converted') {
      toast.error(CONVERTED_BY_PAYMENT)
      return
    }

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
    if (nextStage === 'converted') {
      toast.error(CONVERTED_BY_PAYMENT)
      return
    }

    const order: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted']
    const from = order.indexOf(lead.status)
    const to = order.indexOf(nextStage)
    if (from < 0 || to < 0 || to !== from + 1) {
      toast.error('Cannot skip stages. Move one step at a time.')
      return
    }

    await handleStatusChange(lead.id, nextStage)
  }

  // Delete is one tap away in the row menu, so it asks first.
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null)
  const handleDeleteLead = (id: string) => {
    deleteLead.mutate(id)
  }

  const handleQuickCall = async (lead: Lead) => {
    if (!lead.phone) {
      toast.error('Phone number is missing for this lead')
      return
    }

    try {
      await contactAttempt.mutateAsync({ id: lead.id, channel: 'call' })
    } catch {
      // Ignore telemetry failures; the direct call action should still proceed.
    }
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${lead.phone.replace(/\D/g, '')}`
    }
  }

  const handleQuickWhatsApp = async (lead: Lead) => {
    if (!lead.phone) {
      toast.error('Phone number is missing for this lead')
      return
    }

    try {
      await contactAttempt.mutateAsync({ id: lead.id, channel: 'whatsapp' })
    } catch {
      // Ignore telemetry failures; the WhatsApp action should still proceed.
    }
    if (typeof window !== 'undefined') {
      const digits = lead.phone.replace(/\D/g, '')
      const message = encodeURIComponent(`Hi ${lead.name}, following up on your inquiry from Fitflix.`)
      window.open(`https://wa.me/${digits}?text=${message}`, '_blank', 'noopener,noreferrer')
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

  const pendingCallbacks = useMemo(() => {
    return leads.filter((lead) => {
      const isAppFallback =
        lead.source?.toUpperCase().includes('APP') ||
        lead.notes?.includes('[APP_PURCHASE_FALLBACK]') ||
        lead.tags?.includes('callback')
      return isAppFallback && lead.status === 'new'
    })
  }, [leads])

  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">Manage sales leads and conversions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={(o) => { if (!o) handleCloseAddLeadDialog() }}>
            <DialogTrigger asChild>
              <Button onClick={openAddLeadModal}>
                <IconPlus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
              onPointerDownOutside={(e) => {
                if (isLeadFormDirty) {
                  e.preventDefault()
                  handleCloseAddLeadDialog()
                }
              }}
              onInteractOutside={(e) => {
                if (isLeadFormDirty) {
                  e.preventDefault()
                  handleCloseAddLeadDialog()
                }
              }}
              onEscapeKeyDown={(e) => {
                if (isLeadFormDirty) {
                  e.preventDefault()
                  handleCloseAddLeadDialog()
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>{editingLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
                <DialogDescription>
                  {editingLead ? 'Update lead information' : 'Create a new sales lead'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Above the fields, because this is the thing that changes
                    how the call opens — and it renders nothing at all unless
                    the lead has a linked app account with consented activity,
                    so it costs no space in the common case. */}
                <InterestSummary userId={editingLead?.convertedUserId} />
                <div>
                  <label className="text-sm font-medium">
                    Name <span className="text-red-600">*</span>
                  </label>
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
                  <label className="text-sm font-medium">
                    Phone <span className="text-red-600">*</span>
                  </label>
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
                    {/* Converted is set by payment only — shown, not choosable. */}
                    {formData.status === 'converted' && (
                      <option value="converted" disabled>Converted</option>
                    )}
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
                    onClick={handleCloseAddLeadDialog}
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

          <AlertDialog open={showLeadUnsavedConfirm} onOpenChange={setShowLeadUnsavedConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                <AlertDialogDescription>
                  You have unsaved changes. Do you want to leave?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowLeadUnsavedConfirm(false)}>
                  Stay
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowLeadUnsavedConfirm(false)
                    if (!editingLead) {
                      clearLeadDraft()
                    }
                    setIsAddDialogOpen(false)
                    setEditingLead(null)
                    resetForm()
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Leave
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* ── ⚡ HIGH-TICKET 15-MINUTE CALLBACK SLA TRAY ────────────────────────── */}
      {pendingCallbacks.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/[0.08] via-background to-amber-500/[0.04] p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <IconBellRinging className="h-4 w-4 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  ⚡ High-Ticket Concierge Callbacks (15-Minute SLA)
                  <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                    {pendingCallbacks.length} PENDING
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Action immediately to satisfy the 15-minute response guarantee.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-amber-500/30 text-amber-700 dark:text-amber-400" asChild>
              <Link href="/admin/alerts">
                <span>Open Concierge Action Center</span>
                <IconArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {pendingCallbacks.slice(0, 3).map((lead) => {
              const plan = lead.notes.match(/Inquiring about plan:\s*([^.]+)/i)?.[1]?.trim() || 'Protocol Inquiry'
              return (
                <div
                  key={lead.id}
                  className="rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{lead.name}</h4>
                        <p className="text-[11px] font-mono text-muted-foreground">{lead.phone}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-0 font-semibold">
                        {plan}
                      </Badge>
                    </div>
                    {lead.notes && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 bg-muted/30 p-1.5 rounded">
                        {lead.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t">
                    <Button size="sm" variant="outline" className="h-6 text-[11px] flex-1" asChild>
                      <a href={`tel:${lead.phone}`}>
                        <IconPhone className="h-3 w-3 mr-1 text-blue-600" />
                        Call
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[11px] flex-1" asChild>
                      <a
                        href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(
                          lead.name
                        )},%20this%20is%20FitFlix%20Concierge%20following%20up%20on%20your%20${encodeURIComponent(
                          plan
                        )}%20protocol%20inquiry.`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <IconBrandWhatsapp className="h-3 w-3 mr-1 text-emerald-600" />
                        WhatsApp
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      className="h-6 text-[11px] px-2 bg-foreground text-background"
                      onClick={() => handleEditLead(lead)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Tabs defaultValue="board" className="space-y-4">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-4">

          {/* ── SECTION 1: CRM Overview Cards ──────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              CRM Overview
            </p>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <CrmStatCard
                title="Today's Signups"
                value={leadsLoading ? null : todaySignups.length}
                sub="new app registrations"
                icon={<IconUserPlus className="w-4 h-4 text-blue-500" />}
                href="/admin/leads"
              />
              <CrmStatCard
                title="Pending Follow-ups"
                value={remindersLoading ? null : pendingFollowups.length}
                sub={`${reminderSummary?.missed?.length ?? 0} overdue`}
                icon={<IconAlertTriangle className="w-4 h-4 text-amber-500" />}
                href="/admin/leads"
                urgent={(reminderSummary?.missed?.length ?? 0) > 0}
              />
              <CrmStatCard
                title="Contacted Leads"
                value={stageCounts.contacted}
                sub="in pipeline"
                icon={<IconPhone className="w-4 h-4 text-violet-500" />}
                href="/admin/leads"
              />
              <CrmStatCard
                title="Converted Members"
                value={stageCounts.converted}
                sub="from leads"
                icon={<IconUserCheck className="w-4 h-4 text-emerald-500" />}
                href="/admin/leads"
              />
            </div>
          </div>

          {/* ── SECTION 2: Today's Follow-ups + New Signups ─────────────────── */}
          {/* On phones the two columns stack vertically; from tablet up they sit side-by-side */}
          <div className="grid gap-4 md:grid-cols-2">

            {/* Today's Follow-ups Panel */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <IconFlame className="w-4 h-4 text-orange-500" />
                    Today's Follow-ups
                    {pendingFollowups.length > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {pendingFollowups.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Leads needing contact now</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                {remindersLoading ? (
                  [...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-[84px] w-full" />
                  ))
                ) : pendingFollowups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <IconUserCheck className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">All caught up for today!</p>
                  </div>
                ) : (
                  pendingFollowups.slice(0, 6).map((lead) => (
                    <FollowUpCard
                      key={lead.id}
                      lead={lead}
                      onCall={() => contactAttempt.mutate({ id: lead.id, channel: 'call' })}
                      onWhatsApp={() => contactAttempt.mutate({ id: lead.id, channel: 'whatsapp' })}
                      onMarkContacted={() => handleStatusChange(lead.id, 'contacted')}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* New Signups Panel */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <IconUserPlus className="w-4 h-4 text-blue-500" />
                    New Signups
                    {todaySignups.length > 0 && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300">
                        {todaySignups.length} today
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Recent app registrations</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                {leadsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-[84px] w-full" />
                  ))
                ) : signupLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <IconUserPlus className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">No app signups yet</p>
                  </div>
                ) : (
                  signupLeads.slice(0, 6).map((lead) => (
                    <SignupLeadCard key={lead.id} lead={lead} />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── SECTION 3: Lead Funnel Pipeline ────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <IconFilter className="w-4 h-4" />
                  Lead Funnel
                </CardTitle>
                <CardDescription>Live pipeline stage distribution</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <FunnelView stageCounts={stageCounts} />
            </CardContent>
          </Card>

          {/* ── SECTION 4: Toolbar — search, filters, Board / List ─────────── */}
          {/* Sticks just under the (sticky, h-12/h-14) site header while scrolling. */}
          <div className="sticky top-12 sm:top-14 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="relative min-w-[12rem] flex-1">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
            <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-10 w-[9.5rem]" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterHeat || 'all'} onValueChange={(v) => setFilterHeat(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-10 w-[8.5rem]" aria-label="Filter by heat">
                <SelectValue placeholder="Heat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any heat</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={changeView}
              variant="outline"
              className="ml-auto"
              aria-label="Leads view"
            >
              <ToggleGroupItem value="board" className="h-10 gap-1.5 px-3" aria-label="Board view">
                <IconLayoutKanban className="h-4 w-4" />
                <span className="hidden lg:inline">Board</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="list" className="h-10 gap-1.5 px-3" aria-label="List view">
                <IconList className="h-4 w-4" />
                <span className="hidden lg:inline">List</span>
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="w-full px-1 text-xs text-muted-foreground">
              {filteredLeads.length} of {leads.length} leads
              {(searchTerm || filterStatus || filterHeat) && (
                <button
                  type="button"
                  className="ml-2 underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    setSearchTerm('')
                    setFilterStatus('')
                    setFilterHeat('')
                  }}
                >
                  Clear filters
                </button>
              )}
            </p>
          </div>

          {isError && (
            <p className="text-sm text-red-600">Failed to load leads from API. Check auth credentials and backend status.</p>
          )}

          {view === 'board' ? (
            /* Kanban: swipe sideways through the columns on phones/tablets
               (one column ≈ 300px, snapping), a 4-column grid from xl. */
            <DndContext
              collisionDetection={closestCorners}
              onDragEnd={handleDragEnd}
              onDragStart={(event) => {
                const leadId = event.active.id as string
                const lead = leads.find((l) => l.id === leadId)
                setDraggedLead(lead || null)
              }}
            >
              <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 xl:mx-0 xl:grid xl:grid-cols-4 xl:overflow-visible xl:px-0">
                {KANBAN_COLUMNS.map((column) => (
                  <KanbanColumn
                    key={column.key}
                    id={`column-${column.key}`}
                    title={column.title}
                    count={kanbanData[column.key].length}
                    leadColor={column.leadColor}
                    headerColor={column.headerColor}
                    refusesDrop={column.key === 'converted'}
                    className="w-[85%] shrink-0 snap-start sm:w-[300px] xl:w-auto"
                  >
                    {kanbanData[column.key].map((lead) => (
                      <KanbanCard
                        key={`${column.key}-${lead.id}`}
                        lead={lead}
                        onEdit={() => handleEditLead(lead)}
                        onCall={() => handleQuickCall(lead)}
                        onWhatsApp={() => handleQuickWhatsApp(lead)}
                        onAddNote={() => handleQuickAddNote(lead)}
                        isPending={isPending}
                        source={lead.source}
                        isFollowUpToday={isFollowUpToday(lead)}
                        leadAgeDays={getLeadAgeDays(lead.createdAt)}
                        isDragDisabled={column.key === 'converted'}
                      />
                    ))}
                  </KanbanColumn>
                ))}
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
          ) : (
            /* List: columns appear as width allows; contact details sit under
               the name until there's room for their own columns. */
            <Card>
              <CardContent className="p-0">
                {leadsLoading ? (
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No leads match these filters.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Lead</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden md:table-cell">Heat</TableHead>
                          <TableHead className="hidden md:table-cell">Follow-up</TableHead>
                          <TableHead className="hidden lg:table-cell">Source</TableHead>
                          <TableHead className="hidden xl:table-cell">Staff</TableHead>
                          <TableHead className="hidden xl:table-cell text-right">Contacts</TableHead>
                          <TableHead className="hidden xl:table-cell text-right">Age</TableHead>
                          <TableHead className="pr-4 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeads.map((lead) => {
                          const open = lead.status !== 'converted' && lead.status !== 'lost'
                          return (
                            <TableRow key={lead.id}>
                              <TableCell className="pl-4">
                                <button
                                  type="button"
                                  onClick={() => handleEditLead(lead)}
                                  className="text-left"
                                >
                                  <span className="block font-medium hover:underline">{lead.name}</span>
                                  <span className="block text-xs text-muted-foreground">
                                    {lead.phone || '—'}
                                    <span className="hidden sm:inline">{lead.email ? ` · ${lead.email}` : ''}</span>
                                  </span>
                                </button>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                                  {lead.pendingInvoiceId && lead.status !== 'converted' && (
                                    <Badge className="bg-amber-100 text-amber-800">Awaiting payment</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge className={getTemperatureColor(lead.temperature)}>{lead.temperature}</Badge>
                              </TableCell>
                              <TableCell
                                className={cn(
                                  'hidden md:table-cell whitespace-nowrap',
                                  isFollowUpToday(lead) && 'font-semibold text-orange-600'
                                )}
                              >
                                {formatDateOnly(lead.followUpDate)}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Badge className={getSourceColor(lead.source)}>{lead.source.replace('-', ' ')}</Badge>
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">{lead.assignedStaffName || '—'}</TableCell>
                              <TableCell className="hidden xl:table-cell text-right tabular-nums">{lead.contactCount || 0}</TableCell>
                              <TableCell className="hidden xl:table-cell text-right tabular-nums">
                                {getLeadAgeDays(lead.createdAt)}d
                              </TableCell>
                              <TableCell className="pr-4">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9"
                                    onClick={() => handleQuickCall(lead)}
                                    disabled={isPending || !lead.phone}
                                    title="Call"
                                    aria-label={`Call ${lead.name}`}
                                  >
                                    <IconPhone className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9"
                                    onClick={() => handleQuickWhatsApp(lead)}
                                    disabled={isPending || !lead.phone}
                                    title="WhatsApp"
                                    aria-label={`WhatsApp ${lead.name}`}
                                  >
                                    <IconBrandWhatsapp className="h-4 w-4 text-emerald-600" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-9 w-9"
                                        disabled={isPending}
                                        aria-label={`More actions for ${lead.name}`}
                                      >
                                        <IconDots className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52">
                                      {open && lead.status !== 'contacted' && (
                                        <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'contacted')}>
                                          <IconPhone className="mr-2 h-4 w-4" /> Mark contacted
                                        </DropdownMenuItem>
                                      )}
                                      {open && lead.status !== 'qualified' && (
                                        <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'qualified')}>
                                          <IconFlame className="mr-2 h-4 w-4" /> Mark qualified
                                        </DropdownMenuItem>
                                      )}
                                      {open && (
                                        <DropdownMenuItem asChild>
                                          <Link href={saleHref(lead)}>
                                            {lead.pendingInvoiceId ? (
                                              <><IconCreditCard className="mr-2 h-4 w-4" /> Resume payment</>
                                            ) : (
                                              <><IconShoppingCart className="mr-2 h-4 w-4" /> Sell plan</>
                                            )}
                                          </Link>
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => handleEditLead(lead)}>
                                        <IconEdit className="mr-2 h-4 w-4" /> Edit lead
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600"
                                        onClick={() => setDeleteTarget(lead)}
                                      >
                                        <IconTrash className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
          )}
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
                    {lead.status !== 'converted' && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={saleHref(lead)}>
                          {lead.pendingInvoiceId ? 'Resume payment' : 'Sell plan'}
                        </Link>
                      </Button>
                    )}
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
                    {lead.status !== 'converted' && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={saleHref(lead)}>
                          {lead.pendingInvoiceId ? 'Resume payment' : 'Sell plan'}
                        </Link>
                      </Button>
                    )}
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
                    {lead.status !== 'converted' && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={saleHref(lead)}>
                          {lead.pendingInvoiceId ? 'Resume payment' : 'Sell plan'}
                        </Link>
                      </Button>
                    )}
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
                <div className="flex justify-between"><span>New -&gt; Contacted</span><span>{leadAnalytics?.dropOff?.newToContacted || 0}</span></div>
                <div className="flex justify-between"><span>Contacted -&gt; Qualified</span><span>{leadAnalytics?.dropOff?.contactedToQualified || 0}</span></div>
                <div className="flex justify-between"><span>Qualified -&gt; Converted</span><span>{leadAnalytics?.dropOff?.qualifiedToConverted || 0}</span></div>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The lead will be removed from the board and lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) handleDeleteLead(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              Delete lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
