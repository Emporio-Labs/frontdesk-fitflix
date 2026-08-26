import { apiClient } from '@/lib/api-client'
import type { PopulatedUserRef } from '@/lib/populated'

export type AppointmentMode = 'IN_PERSON' | 'ONLINE'

export type SportsScientistBookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Rejected'
  | 'Cancelled'
  | 'Completed'
  | 'Expired'
  | 'RescheduleRequired'

export interface SportsScientistBooking {
  _id: string
  userId: PopulatedUserRef
  expertType: 'sports_scientist'
  bookingStatus: SportsScientistBookingStatus
  appointmentDate?: string | null
  appointmentMode?: AppointmentMode
  meetingLink?: string | null
  timeSlot?: string | null
  clinicLocation?: string | null
  startTime?: string | null
  endTime?: string | null
  slotId?: string | null
  zegoRoomId?: string | null
  assignedExpertId?: string | null
  assignedExpertName?: string | null
  acceptedAt?: string | null
  completedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  meetingStatus?: string | null
  notes?: string | null
  createdAt: string
  updatedAt?: string
}

export interface SportsScientistBookingsResponse {
  bookings: SportsScientistBooking[]
}

export interface SportsScientistBookingActionResponse {
  message: string
  booking: SportsScientistBooking
}

export interface AcceptSportsScientistBookingPayload {
  meetingLink?: string | null
  clinicLocation?: string | null
  assignedExpertId?: string | null
  assignedExpertName?: string | null
}

export interface RejectSportsScientistBookingPayload {
  rejectionReason?: string | null
}

function normalizeBooking(raw: any): SportsScientistBooking {
  if (!raw) return raw
  return {
    ...raw,
    bookingStatus:
      raw?.bookingStatus ??
      (raw?.status === 'ACCEPTED' || raw?.status === 'Confirmed'
        ? 'Confirmed'
        : raw?.status === 'REJECTED' || raw?.status === 'Rejected'
          ? 'Rejected'
          : raw?.status === 'CANCELLED' || raw?.status === 'Cancelled'
            ? 'Cancelled'
            : raw?.status === 'COMPLETED' || raw?.status === 'Completed'
              ? 'Completed'
              : raw?.status === 'EXPIRED' || raw?.status === 'Expired'
                ? 'Expired'
                : raw?.status === 'RESCHEDULE_REQUIRED' || raw?.status === 'RescheduleRequired'
                  ? 'RescheduleRequired'
                  : raw?.status ?? 'Pending'),
    appointmentDate: raw?.appointmentDate ?? raw?.bookingDate ?? raw?.date ?? null,
    zegoRoomId: raw?.zegoRoomId ?? null,
    assignedExpertId: raw?.assignedExpertId ?? null,
    assignedExpertName: raw?.assignedExpertName ?? null,
    meetingStatus: raw?.meetingStatus ?? 'SCHEDULED',
  }
}

export const sportsScientistBookingService = {
  getAll: async (status?: string): Promise<SportsScientistBookingsResponse> => {
    const params = status ? { status } : undefined
    const { data } = await apiClient.get('/sports-scientist/bookings', { params })
    const bookings = Array.isArray(data?.bookings) ? data.bookings : []
    return { bookings: bookings.map(normalizeBooking) }
  },
  accept: async (
    id: string,
    payload?: AcceptSportsScientistBookingPayload,
  ): Promise<SportsScientistBookingActionResponse> => {
    const { data } = await apiClient.patch(
      `/sports-scientist/bookings/${id}/accept`,
      payload ?? {},
    )
    return {
      message: data?.message ?? 'Booking accepted',
      booking: normalizeBooking(data?.booking),
    }
  },
  reject: async (
    id: string,
    payload?: RejectSportsScientistBookingPayload,
  ): Promise<SportsScientistBookingActionResponse> => {
    const { data } = await apiClient.patch(
      `/sports-scientist/bookings/${id}/reject`,
      payload ?? {},
    )
    return {
      message: data?.message ?? 'Booking rejected',
      booking: normalizeBooking(data?.booking),
    }
  },
  complete: async (id: string): Promise<SportsScientistBookingActionResponse> => {
    const { data } = await apiClient.patch(`/sports-scientist/bookings/${id}/complete`)
    return {
      message: data?.message ?? 'Consultation completed',
      booking: normalizeBooking(data?.booking),
    }
  },
}
