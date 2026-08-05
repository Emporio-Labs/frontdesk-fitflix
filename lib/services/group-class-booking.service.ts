import { apiClient } from '@/lib/api-client'

export interface GroupClassBooking {
  _id: string
  bookingDate: string
  status: string
  creditCostSnapshot?: number
  creditsBypassed?: boolean
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
}
