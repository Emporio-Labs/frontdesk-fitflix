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
  IconShield,
  IconBuildingStore,
  IconChecklist,
  IconVolume,
  IconVolumeOff,
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
import { useOptionalLocationScope } from '@/components/location-scope-provider'
import { useOperationalAlerts } from '@/hooks/use-operational-alerts'
import {
  operationalAlertService,
  type OperationalAlert,
} from '@/lib/services/operational-alert.service'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

const SLA_MINUTES = 15

export default function ConciergeAlertsPage() {
  const [activeTab, setActiveTab] = useState('operational')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'urgent' | 'breached' | 'contacted'>('all')
  const [operationalStatusFilter, setOperationalStatusFilter] = useState<'active' | 'open' | 'acknowledged' | 'resolved' | 'all'>('active')
  const [now, setNow] = useState<number>(() => Date.now())

  // Lead interactions
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteText, setNoteText] = useState('')

  // Resolve dialog
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [resolvingAlert, setResolvingAlert] = useState<OperationalAlert | null>(null)
  const [resolveReason, setResolveReason] = useState('')

  const locationScope = useOptionalLocationScope()
  const branchId = locationScope?.selectedLocationId ?? null
  const branchName = locationScope?.selectedLocation?.name || 'All Clubs'

  // Operational alerts via live socket + DB persistence (FX-35)
  const {
    alerts: activeAlerts,
    openAlerts,
    acknowledgedAlerts,
    soundEnabled,
    setSoundEnabled,
    acknowledgeAlert,
    resolveAlert,
    refetch: refetchOperational,
    isAcknowledging,
    isResolving,
  } = useOperationalAlerts(branchId)

  // Full history query including resolved
  const {
    data: allAlertsHistory = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: queryKeys.operationalAlerts.all({ branchId }),
    queryFn: () => operationalAlertService.getAllAlerts({ branchId: branchId || undefined }),
    enabled: activeTab === 'operational',
  })

  const { data: leads = [], isLoading: leadsLoading, refetch: refetchLeads } = useLeads()
  const { data: users = [] } = useUsers()
  const updateLead = useUpdateLead()
  const recordContact = useRecordLeadContactAttempt()
  const addInteraction = useAddLeadInteraction()

  // Real-time 1s tick
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Filtered operational alerts for the board
  const displayedOperationalAlerts = useMemo(() => {
    let list = operationalStatusFilter === 'resolved' || operationalStatusFilter === 'all'
      ? allAlertsHistory
      : activeAlerts

    if (operationalStatusFilter === 'open') {
      list = list.filter((a) => a.status === 'open')
    } else if (operationalStatusFilter === 'acknowledged') {
      list = list.filter((a) => a.status === 'acknowledged')
    } else if (operationalStatusFilter === 'resolved') {
      list = list.filter((a) => a.status === 'resolved')
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q) ||
          a.relatedEntity?.summary?.toLowerCase().includes(q)
      )
    }

    return list
  }, [allAlertsHistory, activeAlerts, operationalStatusFilter, searchTerm])

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

  const metrics = useMemo(() => {
    let pending = 0
    let urgent = 0
    let breached = 0
    let contacted = 0

    allCallbacks.forEach((lead) => {
      const created = new Date(lead.createdAt).getTime()
      const elapsedMins = (now - created) / (1000 * 60)
      if (lead.status === 'new') {
        pending++
        if (elapsedMins > SLA_MINUTES) breached++
        else if (elapsedMins > SLA_MINUTES - 5) urgent++
      } else {
        contacted++
      }
    })

    return { pending, urgent, breached, contacted }
  }, [allCallbacks, now])

  const handleOpenResolveDialog = (alert: OperationalAlert) => {
    setResolvingAlert(alert)
    setResolveReason('')
    setResolveDialogOpen(true)
  }

  const handleConfirmResolve = async () => {
    if (!resolvingAlert) return
    try {
      await resolveAlert(resolvingAlert._id, resolveReason || 'Resolved manually by staff')
      setResolveDialogOpen(false)
      setResolvingAlert(null)
      refetchHistory()
    } catch {
      toast.error('Failed to resolve alert')
    }
  }

  const handleSaveNote = async () => {
    if (!selectedLead || !noteText.trim()) return
    try {
      await addInteraction.mutateAsync({
        id: selectedLead.id,
        note: noteText.trim(),
      })
      toast.success('Note added to lead timeline')
      setNoteDialogOpen(false)
      setNoteText('')
    } catch {
      toast.error('Failed to save note')
    }
  }

  const handleRefreshAll = () => {
    refetchOperational()
    refetchHistory()
    refetchLeads()
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <IconShield className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Operational Action Center
            </h1>
            <Badge
              variant="outline"
              className="ml-2 font-mono uppercase tracking-widest text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30"
            >
              FX-35 Live
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Urgent operational alerts, missing session hosts, hot callbacks, and audit-acknowledged incidents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {branchName && (
            <Badge variant="secondary" className="gap-1 text-xs py-1">
              <IconBuildingStore className="h-3.5 w-3.5" />
              <span>{branchName}</span>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
          >
            {soundEnabled ? (
              <IconVolume className="h-4 w-4 text-emerald-600" />
            ) : (
              <IconVolumeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleRefreshAll}
          >
            <IconRefresh className="h-4 w-4" />
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
        <Card className="border-rose-500/30 bg-rose-500/[0.03]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Unacknowledged Alerts
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-rose-600">
              {openAlerts.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Audible until acknowledged</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/[0.03]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Acknowledged In-Fix
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-600">
              {acknowledgedAlerts.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Under active investigation</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-blue-500/[0.03]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Hot Callbacks
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-blue-600">
              {metrics.pending}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Pending 15-min SLA</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/[0.03]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Active Operational Total
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">
              {activeAlerts.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Branch board active incidents</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-11 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="operational" className="gap-2 text-xs font-semibold rounded-lg">
            <IconAlertTriangle className="h-4 w-4 text-rose-500" />
            <span>Staff Alerts (FX-35)</span>
            {openAlerts.length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold">
                {openAlerts.length}
              </Badge>
            )}
          </TabsTrigger>

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
            <span>Clinical & DNA</span>
          </TabsTrigger>

          <TabsTrigger value="feedback" className="gap-2 text-xs font-semibold rounded-lg">
            <IconStar className="h-4 w-4 text-purple-500" />
            <span>Member Reviews</span>
          </TabsTrigger>

          <TabsTrigger value="system" className="gap-2 text-xs font-semibold rounded-lg">
            <IconAlertCircle className="h-4 w-4 text-rose-500" />
            <span>Billing Alerts</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OPERATIONAL ALERTS (FX-35) */}
        <TabsContent value="operational" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search operational alerts, targets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <Button
                variant={operationalStatusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8"
                onClick={() => setOperationalStatusFilter('active')}
              >
                Active Board ({activeAlerts.length})
              </Button>
              <Button
                variant={operationalStatusFilter === 'open' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8 text-rose-600 hover:text-rose-700"
                onClick={() => setOperationalStatusFilter('open')}
              >
                Open ({openAlerts.length})
              </Button>
              <Button
                variant={operationalStatusFilter === 'acknowledged' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8 text-amber-600 hover:text-amber-700"
                onClick={() => setOperationalStatusFilter('acknowledged')}
              >
                Acknowledged ({acknowledgedAlerts.length})
              </Button>
              <Button
                variant={operationalStatusFilter === 'resolved' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8"
                onClick={() => setOperationalStatusFilter('resolved')}
              >
                Resolved History
              </Button>
            </div>
          </div>

          {/* Operational Alerts Board */}
          <div className="space-y-3">
            {displayedOperationalAlerts.length === 0 ? (
              <Card className="p-12 text-center">
                <IconCheck className="mx-auto h-12 w-12 text-emerald-500 mb-3 opacity-80" />
                <h3 className="font-semibold text-base text-foreground">
                  No alerts in this view
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Operational alerts are delivered live over Socket.IO and stay open until acknowledged by a named staff member.
                </p>
              </Card>
            ) : (
              displayedOperationalAlerts.map((alert) => {
                const isOpen = alert.status === 'open'
                const isAck = alert.status === 'acknowledged'
                const isResolved = alert.status === 'resolved'

                return (
                  <Card
                    key={alert._id}
                    className={`transition-all ${
                      isOpen
                        ? 'border-rose-400 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20 shadow-sm'
                        : isAck
                        ? 'border-amber-300 bg-amber-50/20 dark:border-amber-900 dark:bg-amber-950/10'
                        : 'border-border/60 opacity-80'
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                alert.severity === 'critical'
                                  ? 'destructive'
                                  : alert.severity === 'warning'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="text-[10px] font-bold uppercase"
                            >
                              {alert.severity}
                            </Badge>

                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold uppercase ${
                                isOpen
                                  ? 'border-rose-500 text-rose-600'
                                  : isAck
                                  ? 'border-amber-500 text-amber-600'
                                  : 'border-emerald-500 text-emerald-600'
                              }`}
                            >
                              {alert.status}
                            </Badge>

                            <span className="font-bold text-sm text-foreground">
                              {alert.title}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {alert.message}
                          </p>

                          {alert.relatedEntity?.summary && (
                            <div className="text-xs font-medium text-foreground/90 mt-2 bg-muted/40 p-2 rounded-lg border border-border/40 inline-block">
                              Target: <span className="font-semibold">{alert.relatedEntity.summary}</span> ({alert.relatedEntity.entityType})
                            </div>
                          )}

                          {/* Audit trail */}
                          <div className="pt-2 text-[11px] text-muted-foreground flex flex-wrap gap-4">
                            <span>
                              Logged:{' '}
                              <strong className="text-foreground">
                                {new Date(alert.createdAt).toLocaleString()}
                              </strong>
                            </span>

                            {alert.acknowledgedBy && (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                ✓ Acknowledged by{' '}
                                <strong className="font-semibold">
                                  {alert.acknowledgedBy.name} ({alert.acknowledgedBy.role})
                                </strong>{' '}
                                at {alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toLocaleTimeString() : ''}
                              </span>
                            )}

                            {isResolved && alert.resolutionReason && (
                              <span className="text-blue-700 dark:text-blue-400">
                                ✓ Resolved: {alert.resolutionReason}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isOpen && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1.5 font-semibold text-xs h-8"
                              disabled={isAcknowledging}
                              onClick={() => acknowledgeAlert(alert._id)}
                            >
                              <IconUserCheck className="h-4 w-4" />
                              <span>Acknowledge</span>
                            </Button>
                          )}

                          {isAck && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs h-8"
                              disabled={isResolving}
                              onClick={() => handleOpenResolveDialog(alert)}
                            >
                              <IconCheck className="h-4 w-4 text-emerald-600" />
                              <span>Mark Resolved</span>
                            </Button>
                          )}

                          {isResolved && (
                            <Badge variant="secondary" className="text-xs">
                              Resolved
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* TAB 2: 15-MINUTE CALLBACKS */}
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
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8"
                onClick={() => setStatusFilter('all')}
              >
                All ({allCallbacks.length})
              </Button>
              <Button
                variant={statusFilter === 'urgent' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8 text-amber-600 hover:text-amber-700"
                onClick={() => setStatusFilter('urgent')}
              >
                Urgent (&lt;5m) ({metrics.urgent})
              </Button>
              <Button
                variant={statusFilter === 'breached' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8 text-rose-600 hover:text-rose-700"
                onClick={() => setStatusFilter('breached')}
              >
                SLA Breached ({metrics.breached})
              </Button>
              <Button
                variant={statusFilter === 'contacted' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8 text-emerald-600 hover:text-emerald-700"
                onClick={() => setStatusFilter('contacted')}
              >
                Resolved ({metrics.contacted})
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredCallbacks.length === 0 ? (
              <Card className="p-12 text-center">
                <IconCheck className="mx-auto h-12 w-12 text-emerald-500 mb-3 opacity-80" />
                <h3 className="font-semibold text-base text-foreground">
                  No callbacks pending
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  All high-ticket mobile purchase inquiries and callback leads have been attended to within SLA.
                </p>
              </Card>
            ) : (
              filteredCallbacks.map((lead) => {
                const plan = lead.interestedIn || 'General Protocol'
                return (
                  <Card key={lead.id} className="border-border bg-card">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-foreground">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.phone} • Plan: {plan}</p>
                          {lead.notes && (
                            <p className="text-xs text-muted-foreground mt-2 bg-muted/30 p-2 rounded border">
                              {lead.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" asChild>
                            <a href={`tel:${lead.phone}`}>
                              <IconPhone className="h-3.5 w-3.5 text-blue-600" />
                              Call
                            </a>
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" asChild>
                            <a
                              href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(
                                lead.name
                              )},%20this%20is%20FitFlix%20re%20your%20callback%20request.`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <IconBrandWhatsapp className="h-3.5 w-3.5 text-emerald-600" />
                              WhatsApp
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 text-xs gap-1"
                            onClick={async () => {
                              await recordContact.mutateAsync({
                                id: lead.id,
                                channel: 'call',
                              })
                              await updateLead.mutateAsync({
                                id: lead.id,
                                payload: {
                                  status: 'contacted',
                                },
                              })
                              toast.success(`Contact recorded for ${lead.name}`)
                            }}
                          >
                            <IconCheck className="h-3.5 w-3.5" />
                            Done
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* TAB 3: REPORTS */}
        <TabsContent value="reports" className="space-y-4">
          <Card className="p-8 text-center">
            <IconFileText className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm font-semibold">Clinical & DNA Reports</p>
            <p className="text-xs text-muted-foreground">Upload and review pathology records.</p>
          </Card>
        </TabsContent>

        {/* TAB 4: FEEDBACK */}
        <TabsContent value="feedback" className="space-y-4">
          <Card className="p-8 text-center">
            <IconStar className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm font-semibold">Member Reviews & Feedback</p>
            <p className="text-xs text-muted-foreground">Review post-session satisfaction scores.</p>
          </Card>
        </TabsContent>

        {/* TAB 5: BILLING ALERTS */}
        <TabsContent value="system" className="space-y-4">
          <Card className="p-8 text-center">
            <IconAlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm font-semibold">Billing & Renewal Alerts</p>
            <p className="text-xs text-muted-foreground">Membership expirations and pending invoice payments.</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resolve Operational Alert Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Resolve Alert — {resolvingAlert?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm that the operational issue has been resolved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="e.g. Trainer replaced by Coach Rahul, session started on time..."
              value={resolveReason}
              onChange={(e) => setResolveReason(e.target.value)}
              className="text-xs min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmResolve}>
              Confirm Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              placeholder="e.g. Member is interested in the Optimizer protocol, scheduled club tour..."
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
