import { apiClient } from '@/lib/api-client'
import type { PopulatedUserRef } from '@/lib/populated'

export type AppointmentMode = 'IN_PERSON' | 'ONLINE'

export type NutritionistBookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Rejected'
  | 'Cancelled'
  | 'Completed'
  | 'Expired'
  | 'RescheduleRequired'

export interface NutritionistBooking {
  _id: string
  userId: PopulatedUserRef
  expertType: 'nutritionist'
  bookingStatus: NutritionistBookingStatus
  appointmentDate?: string | null
  appointmentMode?: AppointmentMode
  meetingLink?: string | null
  timeSlot?: string | null
  clinicLocation?: string | null
  // Backend field names (bookingDate/startTime/endTime — see
  // FITFLIX_BACKEND src/models/NutritionistBooking.ts). Not covered by
  // normalizeBooking's explicit mapping, but the `...raw` spread there
  // already forwards them at runtime; typed here so callers (join-window
  // gating) can read them without a cast.
  startTime?: string | null
  endTime?: string | null
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
    bookingStatus:
      raw?.bookingStatus ??
      (raw?.status === 'ACCEPTED'
        ? 'Confirmed'
        // Staff-declined vs member-withdrawn are distinct outcomes — see
        // FITFLIX_BACKEND NutritionistBookingStatus. Keeping them apart here
        // is what lets the appointments tab badge them differently.
        : raw?.status === 'REJECTED'
          ? 'Rejected'
          : raw?.status === 'CANCELLED'
            ? 'Cancelled'
            : raw?.status === 'COMPLETED'
              ? 'Completed'
              : raw?.status === 'EXPIRED'
                ? 'Expired'
                : raw?.status === 'RESCHEDULE_REQUIRED'
                  ? 'RescheduleRequired'
                  : raw?.status ?? 'Pending'),
    appointmentDate: raw?.appointmentDate ?? raw?.bookingDate ?? raw?.date ?? null,
    zegoRoomId: raw?.zegoRoomId ?? null,
    assignedNutritionistId: raw?.assignedNutritionistId ?? null,
    assignedNutritionistName: raw?.assignedNutritionistName ?? null,
    meetingStatus: raw?.meetingStatus ?? 'SCHEDULED',
  }
}

// ── Typed error for ownership guard (AC FX-06.3) ─────────────────────────────
export class NotYourClientError extends Error {
  constructor() {
    super('not_your_client')
    this.name = 'NotYourClientError'
  }
}

export const nutritionistBookingService = {
  getAll: async (): Promise<NutritionistBookingsResponse> => {
    const { data } = await apiClient.get('/nutritionist/bookings')
    const bookings = Array.isArray(data?.bookings) ? data.bookings : []
    return { bookings: bookings.map(normalizeBooking) }
  },

  // ── My-clients endpoints (FX-06.1) ─────────────────────────────────────────
  // Mirrors the trainer pattern: GET /nutritionist/me/members
  // Backend is expected to filter by the signed-in nutritionist's assignedNutritionistId.
  getMyClients: async (): Promise<{ members: any[] }> => {
    const { data } = await apiClient.get('/nutritionist/me/members')
    return { members: Array.isArray(data?.members) ? data.members : [] }
  },

  // Returns a single client — throws NotYourClientError on 403 (AC FX-06.3).
  getMyClientById: async (userId: string): Promise<{ member: any }> => {
    try {
      const { data } = await apiClient.get(`/nutritionist/me/members/${userId}`)
      return { member: data?.member ?? data?.user ?? data }
    } catch (e: any) {
      if (e?.response?.status === 403) {
        throw new NotYourClientError()
      }
      throw e
    }
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
