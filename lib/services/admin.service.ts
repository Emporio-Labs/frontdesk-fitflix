import { apiClient } from '@/lib/api-client'

export interface Admin {
  _id: string
  adminName: string
  email: string
  phone: string
  createdAt: string
  updatedAt: string
}

export interface CreateAdminPayload {
  adminName: string
  email: string
  phone: string
  password: string
}

export interface UpdateAdminPayload {
  adminName?: string
  email?: string
  phone?: string
  password?: string
}

export const adminService = {
  getAll: async (): Promise<{ admins: Admin[] }> => {
    const { data } = await apiClient.get('/admins')
    return data
  },
  getById: async (id: string): Promise<{ admin: Admin }> => {
    const { data } = await apiClient.get(`/admins/${id}`)
    return data
  },
  create: async (payload: CreateAdminPayload): Promise<{ message: string; admin: Admin }> => {
    const { data } = await apiClient.post('/admins', payload)
    return data
  },
  update: async (id: string, payload: UpdateAdminPayload): Promise<{ message: string; admin: Admin }> => {
    const { data } = await apiClient.patch(`/admins/${id}`, payload)
    return data
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/admins/${id}`)
    return data
  },
}
