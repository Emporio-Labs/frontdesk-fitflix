import axios from 'axios'

const leadClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type LeadTemperature = 'cold' | 'warm' | 'hot'

export interface LeadInteraction {
  id: string
  type: 'note' | 'call' | 'whatsapp' | 'email' | 'status-change' | 'system'
  note: string
  createdAt: string
  createdBy?: string
}

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
  assignedStaffName: string
  createdAt: string
  updatedAt: string
  followUpDate?: string
  contactCount: number
  lastContactedAt?: string
  isDeleted: boolean
  revision: number
  interactions: LeadInteraction[]
  fcmTokens: string[]
}

export interface CreateLeadPayload {
  name: string
  email: string
  phone?: string
  source?: string
  status?: LeadStatus
  interestedIn?: string
  temperature?: LeadTemperature
  notes?: string
  tags?: string[]
  ownerId?: string
  assignedStaffName?: string
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
  assignedStaffName?: string
  followUpDate?: string
  expectedRevision?: number
}

export interface ConvertLeadPayload {
  username?: string
  phone: string
  age: string
  gender: number
  healthGoals: string[]
  password: string
}

export interface LeadRemindersResponse {
  today: Lead[]
  missed: Lead[]
  generatedAt: string
  timezone: string
}

export interface LeadAnalyticsResponse {
  stageCounts: Record<LeadStatus, number>
  heatDistribution: Record<LeadTemperature, number>
  dropOff: {
    newToContacted: number
    contactedToQualified: number
    qualifiedToConverted: number
  }
  stageDurations: Record<LeadStatus, { totalDays: number; samples: number; averageDays: number }>
  conversionTimeline: Array<{ month: string; converted: number }>
  lifecycleMetrics: {
    totalActiveLeads: number
    convertedLeads: number
    lostLeads: number
    avgContactAttempts: number
    avgLeadAgeDays: number
  }
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
  const heatSource = raw?.heat || raw?.temperature
  const heat = ['cold', 'warm', 'hot'].includes(String(heatSource).toLowerCase())
    ? (String(heatSource).toLowerCase() as LeadTemperature)
    : getTemperatureFromTags(tags, status)
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
    temperature: heat,
    tags,
    ownerId: String(raw?.ownerId || ''),
    assignedStaffName: String(raw?.assignedStaffName || ''),
    createdAt: String(raw?.createdAt || ''),
    updatedAt: String(raw?.updatedAt || raw?.createdAt || ''),
    followUpDate: followUpSource ? String(followUpSource) : undefined,
    contactCount: Number(raw?.contactCount ?? 0),
    lastContactedAt: raw?.lastContactedAt ? String(raw.lastContactedAt) : undefined,
    isDeleted: Boolean(raw?.isDeleted),
    revision: Number(raw?.revision ?? 0),
    interactions: Array.isArray(raw?.interactions)
      ? raw.interactions.map((item: any) => ({
          id: String(item?.id || ''),
          type: String(item?.type || 'note') as LeadInteraction['type'],
          note: String(item?.note || ''),
          createdAt: String(item?.createdAt || ''),
          ...(item?.createdBy ? { createdBy: String(item.createdBy) } : {}),
        }))
      : [],
    fcmTokens: Array.isArray(raw?.fcmTokens) ? raw.fcmTokens.map((t: unknown) => String(t)) : [],
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
    ...(payload.status ? { status: toApiStatus(payload.status) } : {}),
    ...(payload.interestedIn ? { interestedIn: payload.interestedIn } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
    ...(tags.length ? { tags } : {}),
    ...(payload.ownerId ? { ownerId: payload.ownerId } : {}),
    ...(payload.assignedStaffName ? { assignedStaffName: payload.assignedStaffName } : {}),
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
    ...(payload.assignedStaffName !== undefined ? { assignedStaffName: payload.assignedStaffName } : {}),
    ...(payload.expectedRevision !== undefined ? { expectedRevision: payload.expectedRevision } : {}),
    ...followUp,
  }
}

export const leadService = {
  getAll: async (notesLimit = 10): Promise<{ leads: Lead[] }> => {
    const { data } = await leadClient.get('/api/leads', { params: { notesLimit } })
    const list = Array.isArray(data?.leads) ? data.leads : Array.isArray(data) ? data : []
    return { leads: list.map(normalizeLead) }
  },

  getById: async (id: string, notesLimit = 10): Promise<{ lead: Lead }> => {
    const { data } = await leadClient.get(`/api/leads/${id}`, { params: { notesLimit } })
    return { lead: normalizeLead(data?.lead || data) }
  },

  create: async (payload: CreateLeadPayload): Promise<{ message: string; lead: Lead }> => {
    const { data } = await leadClient.post('/api/leads', toCreatePayload(payload))
    return {
      message: data?.message || 'Lead created successfully',
      lead: normalizeLead(data?.lead || data),
    }
  },

  update: async (id: string, payload: UpdateLeadPayload): Promise<{ message: string; lead: Lead }> => {
    const { data } = await leadClient.patch(`/api/leads/${id}`, toUpdatePayload(payload))
    return {
      message: data?.message || 'Lead updated successfully',
      lead: normalizeLead(data?.lead || data),
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await leadClient.delete(`/api/leads/${id}`)
    return { message: data?.message || 'Lead deleted successfully' }
  },

  convert: async (id: string, payload: ConvertLeadPayload): Promise<{ message: string; lead?: Lead }> => {
    const { data } = await leadClient.post(`/api/leads/${id}/convert`, payload)
    return {
      message: data?.message || 'Lead converted successfully',
      ...(data?.lead ? { lead: normalizeLead(data.lead) } : {}),
    }
  },

  addInteraction: async (
    id: string,
    payload: { note: string; type?: LeadInteraction['type']; createdBy?: string }
  ): Promise<{ message: string; lead: Lead }> => {
    const { data } = await leadClient.post(`/api/leads/${id}/interactions`, payload)
    return {
      message: data?.message || 'Interaction added',
      lead: normalizeLead(data?.lead || data),
    }
  },

  recordContactAttempt: async (
    id: string,
    payload: { channel?: 'call' | 'whatsapp' | 'email'; note?: string; createdBy?: string }
  ): Promise<{ message: string; lead: Lead }> => {
    const { data } = await leadClient.post(`/api/leads/${id}/contact-attempt`, payload)
    return {
      message: data?.message || 'Contact attempt recorded',
      lead: normalizeLead(data?.lead || data),
    }
  },

  getReminders: async (): Promise<LeadRemindersResponse> => {
    const { data } = await leadClient.get('/api/leads/reminders')
    return {
      today: Array.isArray(data?.today) ? data.today.map(normalizeLead) : [],
      missed: Array.isArray(data?.missed) ? data.missed.map(normalizeLead) : [],
      generatedAt: String(data?.generatedAt || ''),
      timezone: String(data?.timezone || 'Asia/Kolkata'),
    }
  },

  getDigest: async (): Promise<any> => {
    const { data } = await leadClient.get('/api/leads/reminders/digest')
    return data
  },

  getAnalytics: async (): Promise<LeadAnalyticsResponse> => {
    const { data } = await leadClient.get('/api/leads/analytics')
    return data?.analytics as LeadAnalyticsResponse
  },

  saveFcmToken: async (id: string, token: string): Promise<{ message: string; lead: Lead }> => {
    const { data } = await leadClient.post(`/api/leads/${id}/fcm-token`, { token })
    return {
      message: data?.message || 'FCM token saved',
      lead: normalizeLead(data?.lead || data),
    }
  },

  removeFcmToken: async (id: string, token: string): Promise<{ message: string; lead: Lead }> => {
    const { data } = await leadClient.delete(`/api/leads/${id}/fcm-token`, { data: { token } })
    return {
      message: data?.message || 'FCM token removed',
      lead: normalizeLead(data?.lead || data),
    }
  },
}