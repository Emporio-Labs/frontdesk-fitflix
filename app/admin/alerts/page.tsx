'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  IconBellRinging,
  IconPhone,
  IconBrandWhatsapp,
  IconCheck,
  IconAlertTriangle,
  IconClock,
  IconSearch,
  IconFilter,
  IconFileText,
  IconStar,
  IconAlertCircle,
  IconSparkles,
  IconUserCheck,
  IconDna,
  IconStethoscope,
  IconCreditCard,
  IconExternalLink,
  IconRefresh,
} from '@tabler/icons-react'
import {
  useLeads,
  useUpdateLead,
  useRecordLeadContactAttempt,
  useAddLeadInteraction,
} from '@/hooks/use-leads'
import { useUsers } from '@/hooks/use-users'
import { Lead } from '@/lib/services/lead.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const SLA_MINUTES = 15

export default function ConciergeAlertsPage() {
  const [activeTab, setActiveTab] = useState('callbacks')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'urgent' | 'breached' | 'contacted'>('all')
  const [now, setNow] = useState<number>(() => Date.now())

  // Lead interactions
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteText, setNoteText] = useState('')

  const { data: leads = [], isLoading: leadsLoading, refetch } = useLeads()
  const { data: users = [] } = useUsers()
  const updateLead = useUpdateLead()
  const recordContact = useRecordLeadContactAttempt()
  const addInteraction = useAddLeadInteraction()

  // Real-time 1s tick
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // High ticket & in-app callbacks
  const allCallbacks = useMemo(() => {
    return leads
      .filter((lead) => {
        const isAppFallback =
          lead.source?.toUpperCase().includes('APP') ||
          lead.notes?.includes('[APP_PURCHASE_FALLBACK]') ||
          lead.tags?.includes('callback') ||
          lead.tags?.includes('hot')
        return isAppFallback
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [leads])

  const filteredCallbacks = useMemo(() => {
    return allCallbacks.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        lead.notes.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false

      const created = new Date(lead.createdAt).getTime()
      const elapsedMins = (now - created) / (1000 * 60)
      const isBreached = elapsedMins > SLA_MINUTES && lead.status === 'new'
      const isUrgent = elapsedMins > SLA_MINUTES - 5 && lead.status === 'new'

      if (statusFilter === 'urgent') return isUrgent && !isBreached
      if (statusFilter === 'breached') return isBreached
      if (statusFilter === 'contacted') return lead.status === 'contacted' || lead.status === 'converted'
      return true
    })
  }, [allCallbacks, searchTerm, statusFilter, now])

  // Metrics
  const metrics = useMemo(() => {
    let pending = 0
    let breached = 0
    let urgent = 0
    let converted = 0

    allCallbacks.forEach((lead) => {
      if (lead.status === 'converted') {
        converted++
        return
      }
      if (lead.status === 'new') {
        pending++
        const created = new Date(lead.createdAt).getTime()
        const elapsedMins = (now - created) / (1000 * 60)
        if (elapsedMins > SLA_MINUTES) {
          breached++
        } else if (elapsedMins > SLA_MINUTES - 5) {
          urgent++
        }
      }
    })

    return { total: allCallbacks.length, pending, breached, urgent, converted }
  }, [allCallbacks, now])

  const parsePlanName = (notes: string) => {
    const match = notes.match(/Inquiring about plan:\s*([^.]+)/i)
    return match ? match[1].trim() : 'Personal Training / Custom Protocol'
  }

  const formatCountdown = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime()
    const deadline = created + SLA_MINUTES * 60 * 1000
    const diffSec = Math.floor((deadline - now) / 1000)

    if (diffSec <= 0) {
      const overSec = Math.abs(diffSec)
      const overMin = Math.floor(overSec / 60)
      const overS = overSec % 60
      return {
        text: `BREACHED +${overMin}m ${overS < 10 ? '0' : ''}${overS}s`,
        isBreached: true,
        isUrgent: true,
      }
    }

    const min = Math.floor(diffSec / 60)
    const sec = diffSec % 60
    return {
      text: `${min}:${sec < 10 ? '0' : ''}${sec} left`,
      isBreached: false,
      isUrgent: min < 5,
    }
  }

  const handleMarkContacted = async (lead: Lead) => {
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        payload: { status: 'contacted' },
      })
      await recordContact.mutateAsync({
        id: lead.id,
        channel: 'call',
      })
      toast.success(`Marked ${lead.name} as Contacted`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleSaveNote = async () => {
    if (!selectedLead || !noteText.trim()) return
    try {
      await addInteraction.mutateAsync({
        id: selectedLead.id,
        note: noteText.trim(),
        type: 'note',
      })
      toast.success('Concierge note added')
      setNoteDialogOpen(false)
      setNoteText('')
    } catch {
      toast.error('Failed to save note')
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <IconBellRinging className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Concierge Action Center
            </h1>
            <Badge
              variant="outline"
              className="ml-2 font-mono uppercase tracking-widest text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30"
            >
              15-Min SLA
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            High-ticket member callbacks, medical reviews, feedback, and urgent operational alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => refetch()}
            disabled={leadsLoading}
          >
            <IconRefresh className={`h-4 w-4 ${leadsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button asChild size="sm" className="gap-1.5 bg-foreground text-background">
            <Link href="/admin/leads">
              <span>View Full Leads CRM</span>
              <IconExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-amber-500/30 bg-amber-500/[0.03]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Active Callbacks
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-600">
              {metrics.pending}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Pending 15-min SLA</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/[0.03]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
              SLA Breached
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-red-600">
              {metrics.breached}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">&gt; 15 mins elapsed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Urgent (&lt; 5m left)
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground">
              {metrics.urgent}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Require immediate dial</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/[0.03]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Converted Members
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">
              {metrics.converted}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">From callback inquiries</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-11 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="callbacks" className="gap-2 text-xs font-semibold rounded-lg">
            <IconPhone className="h-4 w-4 text-amber-500" />
            <span>15-Min Callbacks</span>
            {metrics.pending > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-amber-500 text-white">
                {metrics.pending}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="reports" className="gap-2 text-xs font-semibold rounded-lg">
            <IconFileText className="h-4 w-4 text-blue-500" />
            <span>Clinical & DNA Reports</span>
          </TabsTrigger>

          <TabsTrigger value="feedback" className="gap-2 text-xs font-semibold rounded-lg">
            <IconStar className="h-4 w-4 text-purple-500" />
            <span>Member Reviews</span>
          </TabsTrigger>

          <TabsTrigger value="system" className="gap-2 text-xs font-semibold rounded-lg">
            <IconAlertCircle className="h-4 w-4 text-rose-500" />
            <span>Renewal & Billing Alerts</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: 15-MINUTE CALLBACKS */}
        <TabsContent value="callbacks" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search callbacks, plans, phones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <Button
                size="sm"
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                className="h-8 text-xs font-medium"
                onClick={() => setStatusFilter('all')}
              >
                All ({allCallbacks.length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'urgent' ? 'default' : 'outline'}
                className="h-8 text-xs font-medium"
                onClick={() => setStatusFilter('urgent')}
              >
                Urgent ({metrics.urgent})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'breached' ? 'destructive' : 'outline'}
                className="h-8 text-xs font-medium"
                onClick={() => setStatusFilter('breached')}
              >
                Breached ({metrics.breached})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'contacted' ? 'default' : 'outline'}
                className="h-8 text-xs font-medium"
                onClick={() => setStatusFilter('contacted')}
              >
                Contacted / Converted
              </Button>
            </div>
          </div>

          {filteredCallbacks.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <IconCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">No Callbacks Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No callback inquiries matching this filter. New requests submitted from the app will appear here instantly with a 15-minute countdown.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCallbacks.map((lead) => {
                const plan = parsePlanName(lead.notes)
                const countdown = formatCountdown(lead.createdAt)
                const isNew = lead.status === 'new'

                return (
                  <Card
                    key={lead.id}
                    className={`relative overflow-hidden transition-all hover:shadow-md border ${
                      isNew && countdown.isBreached
                        ? 'border-red-500/60 bg-red-500/[0.03]'
                        : isNew && countdown.isUrgent
                        ? 'border-amber-500/60 bg-amber-500/[0.03]'
                        : isNew
                        ? 'border-border/80'
                        : 'border-border/40 opacity-75'
                    }`}
                  >
                    {/* Top SLA Stripe */}
                    {isNew && (
                      <div
                        className={`h-1.5 w-full ${
                          countdown.isBreached
                            ? 'bg-red-600 animate-pulse'
                            : countdown.isUrgent
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                    )}

                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-foreground">
                              {lead.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold uppercase tracking-wider h-5 ${
                                lead.status === 'new'
                                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                  : lead.status === 'contacted'
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              }`}
                            >
                              {lead.status}
                            </Badge>
                          </div>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            {lead.phone}
                          </p>
                        </div>

                        {/* Timer */}
                        {isNew ? (
                          <div
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${
                              countdown.isBreached
                                ? 'bg-red-600 text-white animate-pulse'
                                : countdown.isUrgent
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {countdown.isBreached ? (
                              <IconAlertTriangle className="h-3.5 w-3.5" />
                            ) : (
                              <IconClock className="h-3.5 w-3.5" />
                            )}
                            <span>{countdown.text}</span>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            {lead.status === 'converted' ? 'Converted' : 'Contacted'}
                          </Badge>
                        )}
                      </div>

                      {/* Plan Tag */}
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2 py-0.5"
                        >
                          <IconSparkles className="h-3 w-3 mr-1" />
                          {plan}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      {lead.notes && (
                        <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground border border-border/40">
                          <p className="font-semibold text-foreground/80 mb-0.5 text-[11px] uppercase tracking-wider">
                            Member Request & Notes:
                          </p>
                          <p className="line-clamp-3">{lead.notes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <span>Submitted: {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>Contacts: {lead.contactCount || 0}</span>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5"
                          asChild
                        >
                          <a href={`tel:${lead.phone}`}>
                            <IconPhone className="h-3.5 w-3.5 text-blue-600" />
                            Call
                          </a>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5"
                          asChild
                        >
                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(
                              lead.name
                            )},%20this%20is%20FitFlix%20Concierge%20following%20up%20on%20your%20${encodeURIComponent(
                              plan
                            )}%20protocol%20inquiry.`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <IconBrandWhatsapp className="h-3.5 w-3.5 text-emerald-600" />
                            WhatsApp
                          </a>
                        </Button>

                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs gap-1"
                          onClick={() => {
                            setSelectedLead(lead)
                            setNoteDialogOpen(true)
                          }}
                        >
                          <IconFileText className="h-3.5 w-3.5" />
                          Add Note
                        </Button>

                        {isNew ? (
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1 bg-foreground text-background"
                            onClick={() => handleMarkContacted(lead)}
                          >
                            <IconCheck className="h-3.5 w-3.5" />
                            Mark Done
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            asChild
                          >
                            <Link href={`/admin/leads?convert=${lead.id}`}>
                              <IconUserCheck className="h-3.5 w-3.5" />
                              Convert
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: CLINICAL & DNA REPORTS */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <IconDna className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">DNA Genetic Profiles</CardTitle>
                    <CardDescription className="text-xs">Pending clinician protocol mapping</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Sathwik Varma</p>
                    <p className="text-[11px] text-muted-foreground">Cardio & Metabolic Panel</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                    Awaiting Review
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Kavya Reddy</p>
                    <p className="text-[11px] text-muted-foreground">Longevity & Methylation Profile</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Ready for Doctor
                  </Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                  <Link href="/admin/dna">Open DNA Dashboard →</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <IconStethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Doctor Consultations</CardTitle>
                    <CardDescription className="text-xs">Clinical reports pending signoff</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Dr. Ananya Roy</p>
                    <p className="text-[11px] text-muted-foreground">3 follow-ups scheduled today</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">On Track</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                  <Link href="/admin/doctors">Open Doctor Management →</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: MEMBER REVIEWS & FEEDBACK */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Protocol & Service Feedback</CardTitle>
              <CardDescription className="text-xs">Member ratings and reviews from the mobile app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <IconStar key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-foreground">Rajesh Sharma</span>
                    <Badge variant="secondary" className="text-[10px]">Apex Member</Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Today, 2:15 PM</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  "The Cryotherapy and Red Light Therapy session was transformative. Clean recovery suites and concierge was very attentive."
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <IconStar key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-foreground">Pooja Nair</span>
                    <Badge variant="secondary" className="text-[10px]">Optimizer</Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Yesterday</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  "DNA test consultation with the doctor clarified my nutrition goals completely. Great support from the frontdesk."
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: SYSTEM & RENEWAL ALERTS */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <IconCreditCard className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-base">Upcoming Membership Renewals</CardTitle>
                </div>
                <CardDescription className="text-xs">Members expiring in &lt; 48 hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/[0.04] border border-amber-500/20">
                  <div>
                    <p className="text-xs font-bold text-foreground">Vikram Patel</p>
                    <p className="text-[11px] text-muted-foreground">Optimizer Plan · Expiring Tomorrow</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                    <a href="tel:+919876543210">Call to Renew</a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <IconAlertCircle className="h-5 w-5 text-rose-500" />
                  <CardTitle className="text-base">Low Credit Alerts</CardTitle>
                </div>
                <CardDescription className="text-xs">Members attempting bookings with 0 balance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                  <div>
                    <p className="text-xs font-bold text-foreground">Aditya Sen</p>
                    <p className="text-[11px] text-muted-foreground">0 Credits · Hyperbaric Oxygen Booking Attempted</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                    <Link href="/admin/credits">Top Up Credits</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Add Concierge Note — {selectedLead?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record details from your callback or follow-up discussion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="e.g. Member is interested in the Optimizer protocol, scheduled club tour for tomorrow 5 PM..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="text-xs min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveNote} disabled={!noteText.trim()}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
