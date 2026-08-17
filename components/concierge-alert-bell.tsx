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
import { toast } from 'sonner'

const SLA_MINUTES = 15

export function ConciergeAlertBell() {
  const [open, setOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [now, setNow] = useState<number>(() => Date.now())

  const { data: leads = [] } = useLeads()
  const updateLead = useUpdateLead()
  const recordContact = useRecordLeadContactAttempt()

  // Keep a 1-second interval for real-time SLA countdown clocks
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Filter high-priority callback inquiries (source APP_PAYMENT_FALLBACK or notes containing fallback or status 'new' with phone)
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

  // SLA calculations
  const callbackStats = useMemo(() => {
    let breached = 0
    let urgent = 0

    activeCallbacks.forEach((lead) => {
      const created = new Date(lead.createdAt).getTime()
      const elapsedMins = (now - created) / (1000 * 60)
      if (elapsedMins > SLA_MINUTES) {
        breached++
      } else if (elapsedMins > SLA_MINUTES - 5) {
        urgent++
      }
    })

    return { total: activeCallbacks.length, breached, urgent }
  }, [activeCallbacks, now])

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
      toast.error('Failed to update lead status')
    }
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

  const parsePlanName = (notes: string) => {
    const match = notes.match(/Inquiring about plan:\s*([^.]+)/i)
    return match ? match[1].trim() : 'Custom Protocol'
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-9 gap-1.5 border-border/80 px-2.5 shadow-sm transition-all hover:bg-accent/40"
          aria-label="Concierge Alerts"
        >
          <IconBellRinging
            className={`h-4 w-4 ${
              callbackStats.breached > 0
                ? 'animate-bounce text-red-500'
                : callbackStats.total > 0
                ? 'animate-pulse text-amber-500'
                : 'text-muted-foreground'
            }`}
          />
          <span className="hidden text-xs font-semibold sm:inline">Concierge</span>

          {callbackStats.total > 0 && (
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white shadow-sm ${
                callbackStats.breached > 0
                  ? 'bg-red-600 animate-pulse'
                  : callbackStats.urgent > 0
                  ? 'bg-amber-600'
                  : 'bg-emerald-600'
              }`}
            >
              {callbackStats.total}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-96 rounded-2xl border border-border/80 p-0 shadow-2xl backdrop-blur-xl bg-background/95"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <IconBellRinging className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Concierge Action Center
              </h4>
              <p className="text-[11px] text-muted-foreground">
                15-Minute High-Ticket Callbacks
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Chimes' : 'Unmute Chimes'}
          >
            {soundEnabled ? (
              <IconVolume className="h-3.5 w-3.5" />
            ) : (
              <IconVolumeOff className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Callback Items List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
          {activeCallbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-3">
                <IconCheck className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">All Caught Up!</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                No pending high-ticket callback requests right now.
              </p>
            </div>
          ) : (
            activeCallbacks.map((lead) => {
              const countdown = formatCountdown(lead.createdAt)
              const plan = parsePlanName(lead.notes)

              return (
                <div
                  key={lead.id}
                  className={`p-3.5 transition-colors hover:bg-muted/30 ${
                    countdown.isBreached
                      ? 'bg-red-500/[0.04]'
                      : countdown.isUrgent
                      ? 'bg-amber-500/[0.04]'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground">
                          {lead.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="h-4 text-[10px] px-1.5 font-bold uppercase tracking-wider bg-primary/10 text-primary border-0"
                        >
                          {plan}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {lead.phone}
                      </p>
                    </div>

                    {/* Live SLA Countdown Badge */}
                    <div
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        countdown.isBreached
                          ? 'bg-red-600 text-white animate-pulse'
                          : countdown.isUrgent
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {countdown.isBreached ? (
                        <IconAlertTriangle className="h-3 w-3" />
                      ) : (
                        <IconClock className="h-3 w-3" />
                      )}
                      <span>{countdown.text}</span>
                    </div>
                  </div>

                  {lead.notes && (
                    <p className="text-xs text-muted-foreground/90 mt-2 line-clamp-2 bg-muted/40 p-2 rounded-lg border border-border/40">
                      {lead.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs flex-1 gap-1"
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
                      className="h-7 text-xs flex-1 gap-1"
                      asChild
                    >
                      <a
                        href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(
                          lead.name
                        )},%20this%20is%20FitFlix%20Concierge%20reaching%20out%20regarding%20your%20${encodeURIComponent(
                          plan
                        )}%20membership%20protocol.`}
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
                      className="h-7 text-xs px-2.5 gap-1 bg-foreground text-background hover:bg-foreground/90"
                      onClick={() => handleMarkContacted(lead)}
                    >
                      <IconCheck className="h-3.5 w-3.5" />
                      Done
                    </Button>
                  </div>
                </div>
              )
            })
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
              <span>Open Concierge Command Center</span>
              <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
