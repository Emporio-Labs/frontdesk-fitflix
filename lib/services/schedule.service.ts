import { apiClient } from '@/lib/api-client'

export const SCHEDULE_STATUS = {
  0: 'Todo',
  1: 'Doing',
  2: 'Done',
} as const

export type ScheduleStatusValue = keyof typeof SCHEDULE_STATUS

export interface Schedule {
  _id: string
  user: {
    _id: string
    username: string
    email: string
  }
  scheduledDate: string
  status: ScheduleStatusValue
  todos: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateSchedulePayload {
  userId?: string
  scheduledDate: string
  status?: ScheduleStatusValue
  todoIds?: string[]
}

export interface UpdateSchedulePayload {
  scheduledDate?: string
  status?: ScheduleStatusValue
  todoIds?: string[]
}

export const scheduleService = {
  getMine: async (): Promise<{ schedule: Schedule }> => {
    const { data } = await apiClient.get('/schedules/my-schedule')
    return data
  },
  getByUserId: async (userId: string): Promise<{ schedule: Schedule }> => {
    const { data } = await apiClient.get(`/schedules/${userId}`)
    return data
  },
  create: async (payload: CreateSchedulePayload): Promise<{ message: string; schedule: Schedule }> => {
    const { data } = await apiClient.post('/schedules', payload)
    return data
  },
  update: async (userId: string, payload: UpdateSchedulePayload): Promise<{ message: string; schedule: Schedule }> => {
    const { data } = await apiClient.patch(`/schedules/${userId}`, payload)
    return data
  },
  reschedule: async (userId: string, newScheduledDate: string): Promise<{ message: string; schedule: Schedule }> => {
    const { data } = await apiClient.patch(`/schedules/${userId}/reschedule`, { newScheduledDate })
    return data
  },
  delete: async (userId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/schedules/${userId}`)
    return data
  },
}
