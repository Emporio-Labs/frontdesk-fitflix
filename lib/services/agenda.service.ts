import { apiClient } from '@/lib/api-client'
import type { AgendaResult } from '@/types/agenda'

export const agendaService = {
  getMemberAgenda: async (
    userId: string,
    params?: { from?: string; to?: string; timezone?: string },
  ): Promise<AgendaResult> => {
    const query = new URLSearchParams()
    if (params?.from) query.set('from', params.from)
    if (params?.to) query.set('to', params.to)
    if (params?.timezone) query.set('timezone', params.timezone)

    const qs = query.toString()
    const path = `/agenda/user/${userId}${qs ? `?${qs}` : ''}`
    const { data } = await apiClient.get(path)
    return (data.agenda || data) as AgendaResult
  },
}
