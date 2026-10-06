'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import { API_BASE_URL, getStoredToken } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import {
  operationalAlertService,
  type OperationalAlert,
  type QueryAlertsParams,
} from '@/lib/services/operational-alert.service'
import {
  playAlertChime,
  startContinuousAlertNoise,
  stopContinuousAlertNoise,
} from '@/lib/audio-chime'
import { toast } from 'sonner'

export function useOperationalAlerts(branchId?: string | null) {
  const queryClient = useQueryClient()
  const [soundEnabled, setSoundEnabled] = useState(true)
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

  const openAlerts = useMemo(
    () => alerts.filter((a) => a.status === 'open'),
    [alerts]
  )

  const acknowledgedAlerts = useMemo(
    () => alerts.filter((a) => a.status === 'acknowledged'),
    [alerts]
  )

  // FX-35.4: Noise control — chime rings while any alert is OPEN; stops when all are ACKNOWLEDGED
  useEffect(() => {
    if (!soundEnabled) {
      stopContinuousAlertNoise()
      return
    }

    if (openAlerts.length > 0) {
      startContinuousAlertNoise()
    } else {
      stopContinuousAlertNoise()
    }

    return () => {
      stopContinuousAlertNoise()
    }
  }, [openAlerts.length, soundEnabled])

  // Live Socket.IO connection (FX-35.1, FX-35.3, FX-35.5)
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
      if (soundEnabled) {
        playAlertChime()
      }
      toast.error(`Urgent Alert: ${newAlert.title}`, {
        description: newAlert.message,
        duration: 8000,
      })
    })

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

  // FX-35.2: Named acknowledgment mutation
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

  return {
    alerts,
    openAlerts,
    acknowledgedAlerts,
    isLoading,
    refetch,
    soundEnabled,
    setSoundEnabled,
    acknowledgeAlert: (id: string) => acknowledgeMutation.mutateAsync(id),
    resolveAlert: (id: string, reason?: string) =>
      resolveMutation.mutateAsync({ alertId: id, reason }),
    isAcknowledging: acknowledgeMutation.isPending,
    isResolving: resolveMutation.isPending,
  }
}
