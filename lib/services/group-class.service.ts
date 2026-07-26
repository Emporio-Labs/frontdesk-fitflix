import { apiClient } from '@/lib/api-client'

export type GroupClassMode = 'online' | 'offline' | 'hybrid'

export interface GroupClass {
  id: string
  name: string
  description: string
  mode: GroupClassMode
  instructor: string
  durationMinutes: number
  creditsRequired: number
  maxParticipants: number
  tags: string[]
  scheduleInfo: string
  isActive: boolean
  slots?: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateGroupClassPayload {
  name: string
  description: string
  mode: GroupClassMode
  instructor: string
  durationMinutes: number
  creditsRequired: number
  maxParticipants: number
  tags: string[]
  scheduleInfo: string
  slots?: string[]
  isActive?: boolean
}

export interface UpdateGroupClassPayload extends Partial<CreateGroupClassPayload> {}

function normalizeGroupClass(raw: any): GroupClass {
  return {
    id: raw?._id || raw?.id || '',
    name: raw?.name || '',
    description: raw?.description || '',
    mode: raw?.mode ?? 'offline',
    instructor: raw?.instructor ?? 'Staff',
    durationMinutes: Number(raw?.durationMinutes ?? 60),
    creditsRequired: Number(raw?.creditCost ?? raw?.creditsRequired ?? 1),
    maxParticipants: Number(raw?.maxParticipants ?? 20),
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    scheduleInfo: raw?.scheduleInfo ?? 'Daily',
    isActive: raw?.status ? (raw.status === 'ACTIVE') : (raw?.isActive ?? true),
    slots: Array.isArray(raw?.slots)
      ? raw.slots.map((s: any) => String(s?._id ?? s))
      : [],
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
      status: payload.isActive === false ? 'INACTIVE' : 'ACTIVE',
      creditCost: payload.creditsRequired,
      mode: payload.mode,
      instructor: payload.instructor,
      durationMinutes: payload.durationMinutes,
      maxParticipants: payload.maxParticipants,
      tags: payload.tags,
      scheduleInfo: payload.scheduleInfo,
      slots: payload.slots ?? [],
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
      status: payload.isActive === false ? 'INACTIVE' : 'ACTIVE',
      creditCost: payload.creditsRequired,
      mode: payload.mode,
      instructor: payload.instructor,
      durationMinutes: payload.durationMinutes,
      maxParticipants: payload.maxParticipants,
      tags: payload.tags,
      scheduleInfo: payload.scheduleInfo,
      slots: payload.slots ?? [],
    })
    return {
      message: data?.message || 'Group class updated successfully',
      groupClass: normalizeGroupClass(data?.class ?? data?.groupClass ?? data),
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/api/v1/admin/classes/${id}`)
    return { message: data?.message || 'Group class retired successfully' }
  },
}
