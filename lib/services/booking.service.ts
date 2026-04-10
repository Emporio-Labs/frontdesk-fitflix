import { apiClient } from '@/lib/api-client'

// Booking status enum
export const BOOKING_STATUS = {
  0: 'Booked',
  1: 'Confirmed',
  2: 'Cancelled',
  3: 'Attended',
  4: 'Unattended',
} as const

export type BookingStatusValue = keyof typeof BOOKING_STATUS

export interface Booking {
  _id: string
  bookingDate: string
  status: BookingStatusValue
  user: string
  slot: string
  service: string
  report?: string
  createdAt: string
  updatedAt: string
}

export interface BookingCreditsMeta {
  consumed?: number
  refunded?: number
  bypassed?: boolean
}

export interface CreateBookingPayload {
  bookingDate: string
  userId?: string
  slotId: string
  serviceId: string
  reportId?: string
  bypassCredits?: boolean
}

export interface UpdateBookingPayload {
  bookingDate?: string
  slotId?: string
  serviceId?: string
  reportId?: string
}

export const bookingService = {
  getAll: async (): Promise<{ bookings: Booking[] }> => {
    const { data } = await apiClient.get('/bookings')
    return data
  },
  getMine: async (): Promise<{ bookings: Booking[] }> => {
    const { data } = await apiClient.get('/bookings/me')
    return data
  },
  getById: async (id: string): Promise<{ booking: Booking }> => {
    const { data } = await apiClient.get(`/bookings/${id}`)
    return data
  },
  create: async (payload: CreateBookingPayload): Promise<{ message: string; booking: Booking; credits?: BookingCreditsMeta }> => {
    const { data } = await apiClient.post('/bookings', payload)
    return data
  },
  update: async (id: string, payload: UpdateBookingPayload): Promise<{ message: string; booking: Booking }> => {
    const { data } = await apiClient.patch(`/bookings/${id}`, payload)
    return data
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/bookings/${id}`)
    return data
  },
  changeStatus: async (id: string, status: BookingStatusValue): Promise<{ message: string; booking: Booking; credits?: BookingCreditsMeta }> => {
    const { data } = await apiClient.patch(`/bookings/${id}/status`, { status })
    return data
  },
}
