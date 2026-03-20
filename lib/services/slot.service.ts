import { apiClient } from '@/lib/api-client'

export interface Slot {
  _id: string
  date: string
  startTime: string
  endTime: string
  isBooked: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSlotPayload {
  date: string
  startTime: string
  endTime: string
  isBooked?: boolean
}

export interface UpdateSlotPayload {
  date?: string
  startTime?: string
  endTime?: string
  isBooked?: boolean
}

export const slotService = {
  getAll: async (): Promise<{ slots: Slot[] }> => {
    const { data } = await apiClient.get('/slots')
    return data
  },
  getById: async (id: string): Promise<{ slot: Slot }> => {
    const { data } = await apiClient.get(`/slots/${id}`)
    return data
  },
  create: async (payload: CreateSlotPayload): Promise<{ message: string; slot: Slot }> => {
    const { data } = await apiClient.post('/slots', payload)
    return data
  },
  update: async (id: string, payload: UpdateSlotPayload): Promise<{ message: string; slot: Slot }> => {
    const { data } = await apiClient.patch(`/slots/${id}`, payload)
    return data
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/slots/${id}`)
    return data
  },
}
