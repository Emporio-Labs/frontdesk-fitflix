'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import { API_BASE_URL, getStoredToken } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import {
  operationalAlertService,
  type OperationalAlert,
} from '@/lib/services/operational-alert.service'
import {
  playSingleWarningChime,
  startContinuousAlertNoise,
  stopContinuousAlertNoise,
  type SoundType,
} from '@/lib/audio-chime'
import { toast } from 'sonner'

export function useOperationalAlerts(branchId?: string | null) {
  const queryClient = useQueryClient()
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set())
  const socketRef = useRef<Socket | null>(null)

  const effectiveBranchId = branchId && branchId !== 'all' ? branchId : undefined

  // FX-35.3: Stored in DB and reloaded on page load / reconnect
  const {
    data: alerts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.operationalAlerts.active(effectiveBranchId),
    queryFn: () => operationalAlertService.getActiveAlerts(effectiveBranchId),
    refetchInterval: 15000, // Background polling fallback in case socket drops
  })

  // Open alerts (unacknowledged)
  const openAlerts = useMemo(
    () => alerts.filter((a) => a.status === 'open'),
    [alerts]
  )

  // Unacknowledged Critical alerts (must repeat sound until ack - FX-38.1)
  const criticalOpenAlerts = useMemo(
    () => openAlerts.filter((a) => a.severity === 'critical'),
    [openAlerts]
  )

  // Acknowledged alerts (under fix)
  const acknowledgedAlerts = useMemo(
    () => alerts.filter((a) => a.status === 'acknowledged'),
    [alerts]
  )

  // Active alerts for pinned stack, sorted by severity and age (FX-38.5)
  // Severity order: critical (1) -> warning (2) -> info (3)
  // Age order within same severity: oldest first (earliest createdAt)
  const pinnedAlerts = useMemo(() => {
    const severityRank: Record<string, number> = {
      critical: 1,
      warning: 2,
      info: 3,
    }

    return openAlerts
      .filter((a) => !dismissedAlertIds.has(a._id))
      .sort((a, b) => {
        const rankA = severityRank[a.severity] ?? 99
        const rankB = severityRank[b.severity] ?? 99
        if (rankA !== rankB) return rankA - rankB
        // Oldest first so overdue alerts stay on top
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })
  }, [openAlerts, dismissedAlertIds])

  // FX-38.1 & FX-38.2: Noise control
  // - Critical alerts play repeating sound until acknowledged
  // - When no critical alerts are open, noise stops immediately (FX-38.4)
  useEffect(() => {
    if (!soundEnabled) {
      stopContinuousAlertNoise()
      return
    }

    if (criticalOpenAlerts.length > 0) {
      const topSound = (criticalOpenAlerts[0] as any).sound || 'siren'
      startContinuousAlertNoise(topSound as SoundType)
    } else {
      stopContinuousAlertNoise()
    }

    return () => {
      stopContinuousAlertNoise()
    }
  }, [criticalOpenAlerts.length, soundEnabled, criticalOpenAlerts])

  // Live Socket.IO connection (FX-35.1, FX-35.3, FX-38.4)
  useEffect(() => {
    const token = getStoredToken()
    if (!token) return

    const socketUrl = API_BASE_URL.replace(/\/api\/v1$/, '').replace(/\/api$/, '')
    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: {
        token,
        branchId: effectiveBranchId,
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      if (effectiveBranchId) {
        socket.emit('join_branch', effectiveBranchId)
      }
    })

    socket.on('operational_alert:new', (newAlert: OperationalAlert) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.operationalAlerts.active(effectiveBranchId),
      })

      // FX-38.2: Warning plays single chime; info is silent; critical starts repeating loop
      if (soundEnabled) {
        if (newAlert.severity === 'warning') {
          playSingleWarningChime(((newAlert as any).sound || 'chime') as SoundType)
        }
      }

      toast.error(`Urgent Alert: ${newAlert.title}`, {
        description: newAlert.message,
        duration: 8000,
      })
    })

    // FX-38.4: Acknowledging on one screen silences it on EVERY screen
    socket.on('operational_alert:acknowledged', () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.operationalAlerts.active(effectiveBranchId),
      })
    })

    socket.on('operational_alert:resolved', () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.operationalAlerts.active(effectiveBranchId),
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [effectiveBranchId, queryClient, soundEnabled])

  // FX-35.2 & FX-38.4: Named acknowledgment mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) =>
      operationalAlertService.acknowledgeAlert(alertId),
    onSuccess: (updatedAlert) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.operationalAlerts.active(effectiveBranchId),
      })
      toast.success(
        `Alert acknowledged by ${updatedAlert.acknowledgedBy?.name || 'you'}`
      )
    },
    onError: (err: any) => {
      toast.error('Failed to acknowledge alert', {
        description: err.response?.data?.error || err.message,
      })
    },
  })

  // Manual resolution mutation
  const resolveMutation = useMutation({
    mutationFn: ({ alertId, reason }: { alertId: string; reason?: string }) =>
      operationalAlertService.resolveAlert(alertId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.operationalAlerts.active(effectiveBranchId),
      })
      toast.success('Alert resolved and removed from board')
    },
    onError: (err: any) => {
      toast.error('Failed to resolve alert', {
        description: err.response?.data?.error || err.message,
      })
    },
  })

  // FX-38.2: Dismiss warning alert from pinned screen
  const dismissAlert = (alertId: string) => {
    setDismissedAlertIds((prev) => new Set([...prev, alertId]))
  }

  return {
    alerts,
    openAlerts,
    criticalOpenAlerts,
    acknowledgedAlerts,
    pinnedAlerts,
    isLoading,
    refetch,
    soundEnabled,
    setSoundEnabled,
    dismissAlert,
    acknowledgeAlert: (id: string) => acknowledgeMutation.mutateAsync(id),
    resolveAlert: (id: string, reason?: string) =>
      resolveMutation.mutateAsync({ alertId: id, reason }),
    isAcknowledging: acknowledgeMutation.isPending,
    isResolving: resolveMutation.isPending,
  }
}
