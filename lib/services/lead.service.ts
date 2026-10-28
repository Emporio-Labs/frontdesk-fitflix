import { apiClient } from '@/lib/api-client'

const IST_TIMEZONE = 'Asia/Kolkata'
const IST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Board stages. `visit_booked` = a visit/trial is on the calendar;
 * `qualified` is shown as "Visited" (came in, deciding or paying).
 */
export type LeadStatus = 'new' | 'contacted' | 'visit_booked' | 'qualified' | 'converted' | 'lost'
export type LeadTemperature = 'cold' | 'warm' | 'hot'

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  visit_booked: 'Visit booked',
  qualified: 'Visited',
  converted: 'Joined',
  lost: 'Lost',
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
  /** null until someone (or an outcome) sets it. */
  temperature: LeadTemperature | null
  tags: string[]
  ownerId: string
  ownerName: string
  createdAt: string
  updatedAt: string
  followUpDate?: string
  visitAt?: string
  attemptCount: number
  noAnswerStreak: number
  firstAttemptAt?: string
  lastAttemptAt?: string
  firstContactedAt?: string
  lastContactedAt?: string
  lastOutcome: string
  lastOutcomeLabel: string
  lostReason: string
  isEscalated: boolean
  /**
   * The app account this lead is linked to, when there is one.
   *
   * Set at signup, not only at conversion, so an app signup carries it while
   * still sitting in New. It is what lets the board pull that person's
   * in-app activity before someone calls them.
   */
  convertedUserId: string
  /** Branch the lead is for (a `Location._id`), when one was recorded. */
  locationId: string
  /** The lead's unpaid sale invoice, when one is waiting for payment. */
  pendingInvoiceId: string
}

export interface CreateLeadPayload {
  name: string
  email?: string
  phone: string
  source?: string
  status?: LeadStatus
  interestedIn?: string
  temperature?: LeadTemperature | null
  notes?: string
  tags?: string[]
  followUpDate?: string
  /** Branch the lead is for (a `Location._id`). */
  locationId?: string
}

export interface UpdateLeadPayload {
  name?: string
  email?: string
  phone?: string
  source?: string
  status?: LeadStatus
  interestedIn?: string
  temperature?: LeadTemperature | null
  notes?: string
  tags?: string[]
  followUpDate?: string
  visitAt?: string | null
  lostReason?: string
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

// ── Timeline & outcomes ─────────────────────────────────────────────────────

export type OutcomeChannel = 'call' | 'whatsapp' | 'visit'
export type LeadActivityType = OutcomeChannel | 'note' | 'status_change' | 'system'

export interface LeadOutcomeDefinition {
  key: string
  label: string
  group: 'connected' | 'not_connected' | 'visit' | 'other'
  channels: OutcomeChannel[]
  connected: boolean
  status?: string
  temperature?: LeadTemperature | 'cooler'
  requires: { followUp?: boolean; visitAt?: boolean; lostReason?: boolean; customLabel?: boolean }
  suggestFollowUpHours?: number
  lostReason?: string
}

export interface LeadOutcomeCatalog {
  outcomes: LeadOutcomeDefinition[]
  lostReasons: Array<{ key: string; label: string }>
  rules: { coldAfterNoAnswers: number; suggestLostAfterAttempts: number; suggestLostAfterDays: number }
}

export interface LeadActivity {
  id: string
  leadId: string
  type: LeadActivityType
  outcome: string
  label: string
  connected: boolean
  note: string
  statusFrom: LeadStatus | null
  statusTo: LeadStatus | null
  temperature: LeadTemperature | null
  lostReason: string
  nextFollowUpAt?: string
  visitAt?: string
  createdBy: { id: string | null; name: string; role: string }
  createdAt: string
}

export interface LogLeadActivityPayload {
  type: OutcomeChannel | 'note'
  outcome?: string
  customLabel?: string
  customStatus?: LeadStatus
  customConnected?: boolean
  temperature?: LeadTemperature
  note?: string
  nextFollowUpAt?: string | null
  visitAt?: string | null
  lostReason?: string
  lostReasonText?: string
}

export interface LogLeadActivityResult {
  message: string
  lead: Lead | null
  activity: LeadActivity | null
  suggestLost: boolean
}

export interface LeadTeamAnalytics {
  range: { from: string; to: string }
  totals: {
    leads: number
    contacted: number
    contactRate: number
    converted: number
    conversionRate: number
    avgAttemptsPerLead: number | null
    medianHoursToFirstContact: number | null
    neverAttempted: number
  }
  funnel: Array<{ stage: string; count: number }>
  outcomes: Array<{ outcome: string; label: string; count: number }>
  lostReasons: Array<{ reason: string; label: string; count: number }>
  bySource: Array<{ source: string; leads: number; converted: number; conversionRate: number }>
  staff: Array<{
    staffId: string
    name: string
    attempts: number
    connected: number
    connectRate: number
    leadsWorked: number
    visitsBooked: number
    lost: number
    converted: number
  }>
}

// ── Mapping ─────────────────────────────────────────────────────────────────

const API_STATUS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  visit_booked: 'VisitBooked',
  qualified: 'Qualified',
  converted: 'Converted',
  lost: 'Lost',
}

export function toUiStatus(value: unknown): LeadStatus {
  const v = String(value ?? '').toLowerCase().trim()
  if (v === 'visitbooked' || v === 'visit_booked') return 'visit_booked'
  if (v === 'contacted' || v === 'warm' || v === 'hot' || v === 'cold') return 'contacted'
  if (v === 'qualified') return 'qualified'
  if (v === 'converted') return 'converted'
  if (v === 'lost') return 'lost'
  return 'new'
}

export function toApiStatus(value: LeadStatus | undefined): string | undefined {
  return value ? API_STATUS[value] : undefined
}

function asTemperature(value: unknown): LeadTemperature | null {
  const v = String(value ?? '').toLowerCase()
  return v === 'hot' || v === 'warm' || v === 'cold' ? v : null
}

/** Older leads kept heat as a `temperature:x` tag (or a Hot/Warm/Cold status). */
function legacyTemperature(raw: any, tags: string[]): LeadTemperature | null {
  const tag = tags.find((t) => t.toLowerCase().startsWith('temperature:'))
  return asTemperature(tag?.split(':')[1]) ?? asTemperature(raw?.status)
}

const optionalDate = (value: unknown) => (value ? String(value) : undefined)

/** An id that may arrive as a string or as a populated `{ _id }` object. */
function refId(value: any): string {
  if (!value) return ''
  return typeof value === 'string' ? value : String(value?._id || value?.id || '')
}

export function normalizeLead(raw: any): Lead {
  const tags: string[] = Array.isArray(raw?.tags) ? raw.tags.map((tag: unknown) => String(tag)) : []
  const rawEmail = String(raw?.email || '')
  const email = rawEmail.startsWith('noemail-') && rawEmail.endsWith('@fitflix.in') ? '' : rawEmail

  return {
    id: String(raw?._id || raw?.id || ''),
    name: String(raw?.leadName || raw?.name || ''),
    email,
    phone: String(raw?.phone || ''),
    source: String(raw?.source || 'other'),
    status: toUiStatus(raw?.status),
    notes: String(raw?.notes || ''),
    interestedIn: String(raw?.interestedIn || ''),
    temperature: asTemperature(raw?.temperature) ?? legacyTemperature(raw, tags),
    tags: tags.filter((t) => !t.toLowerCase().startsWith('temperature:')),
    ownerId: refId(raw?.owner),
    ownerName: String(raw?.ownerName || ''),
    createdAt: String(raw?.createdAt || ''),
    updatedAt: String(raw?.updatedAt || raw?.createdAt || ''),
    followUpDate: optionalDate(raw?.followUpDate),
    visitAt: optionalDate(raw?.visitAt),
    attemptCount: Number(raw?.attemptCount ?? 0),
    noAnswerStreak: Number(raw?.noAnswerStreak ?? 0),
    firstAttemptAt: optionalDate(raw?.firstAttemptAt),
    lastAttemptAt: optionalDate(raw?.lastAttemptAt),
    firstContactedAt: optionalDate(raw?.firstContactedAt),
    lastContactedAt: optionalDate(raw?.lastContactedAt),
    lastOutcome: String(raw?.lastOutcome || ''),
    lastOutcomeLabel: String(raw?.lastOutcomeLabel || ''),
    lostReason: String(raw?.lostReason || ''),
    isEscalated: Boolean(raw?.isEscalated),
    // The list endpoint populates convertedUser into an object; other paths
    // leave it an id string.
    convertedUserId: refId(raw?.convertedUser),
    locationId: refId(raw?.locationId),
    pendingInvoiceId: refId(raw?.pendingInvoiceId),
  }
}

function normalizeActivity(raw: any): LeadActivity {
  return {
    id: String(raw?._id || raw?.id || ''),
    leadId: refId(raw?.leadId),
    type: String(raw?.type || 'note') as LeadActivityType,
    outcome: String(raw?.outcome || ''),
    label: String(raw?.label || ''),
    connected: Boolean(raw?.connected),
    note: String(raw?.note || ''),
    statusFrom: raw?.statusFrom ? toUiStatus(raw.statusFrom) : null,
    statusTo: raw?.statusTo ? toUiStatus(raw.statusTo) : null,
    temperature: asTemperature(raw?.temperature),
    lostReason: String(raw?.lostReason || ''),
    nextFollowUpAt: optionalDate(raw?.nextFollowUpAt),
    visitAt: optionalDate(raw?.visitAt),
    createdBy: {
      id: raw?.createdBy?.id ?? null,
      name: String(raw?.createdBy?.name || 'System'),
      role: String(raw?.createdBy?.role || 'system'),
    },
    createdAt: String(raw?.createdAt || ''),
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

// ── Derived views ───────────────────────────────────────────────────────────

export function istDateOnly(value?: string | Date): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return IST_DATE_FORMATTER.format(parsed)
}

export const isOpenLead = (lead: Lead) => lead.status !== 'converted' && lead.status !== 'lost'

export function buildReminderSummary(leads: Lead[]): LeadRemindersResponse {
  const todayIst = istDateOnly(new Date())!
  const open = leads.filter(isOpenLead)
  return {
    today: open.filter((lead) => istDateOnly(lead.followUpDate) === todayIst),
    missed: open.filter((lead) => {
      const due = istDateOnly(lead.followUpDate)
      return !!due && due < todayIst
    }),
    generatedAt: new Date().toISOString(),
    timezone: IST_TIMEZONE,
  }
}

/** Mirrors the backend rule: many unanswered tries over a week → offer Lost. */
export function shouldSuggestLost(
  lead: Lead,
  rules: { suggestLostAfterAttempts: number; suggestLostAfterDays: number } = {
    suggestLostAfterAttempts: 6,
    suggestLostAfterDays: 7,
  },
): boolean {
  if (!isOpenLead(lead) || lead.noAnswerStreak < rules.suggestLostAfterAttempts || !lead.firstAttemptAt) {
    return false
  }
  return Date.now() - new Date(lead.firstAttemptAt).getTime() >= rules.suggestLostAfterDays * 86_400_000
}

// ── Payloads ────────────────────────────────────────────────────────────────

function toCreatePayload(payload: CreateLeadPayload) {
  const cleanPhone = (payload.phone || '').replace(/\D/g, '') || String(Date.now())
  const validEmail = payload.email && payload.email.trim()
    ? payload.email.trim()
    : `noemail-${cleanPhone}@fitflix.in`

  return {
    leadName: payload.name,
    phone: payload.phone,
    email: validEmail,
    ...(payload.source ? { source: payload.source } : {}),
    ...(payload.status ? { status: toApiStatus(payload.status) } : {}),
    ...(payload.interestedIn ? { interestedIn: payload.interestedIn } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
    ...(payload.tags?.length ? { tags: payload.tags } : {}),
    ...(payload.temperature ? { temperature: payload.temperature } : {}),
    ...(payload.locationId ? { locationId: payload.locationId } : {}),
    ...(payload.followUpDate ? { followUpDate: payload.followUpDate } : {}),
  }
}

function toUpdatePayload(payload: UpdateLeadPayload) {
  const emailPayload = payload.email !== undefined
    ? (payload.email.trim() || (payload.phone ? `noemail-${payload.phone.replace(/\D/g, '')}@fitflix.in` : undefined))
    : undefined

  return {
    ...(payload.name !== undefined ? { leadName: payload.name } : {}),
    ...(emailPayload !== undefined ? { email: emailPayload } : {}),
    ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
    ...(payload.source !== undefined ? { source: payload.source } : {}),
    ...(payload.status !== undefined ? { status: toApiStatus(payload.status) } : {}),
    ...(payload.interestedIn !== undefined ? { interestedIn: payload.interestedIn } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
    ...(payload.temperature !== undefined ? { temperature: payload.temperature } : {}),
    ...(payload.followUpDate !== undefined ? { followUpDate: payload.followUpDate } : {}),
    ...(payload.visitAt !== undefined ? { visitAt: payload.visitAt } : {}),
    ...(payload.lostReason !== undefined ? { lostReason: payload.lostReason } : {}),
  }
}

export const leadService = {
  getAll: async (): Promise<{ leads: Lead[] }> => {
    const { data } = await apiClient.get('/leads')
    return { leads: extractRawLeads(data).map(normalizeLead) }
  },

  getById: async (id: string): Promise<{ lead: Lead }> => {
    const { data } = await apiClient.get(`/leads/${id}`)
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

  /** What the "Log outcome" dialog offers, from the backend's catalog. */
  getOutcomes: async (): Promise<LeadOutcomeCatalog> => {
    const { data } = await apiClient.get('/leads/outcomes')
    return {
      outcomes: Array.isArray(data?.outcomes) ? data.outcomes : [],
      lostReasons: Array.isArray(data?.lostReasons) ? data.lostReasons : [],
      rules: data?.rules ?? { coldAfterNoAnswers: 3, suggestLostAfterAttempts: 6, suggestLostAfterDays: 7 },
    }
  },

  /** The lead's timeline, newest first. */
  getActivities: async (id: string): Promise<LeadActivity[]> => {
    const { data } = await apiClient.get(`/leads/${id}/activities`)
    return (Array.isArray(data?.items) ? data.items : []).map(normalizeActivity)
  },

  /** Log a note, or a call/WhatsApp/visit outcome (which moves the lead). */
  logActivity: async (id: string, payload: LogLeadActivityPayload): Promise<LogLeadActivityResult> => {
    const { data } = await apiClient.post(`/leads/${id}/activities`, {
      ...payload,
      ...(payload.customStatus ? { customStatus: toApiStatus(payload.customStatus) } : {}),
    })
    return {
      message: data?.message || 'Saved',
      lead: data?.lead ? normalizeLead(data.lead) : null,
      activity: data?.activity ? normalizeActivity(data.activity) : null,
      suggestLost: Boolean(data?.suggestLost),
    }
  },

  /** Funnel, outcome and per-staff numbers built from the timeline. */
  getTeamAnalytics: async (params: { from?: string; to?: string; locationId?: string }): Promise<LeadTeamAnalytics> => {
    const { data } = await apiClient.get('/leads/analytics', { params })
    return data as LeadTeamAnalytics
  },
}
