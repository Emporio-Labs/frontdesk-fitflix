import { apiClient } from '@/lib/api-client'

export interface TrainerDto {
  _id: string
  name: string
  description?: string
  specialities?: string[]
  imageUrl?: string
  keySentence?: string
  isActive?: boolean
  email?: string
  phone?: string
}

export interface SlotDto {
  startTime: string
  endTime: string
  durationMinutes: number
  isAvailable: boolean
}

export interface ShiftWindowDto {
  startTime: string
  endTime: string
}

export interface WeeklySlotConfig {
  dayOfWeek: number // 0 = Sun, 1 = Mon, ..., 6 = Sat
  startTime?: string
  endTime?: string
  shifts?: ShiftWindowDto[]
  isAvailable: boolean
}

export interface ExpertScheduleDto {
  _id?: string
  expertId: string
  expertType: string
  slotDurationMinutes: number
  bufferMinutes: number
  weeklySlots: WeeklySlotConfig[]
  blackoutDates: string[]
  isActive: boolean
}

export interface UnifiedBookingDto {
  _id: string
  userId: {
    _id: string
    username?: string
    email?: string
    phone?: string
  } | string
  serviceCategory: string
  serviceSubtype: string
  expertId: {
    _id: string
    trainerName?: string
    imageUrl?: string
    specialities?: string[]
  } | string
  assignedExpertName?: string
  packageId?: string
  bookingDate: string
  startTime: string
  endTime: string
  appointmentMode: 'ONLINE' | 'OFFLINE'
  location: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'HOST_NO_SHOW' | 'EXPIRED'
  meetingStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'
  zegoRoomId?: string
  hostLiveAt?: string | null
  userJoinedAt?: string | null
  completedAt?: string | null
  consumptionModel: 'CREDIT_POOL' | 'DIRECT_PURCHASE'
  sessionNotes?: {
    workoutNotes?: string
    exercisesCompleted?: Array<{
      exerciseId?: string
      name: string
      sets: number
      reps: number
      weight: number
      notes?: string
    }>
    clinicalNotes?: string
  }
}

export interface TrainerChangeRequestDto {
  _id?: string
  id?: string
  userId: {
    _id?: string
    id?: string
    username?: string
    email?: string
    phone?: string
  }
  currentTrainerId?: {
    _id?: string
    id?: string
    trainerName: string
    imageUrl?: string
  } | null
  requestedTrainerId: {
    _id?: string
    id?: string
    trainerName: string
    imageUrl?: string
  }
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  adminNotes?: string
  createdAt: string
  resolvedAt?: string
}

export const personalTrainingService = {
  // Trainers
  getTrainers: async (): Promise<TrainerDto[]> => {
    const res = await apiClient.get('/api/v1/pt/trainers')
    return res.data.trainers || []
  },

  getTrainerAvailability: async (trainerId: string, date: string): Promise<SlotDto[]> => {
    const res = await apiClient.get(`/api/v1/pt/trainers/${trainerId}/availability`, {
      params: { date },
    })
    return res.data.slots || []
  },

  getTrainerSchedule: async (trainerId: string): Promise<ExpertScheduleDto> => {
    const res = await apiClient.get(`/api/v1/pt/trainers/${trainerId}/schedule`)
    return res.data.schedule
  },

  updateTrainerSchedule: async (
    trainerId: string,
    data: Partial<ExpertScheduleDto>
  ): Promise<ExpertScheduleDto> => {
    const res = await apiClient.put(`/api/v1/pt/trainers/${trainerId}/schedule`, data)
    return res.data.schedule
  },

  // Admin Bookings
  getAllBookings: async (filters?: {
    expertId?: string
    date?: string
    status?: string
    serviceCategory?: string
  }): Promise<UnifiedBookingDto[]> => {
    const res = await apiClient.get('/api/v1/pt/admin/bookings', { params: filters })
    return res.data.bookings || []
  },

  completeBooking: async (
    bookingId: string,
    data: {
      workoutNotes?: string
      exercisesCompleted?: Array<{
        name: string
        sets: number
        reps: number
        weight: number
        notes?: string
      }>
      clinicalNotes?: string
    }
  ): Promise<UnifiedBookingDto> => {
    const res = await apiClient.post(`/api/v1/pt/admin/bookings/${bookingId}/complete`, data)
    return res.data.booking
  },

  // Trainer Change Requests
  getTrainerChangeRequests: async (): Promise<TrainerChangeRequestDto[]> => {
    const res = await apiClient.get('/api/v1/pt/admin/trainer-change-requests')
    return res.data.requests || []
  },

  resolveTrainerChangeRequest: async (
    requestId: string,
    action: 'APPROVE' | 'REJECT',
    adminNotes?: string
  ): Promise<TrainerChangeRequestDto> => {
    const res = await apiClient.post(
      `/api/v1/pt/admin/trainer-change-requests/${requestId}/resolve`,
      {
        action,
        adminNotes: adminNotes || '',
      }
    )
    return res.data.request
  },
}
