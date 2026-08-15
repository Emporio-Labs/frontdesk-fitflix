import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { liveSessionService, type LiveSession } from '@/lib/services/live-session.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

// Returns scheduled sessions for ONLINE and HYBRID classes (for live stream panels & video hosting)
export function useLiveSessions() {
  return useQuery({
    queryKey: queryKeys.liveSessions.allDeliveryTypes(),
    queryFn: () => liveSessionService.getAll({ includeOffline: true }),
    select: (data) =>
      data.sessions.filter(
        (s: LiveSession) => s.deliveryType === 'ONLINE' || s.deliveryType === 'HYBRID'
      ),
    staleTime: 30_000,
  })
}

// Same base query as useLiveSessions(), includes OFFLINE occurrences too — for
// callers that need every class's schedule (e.g. deriving which Group Classes
// have finished). Shares the query key/cache so both hooks resolve instantly together.
export function useAllScheduledSessions() {
  return useQuery({
    queryKey: queryKeys.liveSessions.allDeliveryTypes(),
    queryFn: () => liveSessionService.getAll({ includeOffline: true }),
    select: (data) => data.sessions,
    staleTime: 30_000,
  })
}

export function useEndSession() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => liveSessionService.endSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveSessions.allDeliveryTypes() })
      queryClient.invalidateQueries({ queryKey: queryKeys.liveSessions.all() })
      toast.success('Session ended successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to end session')
    }
  })
}

