import { apiClient } from '@/lib/api-client'
import { mockTherapies } from '@/lib/mock-data'

export type TherapyStatus = 'active' | 'inactive'

export interface Therapy {
  id: string
  name: string
  category: string
  description: string
  price: number
  duration: number
  status: TherapyStatus
}

export interface CreateTherapyPayload {
  name: string
  category: string
  description?: string
  price: number
  duration: number
  status?: TherapyStatus
}

export interface UpdateTherapyPayload {
  name?: string
  category?: string
  description?: string
  price?: number
  duration?: number
  status?: TherapyStatus
}

let fallbackStore: Therapy[] = [...mockTherapies]

function normalizeTherapy(raw: any): Therapy {
  return {
    id: raw?.id || raw?._id || '',
    name: raw?.name || '',
    category: raw?.category || '',
    description: raw?.description || '',
    price: Number(raw?.price ?? 0),
    duration: Number(raw?.duration ?? 0),
    status: raw?.status === 'inactive' ? 'inactive' : 'active',
  }
}

function nextFallbackId() {
  return `th${fallbackStore.length + 1}`
}

async function getFromApi(): Promise<Therapy[]> {
  const candidates = ['/services', '/therapies']

  for (const path of candidates) {
    try {
      const { data } = await apiClient.get(path)
      if (Array.isArray(data?.services)) return data.services.map(normalizeTherapy)
      if (Array.isArray(data?.therapies)) return data.therapies.map(normalizeTherapy)
      if (Array.isArray(data)) return data.map(normalizeTherapy)
    } catch {
      // Try the next endpoint candidate.
    }
  }

  throw new Error('No services endpoint available')
}

export const therapyService = {
  getAll: async (): Promise<{ therapies: Therapy[] }> => {
    try {
      const therapies = await getFromApi()
      return { therapies }
    } catch {
      return { therapies: [...fallbackStore] }
    }
  },

  getById: async (id: string): Promise<{ therapy: Therapy }> => {
    const candidates = [`/services/${id}`, `/therapies/${id}`]

    for (const path of candidates) {
      try {
        const { data } = await apiClient.get(path)
        return { therapy: normalizeTherapy(data?.service || data?.therapy || data) }
      } catch {
        // Try the next endpoint candidate.
      }
    }

    const therapy = fallbackStore.find((t) => t.id === id)
    if (!therapy) throw new Error('Therapy not found')
    return { therapy }
  },

  create: async (payload: CreateTherapyPayload): Promise<{ message: string; therapy: Therapy }> => {
    const candidates = ['/services', '/therapies']

    for (const path of candidates) {
      try {
        const { data } = await apiClient.post(path, payload)
        return {
          message: data?.message || 'Therapy created successfully',
          therapy: normalizeTherapy(data?.service || data?.therapy || data),
        }
      } catch {
        // Try the next endpoint candidate.
      }
    }

    const therapy: Therapy = {
      id: nextFallbackId(),
      name: payload.name,
      category: payload.category,
      description: payload.description || '',
      price: payload.price,
      duration: payload.duration,
      status: payload.status || 'active',
    }
    fallbackStore = [therapy, ...fallbackStore]
    return { message: 'Therapy created locally', therapy }
  },

  update: async (id: string, payload: UpdateTherapyPayload): Promise<{ message: string; therapy: Therapy }> => {
    const candidates = [`/services/${id}`, `/therapies/${id}`]

    for (const path of candidates) {
      try {
        const { data } = await apiClient.patch(path, payload)
        return {
          message: data?.message || 'Therapy updated successfully',
          therapy: normalizeTherapy(data?.service || data?.therapy || data),
        }
      } catch {
        // Try the next endpoint candidate.
      }
    }

    const current = fallbackStore.find((t) => t.id === id)
    if (!current) throw new Error('Therapy not found')
    const updated: Therapy = { ...current, ...payload }
    fallbackStore = fallbackStore.map((t) => (t.id === id ? updated : t))
    return { message: 'Therapy updated locally', therapy: updated }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const candidates = [`/services/${id}`, `/therapies/${id}`]

    for (const path of candidates) {
      try {
        const { data } = await apiClient.delete(path)
        return { message: data?.message || 'Therapy deleted successfully' }
      } catch {
        // Try the next endpoint candidate.
      }
    }

    fallbackStore = fallbackStore.filter((t) => t.id !== id)
    return { message: 'Therapy deleted locally' }
  },
}
