import { apiClient } from '@/lib/api-client'
import { mockTherapies } from '@/lib/mock-data'

export interface ServiceCatalogItem {
  id: string
  name: string
  time: number
  description: string
  tags: string[]
  slots: string[]
}

export interface CreateServicePayload {
  name: string
  time: number
  description?: string
  tags?: string[]
  slots?: string[]
}

export interface UpdateServicePayload {
  name?: string
  time?: number
  description?: string
  tags?: string[]
  slots?: string[]
}

let fallbackStore: ServiceCatalogItem[] = mockTherapies.map((item) => ({
  id: item.id,
  name: item.name,
  time: item.duration,
  description: item.description,
  tags: item.category ? [item.category.toLowerCase().replace(/\s+/g, '-')] : [],
  slots: [],
}))

function normalizeService(raw: any): ServiceCatalogItem {
  return {
    id: raw?._id || raw?.id || '',
    name: raw?.serviceName || raw?.name || '',
    time: Number(raw?.serviceTime ?? raw?.time ?? 0),
    description: raw?.description || '',
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    slots: Array.isArray(raw?.slots)
      ? raw.slots.map((slot: unknown) => String((slot as any)?._id || slot || ''))
      : [],
  }
}

function nextFallbackId() {
  return `sv${fallbackStore.length + 1}`
}

export const serviceService = {
  getAll: async (): Promise<{ services: ServiceCatalogItem[] }> => {
    try {
      const { data } = await apiClient.get('/services')
      if (Array.isArray(data?.services)) return { services: data.services.map(normalizeService) }
      if (Array.isArray(data)) return { services: data.map(normalizeService) }
      return { services: [] }
    } catch {
      return { services: [...fallbackStore] }
    }
  },

  getById: async (id: string): Promise<{ service: ServiceCatalogItem }> => {
    try {
      const { data } = await apiClient.get(`/services/${id}`)
      return { service: normalizeService(data?.service || data) }
    } catch {
      const service = fallbackStore.find((item) => item.id === id)
      if (!service) throw new Error('Service not found')
      return { service }
    }
  },

  create: async (payload: CreateServicePayload): Promise<{ message: string; service: ServiceCatalogItem }> => {
    const apiPayload = {
      serviceName: payload.name,
      serviceTime: payload.time,
      description: payload.description || '',
      tags: payload.tags || [],
      slots: payload.slots || [],
    }

    try {
      const { data } = await apiClient.post('/services', apiPayload)
      return {
        message: data?.message || 'Service created successfully',
        service: normalizeService(data?.service || data),
      }
    } catch {
      const service: ServiceCatalogItem = {
        id: nextFallbackId(),
        name: payload.name,
        time: payload.time,
        description: payload.description || '',
        tags: payload.tags || [],
        slots: payload.slots || [],
      }
      fallbackStore = [service, ...fallbackStore]
      return { message: 'Service created locally', service }
    }
  },

  update: async (id: string, payload: UpdateServicePayload): Promise<{ message: string; service: ServiceCatalogItem }> => {
    const apiPayload = {
      ...(payload.name !== undefined ? { serviceName: payload.name } : {}),
      ...(payload.time !== undefined ? { serviceTime: payload.time } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
      ...(payload.slots !== undefined ? { slots: payload.slots } : {}),
    }

    try {
      const { data } = await apiClient.patch(`/services/${id}`, apiPayload)
      return {
        message: data?.message || 'Service updated successfully',
        service: normalizeService(data?.service || data),
      }
    } catch {
      const current = fallbackStore.find((item) => item.id === id)
      if (!current) throw new Error('Service not found')
      const updated: ServiceCatalogItem = { ...current, ...payload }
      fallbackStore = fallbackStore.map((item) => (item.id === id ? updated : item))
      return { message: 'Service updated locally', service: updated }
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    try {
      const { data } = await apiClient.delete(`/services/${id}`)
      return { message: data?.message || 'Service deleted successfully' }
    } catch {
      fallbackStore = fallbackStore.filter((item) => item.id !== id)
      return { message: 'Service deleted locally' }
    }
  },
}
