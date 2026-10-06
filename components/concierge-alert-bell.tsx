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
  IconArrowRight,
  IconVolume,
  IconVolumeOff,
  IconUserCheck,
  IconShield,
  IconChecklist,
} from '@tabler/icons-react'
import { useLeads, useUpdateLead, useRecordLeadContactAttempt } from '@/hooks/use-leads'
import { Lead } from '@/lib/services/lead.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useOptionalLocationScope } from '@/components/location-scope-provider'
import { useOperationalAlerts } from '@/hooks/use-operational-alerts'
import { toast } from 'sonner'

const SLA_MINUTES = 15

export function ConciergeAlertBell() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'alerts' | 'leads'>('alerts')
  const [now, setNow] = useState<number>(() => Date.now())

  const locationScope = useOptionalLocationScope()
  const branchId = locationScope?.selectedLocationId ?? null

  // Operational alerts via live socket + DB persistence (FX-35)
  const {
    alerts: operationalAlerts,
    openAlerts,
    acknowledgedAlerts,
    soundEnabled,
    setSoundEnabled,
    acknowledgeAlert,
    resolveAlert,
    isAcknowledging,
    isResolving,
  } = useOperationalAlerts(branchId)

  // In-app purchase and concierge leads
  const { data: leads = [] } = useLeads()
  const updateLead = useUpdateLead()
  const recordContact = useRecordLeadContactAttempt()

  // Keep a 1-second interval for countdown timers
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Filter high-priority callback inquiries
  const activeCallbacks = useMemo(() => {
    return leads
      .filter((lead) => {
        const isAppFallback =
          lead.source?.toUpperCase().includes('APP') ||
          lead.notes?.includes('[APP_PURCHASE_FALLBACK]') ||
          lead.tags?.includes('callback')
        const isNew = lead.status === 'new'
        return isAppFallback && isNew
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [leads])

  const totalUrgentCount = openAlerts.length + activeCallbacks.length

  const handleMarkContacted = async (lead: Lead) => {
    try {
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
    } catch {
      toast.error('Failed to update lead status')
    }
  }

  const formatTime = (iso?: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`relative h-9 gap-1.5 px-3 rounded-full border transition-all ${
            openAlerts.length > 0
              ? 'border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
              : totalUrgentCount > 0
              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              : 'border-border/60 hover:bg-accent'
          }`}
        >
          <IconBellRinging
            className={`h-4 w-4 ${
              openAlerts.length > 0
                ? 'text-rose-600 dark:text-rose-400'
                : totalUrgentCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground'
            }`}
          />
          <span className="font-semibold text-xs tracking-tight">Alerts</span>

          {totalUrgentCount > 0 && (
            <Badge
              variant="destructive"
              className="h-4 min-w-[16px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center -mr-1"
            >
              {totalUrgentCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[420px] p-0 shadow-2xl rounded-xl border border-border/80 overflow-hidden"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-border/60 p-3 bg-muted/40">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm tracking-tight">Operational Alerts</h4>
            {openAlerts.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 uppercase">
                {openAlerts.length} Unacknowledged
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
            >
              {soundEnabled ? (
                <IconVolume className="h-4 w-4 text-emerald-600" />
              ) : (
                <IconVolumeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border/60 bg-muted/20 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${
              activeTab === 'alerts'
                ? 'border-primary font-bold text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Staff Alerts ({operationalAlerts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${
              activeTab === 'leads'
                ? 'border-primary font-bold text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Hot Callbacks ({activeCallbacks.length})
          </button>
        </div>

        {/* Main Content Area */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40 p-2 space-y-2">
          {activeTab === 'alerts' ? (
            operationalAlerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <IconCheck className="mx-auto h-8 w-8 text-emerald-500 mb-2 opacity-60" />
                No active operational alerts. Everything is running smoothly.
              </div>
            ) : (
              operationalAlerts.map((alert) => {
                const isOpen = alert.status === 'open'
                const isAck = alert.status === 'acknowledged'

                return (
                  <div
                    key={alert._id}
                    className={`p-3 rounded-lg border transition-all ${
                      isOpen
                        ? 'border-rose-300 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
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
                        <span className="font-semibold text-xs text-foreground truncate max-w-[220px]">
                          {alert.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(alert.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1.5">
                      {alert.message}
                    </p>

                    {alert.relatedEntity?.summary && (
                      <p className="text-[11px] font-medium text-foreground/80 mt-1 bg-muted/40 px-2 py-1 rounded">
                        Target: {alert.relatedEntity.summary}
                      </p>
                    )}

                    {/* Status & Action Buttons */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40 text-xs">
                      {isOpen ? (
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping inline-block" />
                            Unacknowledged
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs px-3 font-semibold shadow-sm"
                            disabled={isAcknowledging}
                            onClick={() => acknowledgeAlert(alert._id)}
                          >
                            <IconUserCheck className="h-3.5 w-3.5 mr-1" />
                            Acknowledge
                          </Button>
                        </div>
                      ) : isAck ? (
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                            ✓ Ack by {alert.acknowledgedBy?.name || 'Staff'} ({formatTime(alert.acknowledgedAt)})
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                            disabled={isResolving}
                            onClick={() => resolveAlert(alert._id, 'Manually resolved')}
                          >
                            Resolve
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Resolved</span>
                      )}
                    </div>
                  </div>
                )
              })
            )
          ) : (
            // Leads Callbacks view
            activeCallbacks.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <IconCheck className="mx-auto h-8 w-8 text-emerald-500 mb-2 opacity-60" />
                All callback requests have been handled.
              </div>
            ) : (
              activeCallbacks.map((lead) => {
                const plan = lead.interestedIn || 'General'
                return (
                  <div key={lead.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-xs text-foreground">{lead.name}</p>
                        <p className="text-[11px] text-muted-foreground">{lead.phone} • {plan}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(lead.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2.5">
                      <Button size="sm" variant="outline" className="h-6 text-xs flex-1 gap-1" asChild>
                        <a href={`tel:${lead.phone}`}>
                          <IconPhone className="h-3 w-3 text-blue-600" />
                          Call
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-xs flex-1 gap-1" asChild>
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(
                            lead.name
                          )},%20this%20is%20FitFlix%20re%20your%20callback%20request.`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IconBrandWhatsapp className="h-3 w-3 text-emerald-600" />
                          WhatsApp
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-6 text-xs px-2 gap-1"
                        onClick={() => handleMarkContacted(lead)}
                      >
                        <IconCheck className="h-3 w-3" />
                        Done
                      </Button>
                    </div>
                  </div>
                )
              })
            )
          )}
        </div>

        {/* Footer Link to Hub */}
        <div className="border-t border-border/60 p-2 bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link href="/admin/alerts">
              <span>Open Operational Alerts Center</span>
              <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
