import { apiClient } from '@/lib/api-client'

// Which expert this slot's capacity belongs to. Mirrors backend ExpertType
// (src/models/Enums.ts). Every slot created before this field existed is
// backfilled to 'nutritionist' — see scripts/backfill-slot-expert-type.ts in
// the backend repo.
export type SlotExpertType = 'nutritionist' | 'trainer' | 'doctor' | 'sports_scientist'

export const SLOT_EXPERT_TYPE_OPTIONS: { value: SlotExpertType; label: string }[] = [
  { value: 'nutritionist', label: 'Nutritionist' },
  { value: 'sports_scientist', label: 'Sports Scientist' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'doctor', label: 'Doctor' },
]

export interface Slot {
  _id: string
  date?: string
  expertType: SlotExpertType
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
  date?: string
  expertType?: SlotExpertType
  startTime: string
  endTime: string
  isDaily?: boolean
  capacity?: number
  isBooked?: boolean
}

export interface UpdateSlotPayload {
  date?: string
  expertType?: SlotExpertType
  startTime?: string
  endTime?: string
  isDaily?: boolean
  capacity?: number
  remainingCapacity?: number
  isBooked?: boolean
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

  const expertType: SlotExpertType = SLOT_EXPERT_TYPE_OPTIONS.some(
    (option) => option.value === raw?.expertType
  )
    ? raw.expertType
    : 'nutritionist'

  return {
    _id: String(raw?._id || raw?.id || ''),
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
  getAll: async (): Promise<{ slots: Slot[] }> => {
    const { data } = await apiClient.get('/slots')
    if (Array.isArray(data?.slots)) {
      return { slots: data.slots.map(normalizeSlot) }
    }
    if (Array.isArray(data)) {
      return { slots: data.map(normalizeSlot) }
    }
    return { slots: [] }
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
}
