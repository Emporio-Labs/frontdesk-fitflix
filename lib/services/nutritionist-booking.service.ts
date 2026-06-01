import { apiClient } from '@/lib/api-client'
import type { PopulatedUserRef } from '@/lib/populated'

export type AppointmentMode = 'IN_PERSON' | 'ONLINE'

export type NutritionistBookingStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed'

export interface NutritionistBooking {
  _id: string
  userId: PopulatedUserRef
  expertType: 'nutritionist'
  bookingStatus: NutritionistBookingStatus
  appointmentDate?: string | null
  appointmentMode?: AppointmentMode
  meetingLink?: string | null
  calBookingId?: string | null
  calComBookingId?: string | null
  timeSlot?: string | null
  slotId?: string | null
  createdAt: string
  updatedAt?: string
}

export interface NutritionistBookingsResponse {
  bookings: NutritionistBooking[]
}

export interface NutritionistBookingActionResponse {
  message: string
  booking: NutritionistBooking
}

function normalizeBooking(raw: any): NutritionistBooking {
  if (!raw) return raw
  return {
    ...raw,
    appointmentDate: raw?.appointmentDate ?? raw?.date ?? null,
    calBookingId: raw?.calBookingId ?? raw?.calComBookingId ?? null,
  }
}

export const nutritionistBookingService = {
  getAll: async (): Promise<NutritionistBookingsResponse> => {
    const { data } = await apiClient.get('/nutritionist/bookings')
    const bookings = Array.isArray(data?.bookings) ? data.bookings : []
    return { bookings: bookings.map(normalizeBooking) }
  },
  accept: async (id: string): Promise<NutritionistBookingActionResponse> => {
    const { data } = await apiClient.patch(`/nutritionist/bookings/${id}/accept`)
    return {
      message: data?.message ?? 'Booking accepted',
      booking: normalizeBooking(data?.booking),
    }
  },
  reject: async (id: string): Promise<NutritionistBookingActionResponse> => {
    const { data } = await apiClient.patch(`/nutritionist/bookings/${id}/reject`)
    return {
      message: data?.message ?? 'Booking rejected',
      booking: normalizeBooking(data?.booking),
    }
  },
  complete: async (id: string): Promise<NutritionistBookingActionResponse> => {
    const { data } = await apiClient.patch(`/nutritionist/bookings/${id}/complete`)
    return {
      message: data?.message ?? 'Consultation completed',
      booking: normalizeBooking(data?.booking),
    }
  },
}
