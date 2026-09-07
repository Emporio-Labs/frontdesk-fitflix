import { apiClient } from '@/lib/api-client'
import type { WeeklySlotConfig } from '@/lib/services/personal-training.service'

/**
 * The expert-type-agnostic schedule + availability API.
 *
 * Availability for 1:1 experts (nutritionist, sports scientist, doctor) is
 * driven by ExpertSchedule now rather than Slot inventory: a slot models N
 * fungible seats and cannot say *who* is free, take leave, or refuse to be in
 * two places at once. Trainers already worked this way; these endpoints are the
 * same machinery pointed at every expert type.
 */

/**
 * Only two modes are stored. The backend folds the legacy `OFFLINE` spelling
 * into `IN_PERSON` on write, so the UI never has to show three.
 */
export type AppointmentModeValue = 'IN_PERSON' | 'ONLINE'

export const APPOINTMENT_MODES: Array<{
  value: AppointmentModeValue
  label: string
  hint: string
}> = [
  { value: 'ONLINE', label: 'Online', hint: 'Video consultation' },
  { value: 'IN_PERSON', label: 'In person', hint: 'At the club' },
]

export type ExpertTypeValue =
  | 'nutritionist'
  | 'trainer'
  | 'doctor'
  | 'sports_scientist'

export interface ExpertScheduleDto {
  _id?: string
  expertId: string
  expertType: ExpertTypeValue
  expertModel?: 'Trainer' | 'User'
  slotDurationMinutes: number
  bufferMinutes: number
  weeklySlots: WeeklySlotConfig[]
  blackoutDates: string[]
  supportedModes: AppointmentModeValue[]
  maxAdvanceBookingDays: number
  isActive: boolean
}

export interface ExpertDirectoryEntry {
  id: string
  name: string
  expertType: ExpertTypeValue
  expertModel: 'Trainer' | 'User'
}

export interface PooledSlotDto {
  startTime: string
  endTime: string
  durationMinutes: number
  isAvailable: boolean
  /** Every expert of this type free at that time. */
  expertIds: string[]
}

export interface PooledAvailabilityResponse {
  expertType: ExpertTypeValue
  date: string
  mode: AppointmentModeValue | null
  timeZone: string
  maxAdvanceBookingDays: number
  experts: ExpertDirectoryEntry[]
  slots: PooledSlotDto[]
}

export const expertScheduleService = {
  getDirectory: async (
    expertType: ExpertTypeValue
  ): Promise<ExpertDirectoryEntry[]> => {
    const res = await apiClient.get(`/api/v1/experts/${expertType}`)
    return res.data.experts ?? []
  },

  getPooledAvailability: async (
    expertType: ExpertTypeValue,
    params: { date: string; mode?: AppointmentModeValue }
  ): Promise<PooledAvailabilityResponse> => {
    const res = await apiClient.get(
      `/api/v1/experts/${expertType}/availability`,
      { params }
    )
    return res.data
  },

  /** `expertId` accepts the literal "me", so an expert never needs their own id. */
  getSchedule: async (
    expertType: ExpertTypeValue,
    expertId: string
  ): Promise<ExpertScheduleDto> => {
    const res = await apiClient.get(
      `/api/v1/experts/${expertType}/${expertId}/schedule`
    )
    return res.data.schedule
  },

  updateSchedule: async (
    expertType: ExpertTypeValue,
    expertId: string,
    data: Partial<ExpertScheduleDto>
  ): Promise<ExpertScheduleDto> => {
    const res = await apiClient.put(
      `/api/v1/experts/${expertType}/${expertId}/schedule`,
      data
    )
    return res.data.schedule
  },
}
