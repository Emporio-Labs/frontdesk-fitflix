import { apiClient } from '@/lib/api-client'

export interface Doctor {
  _id: string
  doctorName: string
  email: string
  phone: string
  description: string
  specialities: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateDoctorPayload {
  doctorName: string
  email: string
  phone: string
  password: string
  description: string
  specialities: string[]
}

export interface UpdateDoctorPayload {
  doctorName?: string
  description?: string
  specialities?: string[]
}

export const doctorService = {
  getAll: async (): Promise<{ doctors: Doctor[] }> => {
    const { data } = await apiClient.get('/doctors')
    return data
  },
  getById: async (id: string): Promise<{ doctor: Doctor }> => {
    const { data } = await apiClient.get(`/doctors/${id}`)
    return data
  },
  create: async (payload: CreateDoctorPayload): Promise<{ message: string; doctor: Doctor }> => {
    const { data } = await apiClient.post('/doctors', payload)
    return data
  },
  update: async (id: string, payload: UpdateDoctorPayload): Promise<{ message: string; doctor: Doctor }> => {
    const { data } = await apiClient.patch(`/doctors/${id}`, payload)
    return data
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/doctors/${id}`)
    return data
  },
}
