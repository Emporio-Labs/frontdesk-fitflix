import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  leadService,
  Lead,
  CreateLeadPayload,
  UpdateLeadPayload,
  ConvertLeadPayload,
  LogLeadActivityPayload,
  buildReminderSummary,
} from '@/lib/services/lead.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useLeads(options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? true
  return useQuery({
    queryKey: queryKeys.leads.all(),
    queryFn: () => leadService.getAll(),
    select: (data) => data.leads,
    enabled: isEnabled,
    staleTime: 0,
    refetchOnWindowFocus: isEnabled,
    refetchInterval: isEnabled ? 10000 : false,
    // A trainer without lead access gets 403; don't hammer it.
    retry: (count, err: any) => err?.response?.status !== 403 && count < 1,
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => leadService.getById(id),
    select: (data) => data.lead,
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

// Shares queryKeys.leads.all() with useLeads(), so only one GET /leads fires;
// `select` derives the reminders locally.
export function useLeadReminders() {
  return useQuery({
    queryKey: queryKeys.leads.all(),
    queryFn: () => leadService.getAll(),
    select: (data) => buildReminderSummary(data.leads),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
    retry: (count, err: any) => err?.response?.status !== 403 && count < 1,
  })
}

/** The outcome list the "Log outcome" dialog offers. Changes only on deploy. */
export function useLeadOutcomes() {
  return useQuery({
    queryKey: queryKeys.leads.outcomes(),
    queryFn: () => leadService.getOutcomes(),
    staleTime: Infinity,
  })
}

export function useLeadActivities(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leads.activities(id ?? ''),
    queryFn: () => leadService.getActivities(id!),
    enabled: !!id,
    staleTime: 0,
  })
}

export function useLeadTeamAnalytics(params: { from?: string; to?: string; locationId?: string }, enabled = true) {
  return useQuery({
    queryKey: queryKeys.leads.teamAnalytics(params),
    queryFn: () => leadService.getTeamAnalytics(params),
    enabled,
  })
}

function replaceLeadInList(list: Lead[], updated: Lead): Lead[] {
  return list.map((lead) => (lead.id === updated.id ? updated : lead))
}

function getLeadListCache(data: unknown): Lead[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray((data as { leads?: Lead[] }).leads)) {
    return (data as { leads: Lead[] }).leads
  }
  return []
}

export function extractLeadErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data
  const base = data?.error || data?.message || fallback

  const fieldMessages: string[] = []
  const issues = Array.isArray(data?.details) ? data.details : Array.isArray(data?.errors) ? data.errors : null
  if (issues) {
    for (const issue of issues) {
      if (!issue || typeof issue !== 'object') continue
      const path = Array.isArray(issue.path) ? issue.path.join('.') : ''
      if (typeof issue.message === 'string') {
        fieldMessages.push(path ? `${path}: ${issue.message}` : issue.message)
      }
    }
  }

  return fieldMessages.length ? `${base} — ${fieldMessages.join('; ')}` : base
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
      toast.error(extractLeadErrorMessage(err, 'Failed to create lead'))
    },
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLeadPayload }) =>
      leadService.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: queryKeys.leads.all(), exact: true })
      const prev = qc.getQueryData(queryKeys.leads.all())
      const prevLeads = getLeadListCache(prev)
      if (prevLeads.length > 0) {
        qc.setQueryData(queryKeys.leads.all(), {
          leads: prevLeads.map((lead) =>
            lead.id !== id
              ? lead
              : {
                  ...lead,
                  ...(payload.status !== undefined ? { status: payload.status } : {}),
                  ...(payload.temperature !== undefined ? { temperature: payload.temperature } : {}),
                  ...(payload.followUpDate !== undefined ? { followUpDate: payload.followUpDate } : {}),
                  ...(payload.visitAt !== undefined ? { visitAt: payload.visitAt ?? undefined } : {}),
                },
          ),
        })
      }
      return { prev }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all() })
      toast.success(data.message || 'Lead updated successfully')
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.leads.all(), ctx.prev)
      toast.error(extractLeadErrorMessage(err, 'Failed to update lead'))
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

/**
 * Log a note or an outcome. Puts the updated lead straight into the list so
 * the card moves at once, and refreshes that lead's timeline.
 */
export function useLogLeadActivity() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LogLeadActivityPayload }) =>
      leadService.logActivity(id, payload),
    onSuccess: (data, { id }) => {
      // Only a full lead goes into the list; never let a partial one blank a card.
      if (data.lead?.id && data.lead.name) {
        const updated = data.lead
        qc.setQueryData(queryKeys.leads.all(), (current: unknown) =>
          current ? { leads: replaceLeadInList(getLeadListCache(current), updated) } : current,
        )
      }
      qc.invalidateQueries({ queryKey: queryKeys.leads.activities(id) })
      qc.invalidateQueries({ queryKey: queryKeys.leads.all(), exact: true })
    },
    onError: (err: any) => {
      toast.error(extractLeadErrorMessage(err, 'Could not save'))
    },
  })
}
