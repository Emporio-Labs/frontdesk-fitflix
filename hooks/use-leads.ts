import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  leadService,
  CreateLeadPayload,
  UpdateLeadPayload,
  ConvertLeadPayload,
} from '@/lib/services/lead.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useLeads() {
  return useQuery({
    queryKey: queryKeys.leads.all(),
    queryFn: leadService.getAll,
    select: (data) => data.leads,
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => leadService.getById(id),
    select: (data) => data.lead,
    enabled: !!id,
  })
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
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all() })
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(data.lead.id) })
      toast.success(data.message || 'Lead updated successfully')
    },
    onError: (err: any) => {
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