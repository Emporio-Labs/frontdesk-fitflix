'use client'

import { useMemo } from 'react'
import {
  IconAlertTriangle,
  IconBuildingStore,
  IconClock,
  IconFlame,
  IconInfoCircle,
  IconUserCheck,
  IconVolume,
  IconX,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useOptionalLocationScope } from '@/components/location-scope-provider'
import { useOperationalAlerts } from '@/hooks/use-operational-alerts'

/**
 * FX-38.1 & FX-38.5: Globally Pinned Urgent Alert Stack
 * Pins open alerts across every Frontdesk page.
 * Stacks multiple open alerts in strict order of severity and age.
 * Provides instant acknowledgment that silences all screens (FX-38.4).
 */
export function PinnedAlertStack() {
  const locationScope = useOptionalLocationScope()
  const branchId = locationScope?.selectedLocationId ?? null

  const {
    pinnedAlerts,
    acknowledgeAlert,
    dismissAlert,
    isAcknowledging,
  } = useOperationalAlerts(branchId)

  if (pinnedAlerts.length === 0) return null

  return (
    <aside
      aria-label="Urgent Operational Alerts"
      className="fixed bottom-5 right-5 z-50 flex max-h-[85vh] w-full max-w-[420px] flex-col gap-3 overflow-y-auto p-1 pointer-events-auto"
    >
      {pinnedAlerts.map((alert, index) => {
        const isCritical = alert.severity === 'critical'
        const isWarning = alert.severity === 'warning'
        const branchName =
          typeof alert.branchId === 'object' && alert.branchId !== null
            ? (alert.branchId as any).name
            : 'Club'

        return (
          <div
            key={alert._id}
            role="alert"
            aria-live={isCritical ? 'assertive' : 'polite'}
            className={`relative rounded-xl p-4 shadow-2xl transition-all duration-300 border ${
              isCritical
                ? 'border-2 border-rose-500 bg-rose-50/95 dark:bg-rose-950/95 ring-4 ring-rose-500/20 animate-in slide-in-from-bottom-3'
                : isWarning
                ? 'border-amber-400 bg-amber-50/95 dark:bg-amber-950/95 shadow-amber-500/10'
                : 'border-border bg-card/95 shadow-md'
            }`}
          >
            {/* Header / Severity Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={
                    isCritical
                      ? 'destructive'
                      : isWarning
                      ? 'secondary'
                      : 'outline'
                  }
                  className={`text-[10px] font-extrabold uppercase tracking-wide gap-1 ${
                    isCritical ? 'bg-rose-600 text-white animate-pulse' : ''
                  }`}
                >
                  {isCritical ? (
                    <>
                      <IconFlame className="h-3.5 w-3.5" />
                      <span>CRITICAL ALARM</span>
                    </>
                  ) : isWarning ? (
                    <>
                      <IconAlertTriangle className="h-3 w-3 text-amber-600" />
                      <span>WARNING</span>
                    </>
                  ) : (
                    <span>INFO</span>
                  )}
                </Badge>

                {branchName && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <IconBuildingStore className="h-3 w-3" />
                    <span>{branchName}</span>
                  </span>
                )}
              </div>

              {/* Dismiss button for warnings & info (FX-38.2) */}
              {!isCritical && (
                <button
                  type="button"
                  onClick={() => dismissAlert(alert._id)}
                  title="Dismiss from screen"
                  className="rounded p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
                >
                  <IconX className="h-4 w-4" />
                </button>
              )}

              {/* Repeating Audio Indicator for critical alerts (FX-38.1) */}
              {isCritical && (
                <span
                  title="Repeating alarm audio is sounding"
                  className="flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/80 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300"
                >
                  <IconVolume className="h-3.5 w-3.5 animate-bounce" />
                  <span>SOUNDING</span>
                </span>
              )}
            </div>

            {/* Alert Content */}
            <div className="mt-2 space-y-1">
              <h4 className="font-bold text-sm text-foreground tracking-tight">
                {alert.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {alert.message}
              </p>

              {alert.relatedEntity?.summary && (
                <p className="mt-1.5 rounded bg-black/5 dark:bg-white/5 px-2 py-1 text-[11px] font-semibold text-foreground/90">
                  Target: {alert.relatedEntity.summary}
                </p>
              )}
            </div>

            {/* Footer & Actions */}
            <div className="mt-3.5 flex items-center justify-between border-t border-border/40 pt-2.5">
              <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <IconClock className="h-3 w-3" />
                <span>
                  {new Date(alert.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </span>

              <div className="flex items-center gap-2">
                {isWarning && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-muted-foreground"
                    onClick={() => dismissAlert(alert._id)}
                  >
                    Dismiss
                  </Button>
                )}

                {/* Instant Acknowledge Button (FX-38.1 & FX-38.4) */}
                <Button
                  size="sm"
                  variant={isCritical ? 'destructive' : 'default'}
                  disabled={isAcknowledging}
                  onClick={() => acknowledgeAlert(alert._id)}
                  className={`h-7 text-xs font-bold gap-1 shadow-sm ${
                    isCritical
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : ''
                  }`}
                >
                  <IconUserCheck className="h-3.5 w-3.5" />
                  <span>Acknowledge</span>
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </aside>
  )
}
