import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  leadService,
  Lead,
  LeadInteraction,
  CreateLeadPayload,
  UpdateLeadPayload,
  ConvertLeadPayload,
} from '@/lib/services/lead.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useLeads() {
  return useQuery({
    queryKey: queryKeys.leads.all(),
    queryFn: () => leadService.getAll(10),
    select: (data) => data.leads,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => leadService.getById(id, 10),
    select: (data) => data.lead,
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

export function useLeadReminders() {
  return useQuery({
    queryKey: [...queryKeys.leads.all(), 'reminders'],
    queryFn: async () => {
      try {
        return await leadService.getReminders()
      } catch {
        return {
          today: [],
          missed: [],
          generatedAt: '',
          timezone: 'Asia/Kolkata',
        }
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  })
}

export function useLeadAnalytics() {
  return useQuery({
    queryKey: [...queryKeys.leads.all(), 'analytics'],
    queryFn: async () => {
      try {
        return await leadService.getAnalytics()
      } catch {
        return {
          stageCounts: { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 },
          heatDistribution: { cold: 0, warm: 0, hot: 0 },
          dropOff: { newToContacted: 0, contactedToQualified: 0, qualifiedToConverted: 0 },
          stageDurations: {
            new: { totalDays: 0, samples: 0, averageDays: 0 },
            contacted: { totalDays: 0, samples: 0, averageDays: 0 },
            qualified: { totalDays: 0, samples: 0, averageDays: 0 },
            converted: { totalDays: 0, samples: 0, averageDays: 0 },
            lost: { totalDays: 0, samples: 0, averageDays: 0 },
          },
          conversionTimeline: [],
          lifecycleMetrics: {
            totalActiveLeads: 0,
            convertedLeads: 0,
            lostLeads: 0,
            avgContactAttempts: 0,
            avgLeadAgeDays: 0,
          },
        }
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  })
}

export function useLeadDigest() {
  return useQuery({
    queryKey: [...queryKeys.leads.all(), 'digest'],
    queryFn: async () => {
      try {
        return await leadService.getDigest()
      } catch {
        return {}
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  })
}

function replaceLeadInList(list: Lead[] | undefined, updated: Lead): Lead[] {
  if (!Array.isArray(list)) return [updated]
  return list.map((lead) => (lead.id === updated.id ? updated : lead))
}

function getLeadListCache(data: unknown): Lead[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray((data as { leads?: Lead[] }).leads)) {
    return (data as { leads: Lead[] }).leads
  }
  return []
}

function setLeadListCache(data: unknown, updater: (current: Lead[]) => Lead[]): { leads: Lead[] } {
  return { leads: updater(getLeadListCache(data)) }
}

export function useCreateLead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateLeadPayload) => leadService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all() })
      toast.success(data.message || 'Lead created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create lead')
    },
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLeadPayload }) =>
      leadService.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: queryKeys.leads.all() })
      const prev = qc.getQueryData(queryKeys.leads.all())

      const prevLeads = getLeadListCache(prev)
      if (prevLeads.length > 0) {
        const next = prevLeads.map((lead) => {
          if (lead.id !== id) return lead
          const nextStatus = payload.status ?? lead.status
          const nextTemp =
            nextStatus === 'qualified' || nextStatus === 'converted'
              ? 'hot'
              : nextStatus === 'contacted'
                ? 'warm'
                : 'cold'
          return {
            ...lead,
            ...(payload.name !== undefined ? { name: payload.name } : {}),
            ...(payload.email !== undefined ? { email: payload.email } : {}),
            ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
            ...(payload.source !== undefined ? { source: payload.source } : {}),
            ...(payload.interestedIn !== undefined ? { interestedIn: payload.interestedIn } : {}),
            ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
            ...(payload.followUpDate !== undefined ? { followUpDate: payload.followUpDate } : {}),
            ...(payload.assignedStaffName !== undefined ? { assignedStaffName: payload.assignedStaffName } : {}),
            status: nextStatus,
            temperature: nextTemp,
            updatedAt: new Date().toISOString(),
          }
        })
        qc.setQueryData(queryKeys.leads.all(), { leads: next })
      }

      return { prev }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all() })
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(data.lead.id) })
      qc.invalidateQueries({ queryKey: [...queryKeys.leads.all(), 'reminders'] })
      qc.invalidateQueries({ queryKey: [...queryKeys.leads.all(), 'analytics'] })
      toast.success(data.message || 'Lead updated successfully')
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.leads.all(), ctx.prev)
      }
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update lead')
    },
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => leadService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all() })
      qc.invalidateQueries({ queryKey: [...queryKeys.leads.all(), 'reminders'] })
      qc.invalidateQueries({ queryKey: [...queryKeys.leads.all(), 'analytics'] })
      toast.success(data.message || 'Lead deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete lead')
    },
  })
}

export function useConvertLead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ConvertLeadPayload }) =>
      leadService.convert(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all() })
      qc.invalidateQueries({ queryKey: [...queryKeys.leads.all(), 'reminders'] })
      qc.invalidateQueries({ queryKey: [...queryKeys.leads.all(), 'analytics'] })
      toast.success(data.message || 'Lead converted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to convert lead')
    },
  })
}

export function useAddLeadInteraction() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, note, type }: { id: string; note: string; type?: LeadInteraction['type'] }) =>
      leadService.addInteraction(id, { note, type }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.leads.all(), (current) =>
        setLeadListCache(current, (leads) => replaceLeadInList(leads, data.lead))
      )
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(data.lead.id) })
      toast.success(data.message || 'Interaction added')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to add interaction')
    },
  })
}

export function useRecordLeadContactAttempt() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, channel }: { id: string; channel: 'call' | 'whatsapp' | 'email' }) =>
      leadService.recordContactAttempt(id, { channel }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.leads.all(), (current) =>
        setLeadListCache(current, (leads) => replaceLeadInList(leads, data.lead))
      )
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(data.lead.id) })
      qc.invalidateQueries({ queryKey: [...queryKeys.leads.all(), 'reminders'] })
      qc.invalidateQueries({ queryKey: [...queryKeys.leads.all(), 'analytics'] })
      toast.success(data.message || 'Contact attempt recorded')
    },
    onError: (err: any) => {
      if (err?.response?.status === 404 || err?.response?.status === 400) {
        return
      }
      toast.error(err?.response?.data?.message || err?.message || 'Failed to record contact attempt')
    },
  })
}