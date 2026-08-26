import { apiClient } from '@/lib/api-client'

export type SlotResourceType =
  | 'SPORTS_SCIENTIST'
  | 'NUTRITIONIST'
  | 'THERAPY'
  | 'SERVICE'
  | 'EXPERT'
  | 'CLASS'

export const RESOURCE_TYPE_OPTIONS: { value: SlotResourceType; label: string }[] = [
  { value: 'SPORTS_SCIENTIST', label: 'Sports Scientist' },
  { value: 'NUTRITIONIST', label: 'Nutritionist' },
  { value: 'THERAPY', label: 'Therapies' },
]

export type SlotExpertType = 'nutritionist' | 'trainer' | 'doctor' | 'sports_scientist'

export const SLOT_EXPERT_TYPE_OPTIONS: { value: SlotExpertType; label: string }[] = [
  { value: 'nutritionist', label: 'Nutritionist' },
  { value: 'sports_scientist', label: 'Sports Scientist' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'doctor', label: 'Doctor' },
]

export interface SlotLocation {
  _id: string
  name: string
  address?: string
}

export interface Slot {
  _id: string
  locationId?: string | SlotLocation | null
  resourceType: SlotResourceType
  resourceId?: string | null
  durationMinutes?: number
  expertType: SlotExpertType
  date?: string
  startTime: string
  endTime: string
  isDaily: boolean
  parentTemplate?: string
  capacity: number
  remainingCapacity: number
  isBooked: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSlotPayload {
  locationId?: string | null
  resourceType?: SlotResourceType
  resourceId?: string | null
  durationMinutes?: number
  date?: string
  expertType?: SlotExpertType
  startTime: string
  endTime: string
  isDaily?: boolean
  capacity?: number
  remainingCapacity?: number
  isBooked?: boolean
}

export interface UpdateSlotPayload {
  locationId?: string | null
  resourceType?: SlotResourceType
  resourceId?: string | null
  durationMinutes?: number
  date?: string
  expertType?: SlotExpertType
  startTime?: string
  endTime?: string
  isDaily?: boolean
  capacity?: number
  remainingCapacity?: number
  isBooked?: boolean
}

export interface SlotFilterParams {
  locationId?: string
  resourceType?: SlotResourceType
  expertType?: SlotExpertType
  resourceId?: string
  isDaily?: boolean
  date?: string
  dateFrom?: string
  dateTo?: string
}

export interface GenerateSlotsPayload {
  locationId?: string | null
  resourceType: SlotResourceType
  resourceId?: string | null
  expertType?: SlotExpertType
  isDaily?: boolean
  replaceExisting?: boolean
  dateFrom?: string
  dateTo?: string
  daysOfWeek?: number[]
  windows: Array<{ startTime: string; endTime: string }>
  slotDurationMinutes: number
  bufferMinutes?: number
  capacity?: number
  dryRun?: boolean
}

export interface GenerateSlotsConflict {
  date?: string
  startTime: string
  endTime: string
  reason: string
}

export interface GenerateSlotsResult {
  dryRun?: boolean
  message?: string
  totalCalculated?: number
  proposedCount?: number
  preview?: Slot[]
  createdCount?: number
  created?: Slot[]
  conflicts: GenerateSlotsConflict[]
  conflictCount?: number
}

function parseNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeSlot(raw: any): Slot {
  const rawDate = raw?.date ? String(raw.date) : ''
  const isDaily =
    raw?.isDaily === true ||
    String(raw?.recurrence || '').toLowerCase() === 'daily' ||
    rawDate.length === 0

  const capacity = Math.max(
    1,
    parseNumber(
      raw?.capacity ?? raw?.slotCapacity ?? raw?.maxCapacity,
      1
    )
  )

  const remainingCapacity = Math.max(
    0,
    parseNumber(
      raw?.remainingCapacity ?? raw?.availableCapacity,
      raw?.isBooked ? 0 : capacity
    )
  )

  let resourceType: SlotResourceType = 'NUTRITIONIST'
  if (raw?.resourceType && RESOURCE_TYPE_OPTIONS.some((o) => o.value === raw.resourceType)) {
    resourceType = raw.resourceType
  } else if (raw?.expertType === 'sports_scientist') {
    resourceType = 'SPORTS_SCIENTIST'
  } else if (raw?.expertType === 'nutritionist') {
    resourceType = 'NUTRITIONIST'
  }

  const expertType: SlotExpertType =
    resourceType === 'SPORTS_SCIENTIST'
      ? 'sports_scientist'
      : (raw?.expertType as SlotExpertType) || 'nutritionist'

  return {
    _id: String(raw?._id || raw?.id || ''),
    locationId: raw?.locationId || null,
    resourceType,
    resourceId: raw?.resourceId ? String(raw.resourceId?._id || raw.resourceId) : null,
    durationMinutes: raw?.durationMinutes ? Number(raw.durationMinutes) : undefined,
    date: rawDate || undefined,
    expertType,
    startTime: String(raw?.startTime || ''),
    endTime: String(raw?.endTime || ''),
    isDaily,
    parentTemplate: raw?.parentTemplate
      ? String(raw?.parentTemplate?._id || raw.parentTemplate)
      : undefined,
    capacity,
    remainingCapacity,
    isBooked:
      typeof raw?.isBooked === 'boolean'
        ? raw.isBooked
        : remainingCapacity <= 0,
    createdAt: String(raw?.createdAt || ''),
    updatedAt: String(raw?.updatedAt || ''),
  }
}

export const slotService = {
  getAll: async (filters?: SlotFilterParams): Promise<{ slots: Slot[] }> => {
    const params = new URLSearchParams()
    if (filters?.locationId) params.append('locationId', filters.locationId)
    if (filters?.resourceType) params.append('resourceType', filters.resourceType)
    if (filters?.expertType) params.append('expertType', filters.expertType)
    if (filters?.resourceId) params.append('resourceId', filters.resourceId)
    if (filters?.isDaily !== undefined) params.append('isDaily', String(filters.isDaily))
    if (filters?.date) params.append('date', filters.date)
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.append('dateTo', filters.dateTo)

    const queryString = params.toString()
    const url = queryString ? `/slots?${queryString}` : '/slots'
    const { data } = await apiClient.get(url)

    if (Array.isArray(data?.slots)) {
      return { slots: data.slots.map(normalizeSlot) }
    }
    if (Array.isArray(data)) {
      return { slots: data.map(normalizeSlot) }
    }
    return { slots: [] }
  },

  getAvailable: async (params: {
    date: string
    resourceType?: SlotResourceType
    expertType?: SlotExpertType
    locationId?: string
    resourceId?: string
  }): Promise<{ date: string; slots: Array<Slot & { slotId: string }> }> => {
    const q = new URLSearchParams({ date: params.date })
    if (params.resourceType) q.append('resourceType', params.resourceType)
    if (params.expertType) q.append('expertType', params.expertType)
    if (params.locationId) q.append('locationId', params.locationId)
    if (params.resourceId) q.append('resourceId', params.resourceId)

    const { data } = await apiClient.get(`/slots/available?${q.toString()}`)
    const rawSlots = Array.isArray(data?.slots) ? data.slots : []
    return {
      date: data?.date || params.date,
      slots: rawSlots.map((s: any) => ({
        ...normalizeSlot(s),
        slotId: String(s?.slotId || s?._id || ''),
      })),
    }
  },

  getById: async (id: string): Promise<{ slot: Slot }> => {
    const { data } = await apiClient.get(`/slots/${id}`)
    return { slot: normalizeSlot(data?.slot || data) }
  },

  create: async (payload: CreateSlotPayload): Promise<{ message: string; slot: Slot }> => {
    const { data } = await apiClient.post('/slots', payload)
    return {
      message: data?.message || 'Slot created successfully',
      slot: normalizeSlot(data?.slot || data),
    }
  },

  generate: async (payload: GenerateSlotsPayload): Promise<GenerateSlotsResult> => {
    const { data } = await apiClient.post('/slots/generate', payload)
    return {
      dryRun: data?.dryRun,
      message: data?.message,
      totalCalculated: data?.totalCalculated,
      proposedCount: data?.proposedCount,
      preview: Array.isArray(data?.preview) ? data.preview.map(normalizeSlot) : undefined,
      createdCount: data?.createdCount,
      created: Array.isArray(data?.created) ? data.created.map(normalizeSlot) : undefined,
      conflicts: Array.isArray(data?.conflicts) ? data.conflicts : [],
      conflictCount: data?.conflictCount ?? 0,
    }
  },

  update: async (id: string, payload: UpdateSlotPayload): Promise<{ message: string; slot: Slot }> => {
    const { data } = await apiClient.patch(`/slots/${id}`, payload)
    return {
      message: data?.message || 'Slot updated successfully',
      slot: normalizeSlot(data?.slot || data),
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/slots/${id}`)
    return { message: data?.message || 'Slot deleted successfully' }
  },

  bulkDelete: async (slotIds: string[]): Promise<{ message: string; deletedCount: number }> => {
    const { data } = await apiClient.post('/slots/bulk-delete', { slotIds })
    return {
      message: data?.message || 'Slots deleted successfully',
      deletedCount: data?.deletedCount ?? 0,
    }
  },

  bulkUpdate: async (payload: { slotIds: string[]; capacity?: number }): Promise<{ message: string; modifiedCount: number }> => {
    const { data } = await apiClient.post('/slots/bulk-update', payload)
    return {
      message: data?.message || 'Slots updated successfully',
      modifiedCount: data?.modifiedCount ?? 0,
    }
  },
}
