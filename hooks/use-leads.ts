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
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => leadService.getById(id, 10),
    select: (data) => data.lead,
    enabled: !!id,
  })
}

export function useLeadReminders() {
  return useQuery({
    queryKey: [...queryKeys.leads.all(), 'reminders'],
    queryFn: leadService.getReminders,
  })
}

export function useLeadAnalytics() {
  return useQuery({
    queryKey: [...queryKeys.leads.all(), 'analytics'],
    queryFn: leadService.getAnalytics,
  })
}

export function useLeadDigest() {
  return useQuery({
    queryKey: [...queryKeys.leads.all(), 'digest'],
    queryFn: leadService.getDigest,
  })
}

function replaceLeadInList(list: Lead[] | undefined, updated: Lead): Lead[] {
  if (!Array.isArray(list)) return [updated]
  return list.map((lead) => (lead.id === updated.id ? updated : lead))
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
      const prev = qc.getQueryData<Lead[]>(queryKeys.leads.all())

      if (prev) {
        const next = prev.map((lead) => {
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
        qc.setQueryData(queryKeys.leads.all(), next)
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
      qc.setQueryData<Lead[]>(queryKeys.leads.all(), (current) => replaceLeadInList(current, data.lead))
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
      qc.setQueryData<Lead[]>(queryKeys.leads.all(), (current) => replaceLeadInList(current, data.lead))
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(data.lead.id) })
      qc.invalidateQueries({ queryKey: [...queryKeys.leads.all(), 'reminders'] })
      qc.invalidateQueries({ queryKey: [...queryKeys.leads.all(), 'analytics'] })
      toast.success(data.message || 'Contact attempt recorded')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to record contact attempt')
    },
  })
}