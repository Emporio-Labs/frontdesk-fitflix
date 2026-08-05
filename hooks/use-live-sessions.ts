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
