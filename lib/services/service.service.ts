import { apiClient } from '@/lib/api-client'

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

export const serviceService = {
  getAll: async (): Promise<{ services: ServiceCatalogItem[] }> => {
    const { data } = await apiClient.get('/services')
    if (Array.isArray(data?.services)) return { services: data.services.map(normalizeService) }
    if (Array.isArray(data)) return { services: data.map(normalizeService) }
    return { services: [] }
  },

  getById: async (id: string): Promise<{ service: ServiceCatalogItem }> => {
    const { data } = await apiClient.get(`/services/${id}`)
    return { service: normalizeService(data?.service || data) }
  },

  create: async (payload: CreateServicePayload): Promise<{ message: string; service: ServiceCatalogItem }> => {
    const apiPayload = {
      serviceName: payload.name,
      serviceTime: payload.time,
      description: payload.description || '',
      tags: payload.tags || [],
      slots: payload.slots || [],
    }

    const { data } = await apiClient.post('/services', apiPayload)
    return {
      message: data?.message || 'Service created successfully',
      service: normalizeService(data?.service || data),
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

    const { data } = await apiClient.patch(`/services/${id}`, apiPayload)
    return {
      message: data?.message || 'Service updated successfully',
      service: normalizeService(data?.service || data),
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/services/${id}`)
    return { message: data?.message || 'Service deleted successfully' }
  },
}
