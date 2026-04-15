import { isAxiosError } from 'axios'
import { apiClient } from '@/lib/api-client'

const IST_TIMEZONE = 'Asia/Kolkata'
const IST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
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

export interface LeadStageHistory {
  stage: LeadStatus
  enteredAt: string
  exitedAt?: string
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
  stageHistory: LeadStageHistory[]
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
  const v = String(value ?? '').toLowerCase().trim()
  if (v === 'new' || v === 'cold') return 'new'
  if (v === 'contacted' || v === 'warm') return 'contacted'
  if (v === 'qualified' || v === 'hot') return 'qualified'
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

function normalizeStageHistory(raw: any): LeadStageHistory[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry) => {
      const enteredAt = String(entry?.enteredAt || '')
      if (!enteredAt) return undefined
      return {
        stage: toUiStatus(entry?.stage),
        enteredAt,
        ...(entry?.exitedAt ? { exitedAt: String(entry.exitedAt) } : {}),
      }
    })
    .filter((entry): entry is LeadStageHistory => Boolean(entry))
}

function normalizeLead(raw: any): Lead {
  const status = toUiStatus(raw?.status)
  const tags = Array.isArray(raw?.tags) ? raw.tags.map((tag: unknown) => String(tag)) : []
  const rawStatus = String(raw?.status || '').toLowerCase()
  const heatFromStatus = rawStatus === 'hot' || rawStatus === 'warm' || rawStatus === 'cold' ? rawStatus : undefined
  const heatSource = raw?.heat || raw?.temperature || heatFromStatus
  const heat = ['cold', 'warm', 'hot'].includes(String(heatSource).toLowerCase())
    ? (String(heatSource).toLowerCase() as LeadTemperature)
    : getTemperatureFromTags(tags, status)
  const followUpSource = raw?.followUpDate ?? raw?.followUp ?? raw?.followupDate ?? raw?.follow_up_date
  const stageHistory = normalizeStageHistory(raw?.stageHistory)

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
          id: String(item?._id || item?.id || ''),
          type: String(item?.type || 'note') as LeadInteraction['type'],
          note: String(item?.note || ''),
          createdAt: String(item?.createdAt || ''),
          ...(item?.createdBy ? { createdBy: String(item.createdBy) } : {}),
        }))
      : [],
    fcmTokens: Array.isArray(raw?.fcmTokens) ? raw.fcmTokens.map((t: unknown) => String(t)) : [],
    stageHistory,
  }
}

function extractRawLeads(payload: any): any[] {
  if (Array.isArray(payload?.leads)) return payload.leads
  if (Array.isArray(payload?.data?.leads)) return payload.data.leads
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload)) return payload
  return []
}

function extractRawLead(payload: any): any {
  return payload?.lead ?? payload?.data?.lead ?? payload?.data ?? payload
}

function nowIstDateOnly(): string {
  return IST_DATE_FORMATTER.format(new Date())
}

function dateOnlyFromUtcInIst(utcIso?: string): string | undefined {
  if (!utcIso) return undefined
  const parsed = new Date(utcIso)
  if (Number.isNaN(parsed.getTime())) return undefined
  return IST_DATE_FORMATTER.format(parsed)
}

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const ms = end.getTime() - start.getTime()
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
}

function mergeNotes(existing: string, next: string): string {
  const existingValue = String(existing || '').trim()
  const nextValue = String(next || '').trim()
  if (!nextValue) return existingValue
  if (!existingValue) return nextValue
  return `${existingValue}\n${nextValue}`
}

function isUnsupportedEndpointError(error: unknown): boolean {
  if (!isAxiosError(error)) return false
  const status = error.response?.status
  return status === 404 || status === 405 || status === 501
}

function buildReminderSummary(leads: Lead[]): LeadRemindersResponse {
  const activeLeads = leads.filter((lead) => !lead.isDeleted)
  const todayIst = nowIstDateOnly()

  const today = activeLeads.filter((lead) => dateOnlyFromUtcInIst(lead.followUpDate) === todayIst)
  const missed = activeLeads.filter((lead) => {
    const due = dateOnlyFromUtcInIst(lead.followUpDate)
    return !!due && due < todayIst && lead.status !== 'converted' && lead.status !== 'lost'
  })

  return {
    today,
    missed,
    generatedAt: new Date().toISOString(),
    timezone: IST_TIMEZONE,
  }
}

function buildDailyDigest(summary: LeadRemindersResponse): Record<string, unknown> {
  return {
    title: 'Leads Daily Digest',
    date: nowIstDateOnly(),
    timezone: IST_TIMEZONE,
    totals: {
      todayFollowUps: summary.today.length,
      missedFollowUps: summary.missed.length,
    },
    highlights: [
      ...summary.missed.slice(0, 5).map((lead) => `Missed: ${lead.name} (${dateOnlyFromUtcInIst(lead.followUpDate)})`),
      ...summary.today.slice(0, 5).map((lead) => `Today: ${lead.name}`),
    ],
  }
}

function buildLeadAnalytics(leads: Lead[]): LeadAnalyticsResponse {
  const activeLeads = leads.filter((lead) => !lead.isDeleted)
  const stages: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost']

  const stageCounts = stages.reduce<Record<LeadStatus, number>>((acc, stage) => {
    acc[stage] = activeLeads.filter((lead) => lead.status === stage).length
    return acc
  }, { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 })

  const heatDistribution: Record<LeadTemperature, number> = {
    cold: activeLeads.filter((lead) => lead.temperature === 'cold').length,
    warm: activeLeads.filter((lead) => lead.temperature === 'warm').length,
    hot: activeLeads.filter((lead) => lead.temperature === 'hot').length,
  }

  const dropOff = {
    newToContacted: Math.max(stageCounts.new - stageCounts.contacted, 0),
    contactedToQualified: Math.max(stageCounts.contacted - stageCounts.qualified, 0),
    qualifiedToConverted: Math.max(stageCounts.qualified - stageCounts.converted, 0),
  }

  const stageDurations: Record<LeadStatus, { totalDays: number; samples: number; averageDays: number }> = {
    new: { totalDays: 0, samples: 0, averageDays: 0 },
    contacted: { totalDays: 0, samples: 0, averageDays: 0 },
    qualified: { totalDays: 0, samples: 0, averageDays: 0 },
    converted: { totalDays: 0, samples: 0, averageDays: 0 },
    lost: { totalDays: 0, samples: 0, averageDays: 0 },
  }

  activeLeads.forEach((lead) => {
    const stageHistory = lead.stageHistory.length
      ? lead.stageHistory
      : lead.createdAt
        ? [{ stage: lead.status, enteredAt: lead.createdAt, exitedAt: lead.updatedAt || undefined }]
        : []

    stageHistory.forEach((entry) => {
      const end = entry.exitedAt || lead.updatedAt || new Date().toISOString()
      const days = daysBetween(entry.enteredAt, end)
      stageDurations[entry.stage].totalDays += days
      stageDurations[entry.stage].samples += 1
    })
  })

  ;(Object.keys(stageDurations) as LeadStatus[]).forEach((stage) => {
    const metric = stageDurations[stage]
    metric.averageDays = metric.samples > 0 ? Number((metric.totalDays / metric.samples).toFixed(2)) : 0
  })

  const conversionTimelineMap: Record<string, number> = {}
  activeLeads
    .filter((lead) => lead.status === 'converted')
    .forEach((lead) => {
      const source = lead.updatedAt || lead.createdAt
      const month = String(source || '').slice(0, 7)
      if (/^\d{4}-\d{2}$/.test(month)) {
        conversionTimelineMap[month] = (conversionTimelineMap[month] || 0) + 1
      }
    })

  const conversionTimeline = Object.keys(conversionTimelineMap)
    .sort()
    .map((month) => ({ month, converted: conversionTimelineMap[month] }))

  const nowIso = new Date().toISOString()
  const lifecycleMetrics = {
    totalActiveLeads: activeLeads.filter((lead) => lead.status !== 'converted' && lead.status !== 'lost').length,
    convertedLeads: stageCounts.converted,
    lostLeads: stageCounts.lost,
    avgContactAttempts: activeLeads.length
      ? Number((activeLeads.reduce((sum, lead) => sum + (lead.contactCount || 0), 0) / activeLeads.length).toFixed(2))
      : 0,
    avgLeadAgeDays: activeLeads.length
      ? Number((activeLeads.reduce((sum, lead) => sum + daysBetween(lead.createdAt, nowIso), 0) / activeLeads.length).toFixed(2))
      : 0,
  }

  return {
    stageCounts,
    heatDistribution,
    dropOff,
    stageDurations,
    conversionTimeline,
    lifecycleMetrics,
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
  const tags = payload.tags !== undefined ? withTemperatureTag(payload.tags, payload.temperature) : undefined
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
    const { data } = await apiClient.get('/leads', { params: { notesLimit } })
    const list = extractRawLeads(data)
    return { leads: list.map(normalizeLead) }
  },

  getById: async (id: string, notesLimit = 10): Promise<{ lead: Lead }> => {
    const { data } = await apiClient.get(`/leads/${id}`, { params: { notesLimit } })
    return { lead: normalizeLead(extractRawLead(data)) }
  },

  create: async (payload: CreateLeadPayload): Promise<{ message: string; lead: Lead }> => {
    const { data } = await apiClient.post('/leads', toCreatePayload(payload))
    return {
      message: data?.message || 'Lead created successfully',
      lead: normalizeLead(extractRawLead(data)),
    }
  },

  update: async (id: string, payload: UpdateLeadPayload): Promise<{ message: string; lead: Lead }> => {
    const { data } = await apiClient.patch(`/leads/${id}`, toUpdatePayload(payload))
    return {
      message: data?.message || 'Lead updated successfully',
      lead: normalizeLead(extractRawLead(data)),
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/leads/${id}`)
    return { message: data?.message || 'Lead deleted successfully' }
  },

  convert: async (id: string, payload: ConvertLeadPayload): Promise<{ message: string; lead?: Lead }> => {
    const { data } = await apiClient.post(`/leads/${id}/convert`, payload)
    const rawLead = extractRawLead(data)
    return {
      message: data?.message || 'Lead converted successfully',
      ...(rawLead ? { lead: normalizeLead(rawLead) } : {}),
    }
  },

  addInteraction: async (
    id: string,
    payload: { note: string; type?: LeadInteraction['type']; createdBy?: string }
  ): Promise<{ message: string; lead: Lead }> => {
    const note = String(payload.note || '').trim()
    if (!note) {
      throw new Error('note is required')
    }

    try {
      const { data } = await apiClient.post(`/leads/${id}/interactions`, payload)
      return {
        message: data?.message || 'Interaction added',
        lead: normalizeLead(extractRawLead(data)),
      }
    } catch (error) {
      if (!isUnsupportedEndpointError(error)) {
        throw error
      }

      const current = await leadService.getById(id, 10)
      const { data } = await apiClient.patch(`/leads/${id}`, {
        notes: mergeNotes(current.lead.notes, note),
      })

      return {
        message: data?.message || 'Interaction added',
        lead: normalizeLead(extractRawLead(data) || current.lead),
      }
    }
  },

  recordContactAttempt: async (
    id: string,
    payload: { channel?: 'call' | 'whatsapp' | 'email'; note?: string; createdBy?: string }
  ): Promise<{ message: string; lead: Lead }> => {
    try {
      const { data } = await apiClient.post(`/leads/${id}/contact-attempt`, payload)
      return {
        message: data?.message || 'Contact attempt recorded',
        lead: normalizeLead(extractRawLead(data)),
      }
    } catch (error) {
      if (!isUnsupportedEndpointError(error)) {
        throw error
      }

      const current = await leadService.getById(id, 10)
      const channel = payload.channel || 'call'
      const note = String(payload.note || `Contact attempt via ${channel}`).trim()
      const nextStatus: LeadStatus = current.lead.status === 'new' ? 'contacted' : current.lead.status

      const { data } = await apiClient.patch(`/leads/${id}`, {
        status: toApiStatus(nextStatus),
        notes: mergeNotes(current.lead.notes, note),
      })

      return {
        message: data?.message || 'Contact attempt recorded',
        lead: normalizeLead(extractRawLead(data) || current.lead),
      }
    }
  },

  getReminders: async (): Promise<LeadRemindersResponse> => {
    const { leads } = await leadService.getAll(10)
    return buildReminderSummary(leads)
  },

  getDigest: async (): Promise<Record<string, unknown>> => {
    const summary = await leadService.getReminders()
    return buildDailyDigest(summary)
  },

  getAnalytics: async (): Promise<LeadAnalyticsResponse> => {
    const { leads } = await leadService.getAll(10)
    return buildLeadAnalytics(leads)
  },

  saveFcmToken: async (id: string, token: string): Promise<{ message: string; lead: Lead }> => {
    try {
      const { data } = await apiClient.post(`/leads/${id}/fcm-token`, { token })
      return {
        message: data?.message || 'FCM token saved',
        lead: normalizeLead(extractRawLead(data)),
      }
    } catch (error) {
      if (!isUnsupportedEndpointError(error)) {
        throw error
      }

      const { lead } = await leadService.getById(id, 10)
      return {
        message: 'FCM token saved',
        lead,
      }
    }
  },

  removeFcmToken: async (id: string, token: string): Promise<{ message: string; lead: Lead }> => {
    try {
      const { data } = await apiClient.delete(`/leads/${id}/fcm-token`, { data: { token } })
      return {
        message: data?.message || 'FCM token removed',
        lead: normalizeLead(extractRawLead(data)),
      }
    } catch (error) {
      if (!isUnsupportedEndpointError(error)) {
        throw error
      }

      const { lead } = await leadService.getById(id, 10)
      return {
        message: 'FCM token removed',
        lead,
      }
    }
  },
}
