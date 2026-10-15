'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import { API_BASE_URL, getStoredToken } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import {
  branchBoardService,
  type BranchBoardItem,
} from '@/lib/services/branch-board.service'

export function useBranchBoard(branchId?: string | null) {
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)
  const [isSocketConnected, setIsSocketConnected] = useState(false)

  const effectiveBranchId =
    branchId && branchId !== 'all' && branchId !== '__all__'
      ? branchId
      : undefined

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: queryKeys.branchBoard.all(effectiveBranchId),
    queryFn: () => branchBoardService.getBoard(effectiveBranchId),
    refetchInterval: 15000, // 15s reactive fallback
    staleTime: 5000,
  })

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
      setIsSocketConnected(true)
      if (effectiveBranchId) {
        socket.emit('join_branch', effectiveBranchId)
      }
    })

    socket.on('disconnect', () => {
      setIsSocketConnected(false)
    })

    const handleRefresh = (payload?: { branchId?: string }) => {
      if (
        !effectiveBranchId ||
        !payload?.branchId ||
        payload.branchId === effectiveBranchId
      ) {
        queryClient.invalidateQueries({
          queryKey: ['branch-board'],
        })
      }
    }

    socket.on('branch_board:refresh', handleRefresh)
    socket.on('operational_alert:new', handleRefresh)
    socket.on('operational_alert:acknowledged', handleRefresh)
    socket.on('operational_alert:resolved', handleRefresh)

    return () => {
      socket.off('branch_board:refresh', handleRefresh)
      socket.off('operational_alert:new', handleRefresh)
      socket.off('operational_alert:acknowledged', handleRefresh)
      socket.off('operational_alert:resolved', handleRefresh)
      socket.disconnect()
      socketRef.current = null
      setIsSocketConnected(false)
    }
  }, [queryClient, effectiveBranchId])

  return {
    branches: (data?.branches ?? []) as BranchBoardItem[],
    asOf: data?.asOf,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
    isSocketConnected,
  }
}
