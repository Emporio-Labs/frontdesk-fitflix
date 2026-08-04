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
  timeSlot?: string | null
  slotId?: string | null
  zegoRoomId?: string | null
  assignedNutritionistId?: string | null
  assignedNutritionistName?: string | null
  meetingStatus?: string | null
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
    bookingStatus: raw?.bookingStatus ?? (raw?.status === 'ACCEPTED' ? 'Confirmed' : raw?.status === 'REJECTED' ? 'Cancelled' : raw?.status === 'COMPLETED' ? 'Completed' : raw?.status ?? 'Pending'),
    appointmentDate: raw?.appointmentDate ?? raw?.bookingDate ?? raw?.date ?? null,
    zegoRoomId: raw?.zegoRoomId ?? null,
    assignedNutritionistId: raw?.assignedNutritionistId ?? null,
    assignedNutritionistName: raw?.assignedNutritionistName ?? null,
    meetingStatus: raw?.meetingStatus ?? 'SCHEDULED',
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
