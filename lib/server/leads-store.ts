import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type LeadHeat = 'cold' | 'warm' | 'hot'

export type LeadInteractionType = 'note' | 'call' | 'whatsapp' | 'email' | 'status-change' | 'system'

export interface LeadInteraction {
  id: string
  type: LeadInteractionType
  note: string
  createdAt: string
  createdBy?: string
}

export interface LeadStageHistory {
  stage: LeadStatus
  enteredAt: string
  exitedAt?: string
}

export interface LeadRecord {
  _id: string
  leadName: string
  email: string
  phone: string
  source: string
  status: LeadStatus
  heat: LeadHeat
  notes: string
  interestedIn: string
  tags: string[]
  ownerId: string
  assignedStaffName: string
  createdAt: string
  updatedAt: string
  followUpDate?: string
  contactCount: number
  lastContactedAt?: string
  isDeleted: boolean
  deletedAt?: string
  revision: number
  fcmTokens: string[]
  interactions: LeadInteraction[]
  stageHistory: LeadStageHistory[]
}

interface LeadsDb {
  leads: LeadRecord[]
}

interface LeadListOptions {
  includeDeleted?: boolean
  notesLimit?: number
}

interface CreateLeadInput {
  leadName: string
  email: string
  phone?: string
  source?: string
  interestedIn?: string
  notes?: string
  tags?: string[]
  ownerId?: string
  assignedStaffName?: string
  followUpDate?: string
  status?: LeadStatus
}

interface UpdateLeadInput {
  leadName?: string
  email?: string
  phone?: string
  source?: string
  status?: LeadStatus
  notes?: string
  interestedIn?: string
  tags?: string[]
  ownerId?: string
  assignedStaffName?: string
  followUpDate?: string
  expectedRevision?: number
}

const STAGE_ORDER: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted']
const DATA_DIR = path.join(process.cwd(), '.data')
const DATA_FILE = path.join(DATA_DIR, 'leads.json')

function toUtcIso(value?: string): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

function statusToHeat(status: LeadStatus): LeadHeat {
  if (status === 'qualified' || status === 'converted') return 'hot'
  if (status === 'contacted') return 'warm'
  return 'cold'
}

function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags.map((tag) => String(tag).trim()).filter(Boolean)
}

function normalizeSource(source?: string): string {
  const value = String(source || 'direct').trim().toLowerCase()
  if (['website', 'direct', 'walk-in', 'referral', 'social-media', 'other'].includes(value)) {
    return value
  }
  if (value === 'social media') return 'social-media'
  return 'other'
}

function normalizeStatus(status?: string): LeadStatus {
  const value = String(status || 'new').toLowerCase() as LeadStatus
  if (['new', 'contacted', 'qualified', 'converted', 'lost'].includes(value)) {
    return value
  }
  return 'new'
}

function nowIstDateOnly(): string {
  const now = new Date()
  const ist = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return ist
}

function dateOnlyFromUtcInIst(utcIso?: string): string | undefined {
  if (!utcIso) return undefined
  const d = new Date(utcIso)
  if (Number.isNaN(d.getTime())) return undefined
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const ms = end.getTime() - start.getTime()
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ leads: [] }, null, 2), 'utf8')
  }
}

async function readDb(): Promise<LeadsDb> {
  await ensureDataFile()
  const raw = await fs.readFile(DATA_FILE, 'utf8')
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object') return { leads: [] }
  const leads = Array.isArray(parsed.leads) ? parsed.leads : []
  return { leads }
}

async function writeDb(db: LeadsDb) {
  await ensureDataFile()
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), 'utf8')
}

function trimInteractions(interactions: LeadInteraction[], limit = 10): LeadInteraction[] {
  const sorted = [...interactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return sorted.slice(0, limit)
}

function stageIndex(stage: LeadStatus): number {
  const idx = STAGE_ORDER.indexOf(stage)
  return idx < 0 ? -1 : idx
}

function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true
  if (from === 'lost' || to === 'lost') return true
  const fromIdx = stageIndex(from)
  const toIdx = stageIndex(to)
  if (fromIdx < 0 || toIdx < 0) return false
  return toIdx === fromIdx + 1
}

function appendStatusChangeInteraction(record: LeadRecord, from: LeadStatus, to: LeadStatus) {
  record.interactions.unshift({
    id: randomUUID(),
    type: 'status-change',
    note: `Status changed from ${from} to ${to}`,
    createdAt: new Date().toISOString(),
  })
}

function updateStageHistory(record: LeadRecord, to: LeadStatus) {
  const now = new Date().toISOString()
  const current = record.stageHistory[record.stageHistory.length - 1]
  if (current && current.stage !== to) {
    current.exitedAt = now
  }
  if (!current || current.stage !== to) {
    record.stageHistory.push({ stage: to, enteredAt: now })
  }
}

export async function listLeads(options: LeadListOptions = {}): Promise<LeadRecord[]> {
  const db = await readDb()
  const includeDeleted = options.includeDeleted ?? false
  const notesLimit = options.notesLimit ?? 10

  return db.leads
    .filter((lead) => includeDeleted || !lead.isDeleted)
    .map((lead) => ({ ...lead, interactions: trimInteractions(lead.interactions || [], notesLimit) }))
}

export async function getLeadById(id: string, notesLimit = 10): Promise<LeadRecord | undefined> {
  const db = await readDb()
  const lead = db.leads.find((item) => item._id === id && !item.isDeleted)
  if (!lead) return undefined
  return { ...lead, interactions: trimInteractions(lead.interactions || [], notesLimit) }
}

export async function findDuplicateByPhone(phone: string): Promise<LeadRecord | undefined> {
  if (!phone.trim()) return undefined
  const db = await readDb()
  const normalized = phone.replace(/\D/g, '')
  return db.leads.find((lead) => !lead.isDeleted && lead.phone.replace(/\D/g, '') === normalized)
}

export async function createLead(input: CreateLeadInput): Promise<{ lead?: LeadRecord; duplicate?: LeadRecord }> {
  const db = await readDb()
  const duplicate = input.phone ? await findDuplicateByPhone(input.phone) : undefined
  if (duplicate) {
    return { duplicate }
  }

  const status = normalizeStatus(input.status)
  const now = new Date().toISOString()
  const record: LeadRecord = {
    _id: randomUUID(),
    leadName: String(input.leadName || '').trim(),
    email: String(input.email || '').trim(),
    phone: String(input.phone || '').trim(),
    source: normalizeSource(input.source),
    status,
    heat: statusToHeat(status),
    notes: String(input.notes || '').trim(),
    interestedIn: String(input.interestedIn || '').trim(),
    tags: sanitizeTags(input.tags),
    ownerId: String(input.ownerId || ''),
    assignedStaffName: String(input.assignedStaffName || '').trim(),
    createdAt: now,
    updatedAt: now,
    followUpDate: toUtcIso(input.followUpDate),
    contactCount: 0,
    lastContactedAt: undefined,
    isDeleted: false,
    deletedAt: undefined,
    revision: 1,
    fcmTokens: [],
    interactions: [],
    stageHistory: [{ stage: status, enteredAt: now }],
  }

  if (record.notes) {
    record.interactions.unshift({
      id: randomUUID(),
      type: 'note',
      note: record.notes,
      createdAt: now,
    })
  }

  db.leads.push(record)
  await writeDb(db)
  return { lead: record }
}

export async function updateLead(id: string, payload: UpdateLeadInput): Promise<LeadRecord | undefined> {
  const db = await readDb()
  const index = db.leads.findIndex((lead) => lead._id === id && !lead.isDeleted)
  if (index < 0) return undefined

  const current = db.leads[index]

  if (payload.expectedRevision !== undefined && payload.expectedRevision !== current.revision) {
    const err = new Error('Revision mismatch') as Error & { code?: string }
    err.code = 'REVISION_MISMATCH'
    throw err
  }

  const nextStatus = payload.status ? normalizeStatus(payload.status) : current.status
  if (payload.status && !canTransition(current.status, nextStatus)) {
    const err = new Error('Invalid stage transition') as Error & { code?: string }
    err.code = 'INVALID_TRANSITION'
    throw err
  }

  const now = new Date().toISOString()
  const next: LeadRecord = {
    ...current,
    leadName: payload.leadName !== undefined ? String(payload.leadName).trim() : current.leadName,
    email: payload.email !== undefined ? String(payload.email).trim() : current.email,
    phone: payload.phone !== undefined ? String(payload.phone).trim() : current.phone,
    source: payload.source !== undefined ? normalizeSource(payload.source) : current.source,
    status: nextStatus,
    heat: statusToHeat(nextStatus),
    notes: payload.notes !== undefined ? String(payload.notes).trim() : current.notes,
    interestedIn: payload.interestedIn !== undefined ? String(payload.interestedIn).trim() : current.interestedIn,
    tags: payload.tags !== undefined ? sanitizeTags(payload.tags) : current.tags,
    ownerId: payload.ownerId !== undefined ? String(payload.ownerId) : current.ownerId,
    assignedStaffName:
      payload.assignedStaffName !== undefined ? String(payload.assignedStaffName).trim() : current.assignedStaffName,
    followUpDate: payload.followUpDate !== undefined ? toUtcIso(payload.followUpDate) : current.followUpDate,
    updatedAt: now,
    revision: current.revision + 1,
  }

  if (payload.status && payload.status !== current.status) {
    appendStatusChangeInteraction(next, current.status, nextStatus)
    if (nextStatus === 'contacted') {
      next.contactCount += 1
      next.lastContactedAt = now
    }
    updateStageHistory(next, nextStatus)
  }

  if (payload.notes !== undefined && payload.notes.trim()) {
    next.interactions.unshift({
      id: randomUUID(),
      type: 'note',
      note: payload.notes.trim(),
      createdAt: now,
    })
  }

  db.leads[index] = next
  await writeDb(db)
  return next
}

export async function softDeleteLead(id: string): Promise<LeadRecord | undefined> {
  const db = await readDb()
  const index = db.leads.findIndex((lead) => lead._id === id && !lead.isDeleted)
  if (index < 0) return undefined

  const now = new Date().toISOString()
  const next = {
    ...db.leads[index],
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
    revision: db.leads[index].revision + 1,
  }

  db.leads[index] = next
  await writeDb(db)
  return next
}

export async function addInteraction(
  id: string,
  payload: { note: string; type?: LeadInteractionType; createdBy?: string }
): Promise<LeadRecord | undefined> {
  const db = await readDb()
  const index = db.leads.findIndex((lead) => lead._id === id && !lead.isDeleted)
  if (index < 0) return undefined

  const now = new Date().toISOString()
  const current = db.leads[index]
  const interaction: LeadInteraction = {
    id: randomUUID(),
    type: payload.type || 'note',
    note: payload.note.trim(),
    createdAt: now,
    ...(payload.createdBy ? { createdBy: payload.createdBy } : {}),
  }

  const next = {
    ...current,
    interactions: [interaction, ...(current.interactions || [])],
    updatedAt: now,
    revision: current.revision + 1,
  }

  db.leads[index] = next
  await writeDb(db)
  return next
}

export async function recordContactAttempt(
  id: string,
  payload: { channel?: 'call' | 'whatsapp' | 'email'; note?: string; createdBy?: string }
): Promise<LeadRecord | undefined> {
  const db = await readDb()
  const index = db.leads.findIndex((lead) => lead._id === id && !lead.isDeleted)
  if (index < 0) return undefined

  const now = new Date().toISOString()
  const current = db.leads[index]
  const type: LeadInteractionType = payload.channel || 'call'
  const note = payload.note?.trim() || `Contact attempt via ${type}`

  const nextStatus = current.status === 'new' ? 'contacted' : current.status
  const next: LeadRecord = {
    ...current,
    status: nextStatus,
    heat: statusToHeat(nextStatus),
    contactCount: (current.contactCount || 0) + 1,
    lastContactedAt: now,
    interactions: [
      {
        id: randomUUID(),
        type,
        note,
        createdAt: now,
        ...(payload.createdBy ? { createdBy: payload.createdBy } : {}),
      },
      ...(current.interactions || []),
    ],
    updatedAt: now,
    revision: current.revision + 1,
  }

  if (current.status !== nextStatus) {
    appendStatusChangeInteraction(next, current.status, nextStatus)
    updateStageHistory(next, nextStatus)
  }

  db.leads[index] = next
  await writeDb(db)
  return next
}

export async function convertLead(id: string): Promise<LeadRecord | undefined> {
  return updateLead(id, { status: 'converted' })
}

export async function upsertFcmToken(id: string, token: string): Promise<LeadRecord | undefined> {
  const db = await readDb()
  const index = db.leads.findIndex((lead) => lead._id === id && !lead.isDeleted)
  if (index < 0) return undefined

  const current = db.leads[index]
  const next = {
    ...current,
    fcmTokens: Array.from(new Set([...(current.fcmTokens || []), token.trim()])),
    updatedAt: new Date().toISOString(),
    revision: current.revision + 1,
  }

  db.leads[index] = next
  await writeDb(db)
  return next
}

export async function removeFcmToken(id: string, token: string): Promise<LeadRecord | undefined> {
  const db = await readDb()
  const index = db.leads.findIndex((lead) => lead._id === id && !lead.isDeleted)
  if (index < 0) return undefined

  const current = db.leads[index]
  const next = {
    ...current,
    fcmTokens: (current.fcmTokens || []).filter((item) => item !== token.trim()),
    updatedAt: new Date().toISOString(),
    revision: current.revision + 1,
  }

  db.leads[index] = next
  await writeDb(db)
  return next
}

export async function getReminderSummary() {
  const leads = await listLeads({ includeDeleted: false, notesLimit: 10 })
  const todayIst = nowIstDateOnly()

  const today = leads.filter((lead) => dateOnlyFromUtcInIst(lead.followUpDate) === todayIst)
  const missed = leads.filter((lead) => {
    const due = dateOnlyFromUtcInIst(lead.followUpDate)
    return !!due && due < todayIst && lead.status !== 'converted' && lead.status !== 'lost'
  })

  return {
    today,
    missed,
    generatedAt: new Date().toISOString(),
    timezone: 'Asia/Kolkata',
  }
}

export async function getDailyDigest() {
  const summary = await getReminderSummary()
  return {
    title: 'Leads Daily Digest',
    date: nowIstDateOnly(),
    timezone: 'Asia/Kolkata',
    totals: {
      todayFollowUps: summary.today.length,
      missedFollowUps: summary.missed.length,
    },
    highlights: [
      ...summary.missed.slice(0, 5).map((lead) => `Missed: ${lead.leadName} (${dateOnlyFromUtcInIst(lead.followUpDate)})`),
      ...summary.today.slice(0, 5).map((lead) => `Today: ${lead.leadName}`),
    ],
  }
}

export async function getLeadAnalytics() {
  const leads = await listLeads({ includeDeleted: false, notesLimit: 10 })
  const stages: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost']

  const stageCounts = stages.reduce<Record<LeadStatus, number>>((acc, stage) => {
    acc[stage] = leads.filter((lead) => lead.status === stage).length
    return acc
  }, { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 })

  const heatDistribution = {
    cold: leads.filter((lead) => lead.heat === 'cold').length,
    warm: leads.filter((lead) => lead.heat === 'warm').length,
    hot: leads.filter((lead) => lead.heat === 'hot').length,
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

  leads.forEach((lead) => {
    ;(lead.stageHistory || []).forEach((item) => {
      const end = item.exitedAt || lead.updatedAt
      const days = daysBetween(item.enteredAt, end)
      stageDurations[item.stage].totalDays += days
      stageDurations[item.stage].samples += 1
    })
  })

  ;(Object.keys(stageDurations) as LeadStatus[]).forEach((stage) => {
    const metric = stageDurations[stage]
    metric.averageDays = metric.samples > 0 ? Number((metric.totalDays / metric.samples).toFixed(2)) : 0
  })

  const conversionTimelineMap: Record<string, number> = {}
  leads
    .filter((lead) => lead.status === 'converted')
    .forEach((lead) => {
      const month = lead.updatedAt.slice(0, 7)
      conversionTimelineMap[month] = (conversionTimelineMap[month] || 0) + 1
    })

  const conversionTimeline = Object.keys(conversionTimelineMap)
    .sort()
    .map((month) => ({ month, converted: conversionTimelineMap[month] }))

  const lifecycleMetrics = {
    totalActiveLeads: leads.filter((lead) => lead.status !== 'converted' && lead.status !== 'lost').length,
    convertedLeads: stageCounts.converted,
    lostLeads: stageCounts.lost,
    avgContactAttempts: leads.length
      ? Number((leads.reduce((sum, lead) => sum + (lead.contactCount || 0), 0) / leads.length).toFixed(2))
      : 0,
    avgLeadAgeDays: leads.length
      ? Number(
          (
            leads.reduce((sum, lead) => sum + daysBetween(lead.createdAt, new Date().toISOString()), 0) /
            leads.length
          ).toFixed(2)
        )
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
