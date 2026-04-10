import { apiClient } from '@/lib/api-client'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type LeadTemperature = 'cold' | 'warm' | 'hot'

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  source: string
  status: LeadStatus
  notes: string
  interestedIn: string
  temperature: LeadTemperature
  tags: string[]
  ownerId: string
  createdAt: string
  followUpDate?: string
}

export interface CreateLeadPayload {
  name: string
  email: string
  phone?: string
  source?: string
  interestedIn?: string
  temperature?: LeadTemperature
  notes?: string
  tags?: string[]
  ownerId?: string
  followUpDate?: string
}

export interface UpdateLeadPayload {
  name?: string
  email?: string
  phone?: string
  source?: string
  status?: LeadStatus
  interestedIn?: string
  temperature?: LeadTemperature
  notes?: string
  tags?: string[]
  ownerId?: string
  followUpDate?: string
}

export interface ConvertLeadPayload {
  username?: string
  phone: string
  age: string
  gender: number
  healthGoals: string[]
  password: string
}

function toUiStatus(value: unknown): LeadStatus {
  const v = String(value ?? '').toLowerCase()
  if (v === 'new') return 'new'
  if (v === 'contacted') return 'contacted'
  if (v === 'qualified') return 'qualified'
  if (v === 'converted') return 'converted'
  if (v === 'lost') return 'lost'
  return 'new'
}

function toApiStatus(value: LeadStatus | undefined): string | undefined {
  if (!value) return undefined
  const map: Record<LeadStatus, string> = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    converted: 'Converted',
    lost: 'Lost',
  }
  return map[value]
}

function getTemperatureFromTags(tags: string[], status: LeadStatus): LeadTemperature {
  const match = tags.find((tag) => tag.toLowerCase().startsWith('temperature:'))
  if (match) {
    const parsed = match.split(':')[1]?.toLowerCase()
    if (parsed === 'cold' || parsed === 'warm' || parsed === 'hot') {
      return parsed
    }
  }

  if (status === 'qualified') return 'hot'
  if (status === 'contacted') return 'warm'
  return 'cold'
}

function withoutTemperatureTags(tags: string[]): string[] {
  return tags.filter((tag) => !tag.toLowerCase().startsWith('temperature:'))
}

function withTemperatureTag(tags: string[], temperature?: LeadTemperature): string[] {
  const base = withoutTemperatureTags(tags)
  if (!temperature) return base
  return [...base, `temperature:${temperature}`]
}

function normalizeLead(raw: any): Lead {
  const status = toUiStatus(raw?.status)
  const tags = Array.isArray(raw?.tags) ? raw.tags.map((tag: unknown) => String(tag)) : []
  const followUpSource =
    raw?.followUpDate ?? raw?.followUp ?? raw?.followupDate ?? raw?.follow_up_date

  return {
    id: String(raw?._id || raw?.id || ''),
    name: String(raw?.leadName || raw?.name || ''),
    email: String(raw?.email || ''),
    phone: String(raw?.phone || ''),
    source: String(raw?.source || 'other'),
    status,
    notes: String(raw?.notes || ''),
    interestedIn: String(raw?.interestedIn || ''),
    temperature: getTemperatureFromTags(tags, status),
    tags,
    ownerId: String(raw?.ownerId || ''),
    createdAt: String(raw?.createdAt || '').split('T')[0],
    followUpDate: followUpSource ? String(followUpSource).split('T')[0] : undefined,
  }
}

function toCreatePayload(payload: CreateLeadPayload) {
  const tags = withTemperatureTag(payload.tags ?? [], payload.temperature)
  const followUp = payload.followUpDate
    ? { followUpDate: payload.followUpDate, followUp: payload.followUpDate }
    : {}

  return {
    leadName: payload.name,
    email: payload.email,
    ...(payload.phone ? { phone: payload.phone } : {}),
    ...(payload.source ? { source: payload.source } : {}),
    ...(payload.interestedIn ? { interestedIn: payload.interestedIn } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
    ...(tags.length ? { tags } : {}),
    ...(payload.ownerId ? { ownerId: payload.ownerId } : {}),
    ...followUp,
  }
}

function toUpdatePayload(payload: UpdateLeadPayload) {
  const tags = payload.tags !== undefined
    ? withTemperatureTag(payload.tags, payload.temperature)
    : undefined
  const followUp = payload.followUpDate !== undefined
    ? { followUpDate: payload.followUpDate, followUp: payload.followUpDate }
    : {}

  return {
    ...(payload.name !== undefined ? { leadName: payload.name } : {}),
    ...(payload.email !== undefined ? { email: payload.email } : {}),
    ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
    ...(payload.source !== undefined ? { source: payload.source } : {}),
    ...(payload.status !== undefined ? { status: toApiStatus(payload.status) } : {}),
    ...(payload.interestedIn !== undefined ? { interestedIn: payload.interestedIn } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    ...(tags !== undefined ? { tags } : {}),
    ...(payload.ownerId !== undefined ? { ownerId: payload.ownerId } : {}),
    ...followUp,
  }
}

export const leadService = {
  getAll: async (): Promise<{ leads: Lead[] }> => {
    const { data } = await apiClient.get('/leads')
    const list = Array.isArray(data?.leads) ? data.leads : Array.isArray(data) ? data : []
    return { leads: list.map(normalizeLead) }
  },

  getById: async (id: string): Promise<{ lead: Lead }> => {
    const { data } = await apiClient.get(`/leads/${id}`)
    return { lead: normalizeLead(data?.lead || data) }
  },

  create: async (payload: CreateLeadPayload): Promise<{ message: string; lead: Lead }> => {
    const { data } = await apiClient.post('/leads', toCreatePayload(payload))
    return {
      message: data?.message || 'Lead created successfully',
      lead: normalizeLead(data?.lead || data),
    }
  },

  update: async (id: string, payload: UpdateLeadPayload): Promise<{ message: string; lead: Lead }> => {
    const { data } = await apiClient.patch(`/leads/${id}`, toUpdatePayload(payload))
    return {
      message: data?.message || 'Lead updated successfully',
      lead: normalizeLead(data?.lead || data),
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/leads/${id}`)
    return { message: data?.message || 'Lead deleted successfully' }
  },

  convert: async (id: string, payload: ConvertLeadPayload): Promise<{ message: string; lead?: Lead }> => {
    const { data } = await apiClient.post(`/leads/${id}/convert`, payload)
    return {
      message: data?.message || 'Lead converted successfully',
      ...(data?.lead ? { lead: normalizeLead(data.lead) } : {}),
    }
  },
}