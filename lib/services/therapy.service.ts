import { apiClient } from '@/lib/api-client'
import { mockTherapies } from '@/lib/mock-data'

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

let fallbackStore: TherapyCatalogItem[] = mockTherapies.map((item) => ({
  id: item.id,
  name: item.name,
  time: item.duration,
  description: item.description,
  tags: item.category ? [item.category.toLowerCase().replace(/\s+/g, '-')] : [],
  slots: [],
}))

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

function nextFallbackId() {
  return `th${fallbackStore.length + 1}`
}

export const therapyService = {
  getAll: async (): Promise<{ therapies: TherapyCatalogItem[] }> => {
    try {
      const { data } = await apiClient.get('/therapies')
      if (Array.isArray(data?.therapies)) return { therapies: data.therapies.map(normalizeTherapy) }
      if (Array.isArray(data)) return { therapies: data.map(normalizeTherapy) }
      return { therapies: [] }
    } catch {
      return { therapies: [...fallbackStore] }
    }
  },

  getById: async (id: string): Promise<{ therapy: TherapyCatalogItem }> => {
    try {
      const { data } = await apiClient.get(`/therapies/${id}`)
      return { therapy: normalizeTherapy(data?.therapy || data) }
    } catch {
      const therapy = fallbackStore.find((item) => item.id === id)
      if (!therapy) throw new Error('Therapy not found')
      return { therapy }
    }
  },

  create: async (payload: CreateTherapyPayload): Promise<{ message: string; therapy: TherapyCatalogItem }> => {
    const apiPayload = {
      therapyName: payload.name,
      therapyTime: payload.time,
      description: payload.description || '',
      tags: payload.tags || [],
      slots: payload.slots || [],
    }

    try {
      const { data } = await apiClient.post('/therapies', apiPayload)
      return {
        message: data?.message || 'Therapy created successfully',
        therapy: normalizeTherapy(data?.therapy || data),
      }
    } catch {
      const therapy: TherapyCatalogItem = {
        id: nextFallbackId(),
        name: payload.name,
        time: payload.time,
        description: payload.description || '',
        tags: payload.tags || [],
        slots: payload.slots || [],
      }
      fallbackStore = [therapy, ...fallbackStore]
      return { message: 'Therapy created locally', therapy }
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

    try {
      const { data } = await apiClient.patch(`/therapies/${id}`, apiPayload)
      return {
        message: data?.message || 'Therapy updated successfully',
        therapy: normalizeTherapy(data?.therapy || data),
      }
    } catch {
      const current = fallbackStore.find((item) => item.id === id)
      if (!current) throw new Error('Therapy not found')
      const updated: TherapyCatalogItem = { ...current, ...payload }
      fallbackStore = fallbackStore.map((item) => (item.id === id ? updated : item))
      return { message: 'Therapy updated locally', therapy: updated }
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    try {
      const { data } = await apiClient.delete(`/therapies/${id}`)
      return { message: data?.message || 'Therapy deleted successfully' }
    } catch {
      fallbackStore = fallbackStore.filter((item) => item.id !== id)
      return { message: 'Therapy deleted locally' }
    }
  },
}
