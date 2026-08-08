import { apiClient } from '@/lib/api-client'

export interface GroupClassBooking {
  _id: string
  bookingDate: string
  status: string
  creditCostSnapshot?: number
  creditsBypassed?: boolean
  joinedAt?: string
  leftAt?: string
  stayDurationMinutes?: number
  videoRoomId?: string
  videoConferenceId?: string
  user: {
    _id: string
    username: string
    email: string
    phone?: string
  }
  classId?: {
    _id: string
    name?: string
    instructor?: string
    creditCost?: number
    zegoRoomId?: string
  }
  service?: {
    _id: string
    serviceName?: string
    serviceType?: string
    creditCost?: number
  }
  slot?: {
    _id: string
    date?: string
    startTime?: string
    endTime?: string
  }
  sessionId?: {
    _id: string
    sessionDate?: string
    startTime?: string
    endTime?: string
    deliveryType?: string
    trainerId?: {
      _id: string
      trainerName: string
      email: string
    }
  }
  createdAt: string
  updatedAt: string
}

export const groupClassBookingService = {
  getAll: async (): Promise<{ bookings: GroupClassBooking[] }> => {
    try {
      const { data } = await apiClient.get('/api/v1/admin/bookings')
      return data
    } catch {
      try {
        const { data } = await apiClient.get('/api/v1/bookings')
        return data
      } catch {
        const { data } = await apiClient.get('/bookings')
        return data
      }
    }
  },
  getById: async (id: string): Promise<{ booking: GroupClassBooking }> => {
    try {
      const { data } = await apiClient.get(`/api/v1/admin/bookings/${id}`)
      return data
    } catch {
      try {
        const { data } = await apiClient.get(`/api/v1/bookings/${id}`)
        return data
      } catch {
        const { data } = await apiClient.get(`/bookings/${id}`)
        return data
      }
    }
  },
  cancel: async (id: string, payload: { adminOverride?: boolean; reason?: string }): Promise<any> => {
    try {
      const { data } = await apiClient.post(`/bookings/${id}/cancel`, payload)
      return data
    } catch {
      try {
        const { data } = await apiClient.post(`/api/v1/admin/bookings/${id}/cancel`, payload)
        return data
      } catch {
        const { data } = await apiClient.post(`/api/v1/bookings/${id}/cancel`, payload)
        return data
      }
    }
  },
  reschedule: async (id: string, payload: { sessionId?: string; bookingDate?: string; startTime?: string; endTime?: string; reason?: string }): Promise<any> => {
    try {
      const { data } = await apiClient.patch(`/bookings/${id}`, payload)
      return data
    } catch {
      try {
        const { data } = await apiClient.patch(`/api/v1/admin/bookings/${id}`, payload)
        return data
      } catch {
        const { data } = await apiClient.patch(`/api/v1/bookings/${id}`, payload)
        return data
      }
    }
  },
  updateStatus: async (id: string, status: string): Promise<any> => {
    try {
      const { data } = await apiClient.patch(`/api/v1/admin/bookings/${id}`, { status })
      return data
    } catch {
      try {
        const { data } = await apiClient.patch(`/api/v1/bookings/${id}/status`, { status })
        return data
      } catch {
        const { data } = await apiClient.patch(`/api/v1/group-class-bookings/${id}`, { status })
        return data
      }
    }
  },
}
