import { apiClient } from '@/lib/api-client'

export type GroupClassMode = 'online' | 'offline' | 'hybrid'

export interface GroupClass {
  id: string
  name: string
  description: string
  mode: GroupClassMode
  deliveryType?: string
  sessionType?: 'group_class' | 'live_stream' | ''
  instructor: string
  // User account ID of the class host — used to determine ZEGOCLOUD
  // host vs audience role (GCLS-24). Separate from the display-name string.
  instructorUserId?: string | null
  durationMinutes: number
  creditsRequired: number
  maxParticipants: number
  tags: string[]
  scheduleInfo: string
  recurrenceRule?: string
  schedulePattern?: string
  scheduleType?: string
  daysOfWeek?: number[]
  isActive: boolean
  isPublished: boolean
  slots?: string[]
  locationAddress?: string
  streamRoomId?: string
  enableWaitlist?: boolean
  bookingWindowValue?: number
  bookingWindowUnit?: 'hours' | 'days'
  bookingCloseValue?: number
  bookingCloseUnit?: 'minutes' | 'hours' | 'days'
  createdAt: string
  updatedAt: string
}

export interface CreateGroupClassPayload {
  name: string
  description: string
  mode: GroupClassMode
  sessionType?: 'group_class' | 'live_stream' | ''
  instructor: string
  instructorUserId?: string | null
  durationMinutes: number
  creditsRequired: number
  maxParticipants: number
  tags: string[]
  scheduleInfo: string
  recurrenceRule?: string
  schedulePattern?: string
  scheduleType?: string
  daysOfWeek?: number[]
  slots?: string[]
  isActive?: boolean
  isPublished?: boolean
  locationAddress?: string
  streamRoomId?: string
  enableWaitlist?: boolean
  bookingWindowValue?: number
  bookingWindowUnit?: 'hours' | 'days'
  bookingCloseValue?: number
  bookingCloseUnit?: 'minutes' | 'hours' | 'days'
}

export interface UpdateGroupClassPayload extends Partial<CreateGroupClassPayload> {}

function normalizeGroupClass(raw: any): GroupClass {
  const published = raw?.isPublished ?? (raw?.status ? raw.status === 'ACTIVE' : (raw?.isActive ?? true))
  return {
    id: raw?._id || raw?.id || '',
    name: raw?.name || '',
    description: raw?.description || '',
    mode: raw?.mode ?? raw?.deliveryType ?? 'offline',
    deliveryType: raw?.deliveryType ?? raw?.mode ?? 'offline',
    sessionType: raw?.sessionType || '',
    instructor: raw?.instructor ?? 'Staff',
    instructorUserId: raw?.instructorUserId ?? raw?.classId?.instructorUserId ?? null,
    durationMinutes: Number(raw?.durationMinutes ?? 60),
    creditsRequired: Number(raw?.creditCost ?? raw?.creditsRequired ?? 1),
    maxParticipants: Number(raw?.maxParticipants ?? 20),
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    scheduleInfo: raw?.scheduleInfo ?? 'Daily',
    recurrenceRule: raw?.recurrenceRule || raw?.recurrence || undefined,
    schedulePattern: raw?.schedulePattern || raw?.pattern || undefined,
    scheduleType: raw?.scheduleType || undefined,
    daysOfWeek: Array.isArray(raw?.daysOfWeek) ? raw.daysOfWeek : undefined,
    isActive: published,
    isPublished: published,
    slots: Array.isArray(raw?.slots)
      ? raw.slots.map((s: any) => String(s?._id ?? s))
      : [],
    locationAddress: raw?.locationAddress ?? '',
    streamRoomId: raw?.streamRoomId ?? '',
    enableWaitlist: Boolean(raw?.enableWaitlist),
    bookingWindowValue: raw?.bookingWindowValue ?? 72,
    bookingWindowUnit: raw?.bookingWindowUnit ?? 'hours',
    bookingCloseValue: raw?.bookingCloseValue ?? 15,
    bookingCloseUnit: raw?.bookingCloseUnit ?? 'minutes',
    createdAt: raw?.createdAt ?? new Date().toISOString(),
    updatedAt: raw?.updatedAt ?? new Date().toISOString(),
  }
}

export const groupClassService = {
  getAll: async (): Promise<{ groupClasses: GroupClass[] }> => {
    const { data } = await apiClient.get('/api/v1/admin/classes')
    const list: GroupClass[] = Array.isArray(data?.classes || data?.groupClasses)
      ? (data.classes || data.groupClasses).map(normalizeGroupClass)
      : []
    return { groupClasses: list }
  },

  getById: async (id: string): Promise<{ groupClass: GroupClass }> => {
    const { data } = await apiClient.get(`/api/v1/classes/${id}`)
    return { groupClass: normalizeGroupClass(data?.class ?? data?.groupClass ?? data) }
  },

  create: async (
    payload: CreateGroupClassPayload,
  ): Promise<{ message: string; groupClass: GroupClass }> => {
    const { data } = await apiClient.post('/api/v1/admin/classes', {
      name: payload.name,
      description: payload.description,
      status: payload.isPublished === false || payload.isActive === false ? 'INACTIVE' : 'ACTIVE',
      isPublished: payload.isPublished ?? payload.isActive ?? true,
      creditCost: payload.creditsRequired,
      mode: payload.mode,
      deliveryType: payload.mode,
      sessionType: payload.sessionType || '',
      instructor: payload.instructor,
      instructorUserId: payload.instructorUserId ?? null,
      durationMinutes: payload.durationMinutes,
      maxParticipants: payload.maxParticipants,
      tags: payload.tags,
      scheduleInfo: payload.scheduleInfo,
      recurrenceRule: payload.recurrenceRule,
      schedulePattern: payload.schedulePattern,
      scheduleType: payload.scheduleType,
      daysOfWeek: payload.daysOfWeek,
      slots: payload.slots ?? [],
      locationAddress: payload.locationAddress,
      streamRoomId: payload.streamRoomId,
      enableWaitlist: payload.enableWaitlist,
      bookingWindowValue: payload.bookingWindowValue,
      bookingWindowUnit: payload.bookingWindowUnit,
      bookingCloseValue: payload.bookingCloseValue,
      bookingCloseUnit: payload.bookingCloseUnit,
    })
    return {
      message: data?.message || 'Group class created successfully',
      groupClass: normalizeGroupClass(data?.class ?? data?.groupClass ?? data),
    }
  },

  update: async (
    id: string,
    payload: UpdateGroupClassPayload,
  ): Promise<{ message: string; groupClass: GroupClass }> => {
    const { data } = await apiClient.put(`/api/v1/admin/classes/${id}`, {
      name: payload.name,
      description: payload.description,
      status: payload.isPublished === false || payload.isActive === false ? 'INACTIVE' : 'ACTIVE',
      isPublished: payload.isPublished ?? payload.isActive ?? true,
      creditCost: payload.creditsRequired,
      mode: payload.mode,
      deliveryType: payload.mode,
      sessionType: payload.sessionType || '',
      instructor: payload.instructor,
      instructorUserId: payload.instructorUserId ?? null,
      durationMinutes: payload.durationMinutes,
      maxParticipants: payload.maxParticipants,
      tags: payload.tags,
      scheduleInfo: payload.scheduleInfo,
      recurrenceRule: payload.recurrenceRule,
      schedulePattern: payload.schedulePattern,
      scheduleType: payload.scheduleType,
      daysOfWeek: payload.daysOfWeek,
      slots: payload.slots ?? [],
      locationAddress: payload.locationAddress,
      streamRoomId: payload.streamRoomId,
      enableWaitlist: payload.enableWaitlist,
      bookingWindowValue: payload.bookingWindowValue,
      bookingWindowUnit: payload.bookingWindowUnit,
      bookingCloseValue: payload.bookingCloseValue,
      bookingCloseUnit: payload.bookingCloseUnit,
    })
    return {
      message: data?.message || 'Group class updated successfully',
      groupClass: normalizeGroupClass(data?.class ?? data?.groupClass ?? data),
    }
  },

  togglePublish: async (
    id: string,
    isPublished: boolean,
  ): Promise<{ message: string; groupClass: GroupClass }> => {
    const { data } = await apiClient.patch(`/api/v1/admin/classes/schedule/${id}/publish`, {
      is_published: isPublished,
      isPublished,
    })
    return {
      message: data?.message || (isPublished ? 'Class published successfully' : 'Class unpublished'),
      groupClass: normalizeGroupClass(data?.class ?? data?.groupClass ?? data),
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/api/v1/admin/classes/${id}`)
    return { message: data?.message || 'Group class retired successfully' }
  },
}
