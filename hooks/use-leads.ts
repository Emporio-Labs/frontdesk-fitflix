import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  leadService,
  Lead,
  LeadInteraction,
  CreateLeadPayload,
  UpdateLeadPayload,
  ConvertLeadPayload,
  buildLeadAnalytics,
  buildReminderSummary,
  buildDailyDigest,
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

// These three hooks share queryKeys.leads.all() — the same key as useLeads().
// React Query deduplicates the HTTP request: only one GET /leads fires even when
// all four hooks are mounted simultaneously. `select` transforms the shared
// cache entry locally without storing the derived value in a separate cache key.

export function useLeadReminders() {
  return useQuery({
    queryKey: queryKeys.leads.all(),
    queryFn: () => leadService.getAll(10),
    select: (data) => buildReminderSummary(data.leads),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  })
}

export function useLeadAnalytics() {
  return useQuery({
    queryKey: queryKeys.leads.all(),
    queryFn: () => leadService.getAll(10),
    select: (data) => buildLeadAnalytics(data.leads),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  })
}

export function useLeadDigest() {
  return useQuery({
    queryKey: queryKeys.leads.all(),
    queryFn: () => leadService.getAll(10),
    select: (data) => buildDailyDigest(buildReminderSummary(data.leads)),
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