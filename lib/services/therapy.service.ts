import { apiClient } from '@/lib/api-client'

export interface TherapyCatalogItem {
  id: string
  name: string
  time: number
  description: string
  tags: string[]
  slots: string[]
}

export interface CreateTherapyPayload {
  name: string
  time: number
  description?: string
  tags?: string[]
  slots?: string[]
}

export interface UpdateTherapyPayload {
  name?: string
  time?: number
  description?: string
  tags?: string[]
  slots?: string[]
}

function normalizeTherapy(raw: any): TherapyCatalogItem {
  return {
    id: raw?._id || raw?.id || '',
    name: raw?.therapyName || raw?.name || '',
    time: Number(raw?.therapyTime ?? raw?.time ?? 0),
    description: raw?.description || '',
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    slots: Array.isArray(raw?.slots)
      ? raw.slots.map((slot: unknown) => String((slot as any)?._id || slot || ''))
      : [],
  }
}

export const therapyService = {
  getAll: async (): Promise<{ therapies: TherapyCatalogItem[] }> => {
    const { data } = await apiClient.get('/therapies')
    if (Array.isArray(data?.therapies)) return { therapies: data.therapies.map(normalizeTherapy) }
    if (Array.isArray(data)) return { therapies: data.map(normalizeTherapy) }
    return { therapies: [] }
  },

  getById: async (id: string): Promise<{ therapy: TherapyCatalogItem }> => {
    const { data } = await apiClient.get(`/therapies/${id}`)
    return { therapy: normalizeTherapy(data?.therapy || data) }
  },

  create: async (payload: CreateTherapyPayload): Promise<{ message: string; therapy: TherapyCatalogItem }> => {
    const apiPayload = {
      therapyName: payload.name,
      therapyTime: payload.time,
      description: payload.description || '',
      tags: payload.tags || [],
      slots: payload.slots || [],
    }

    const { data } = await apiClient.post('/therapies', apiPayload)
    return {
      message: data?.message || 'Therapy created successfully',
      therapy: normalizeTherapy(data?.therapy || data),
    }
  },

  update: async (id: string, payload: UpdateTherapyPayload): Promise<{ message: string; therapy: TherapyCatalogItem }> => {
    const apiPayload = {
      ...(payload.name !== undefined ? { therapyName: payload.name } : {}),
      ...(payload.time !== undefined ? { therapyTime: payload.time } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
      ...(payload.slots !== undefined ? { slots: payload.slots } : {}),
    }

    const { data } = await apiClient.patch(`/therapies/${id}`, apiPayload)
    return {
      message: data?.message || 'Therapy updated successfully',
      therapy: normalizeTherapy(data?.therapy || data),
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/therapies/${id}`)
    return { message: data?.message || 'Therapy deleted successfully' }
  },
}
