import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { liveSessionService } from '@/lib/services/live-session.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useLiveSessions() {
  return useQuery({
    queryKey: queryKeys.liveSessions.all(),
    queryFn: () => liveSessionService.getAll(),
    select: (data) => data.sessions,
    refetchOnWindowFocus: true,
    refetchInterval: 30000
  })
}

// Same shape as useLiveSessions(), but includes OFFLINE occurrences too — for
// callers that need every class's schedule (e.g. deriving which Group Classes
// have finished), not just the online-sessions view LiveSessionsPanel shows.
export function useAllScheduledSessions() {
  return useQuery({
    queryKey: queryKeys.liveSessions.allDeliveryTypes(),
    queryFn: () => liveSessionService.getAll({ includeOffline: true }),
    select: (data) => data.sessions,
    refetchOnWindowFocus: true,
    refetchInterval: 30000
  })
}

export function useEndSession() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => liveSessionService.endSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveSessions.all() })
      toast.success('Session ended successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to end session')
    }
  })
}
