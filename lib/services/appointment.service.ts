import { apiClient } from '@/lib/api-client'

export const APPOINTMENT_STATUS = {
  0: 'Booked',
  1: 'Confirmed',
  2: 'Cancelled',
  3: 'Attended',
  4: 'Unattended',
} as const

export type AppointmentStatusValue = keyof typeof APPOINTMENT_STATUS

export interface Appointment {
  _id: string
  appointmentDate: string
  status: AppointmentStatusValue
  user: string
  slot: string
  doctor: string
  service?: string
  report?: string
  createdAt: string
  updatedAt: string
}

export interface AppointmentCreditsMeta {
  consumed?: number
  refunded?: number
  bypassed?: boolean
}

export interface CreateAppointmentPayload {
  appointmentDate: string
  userId: string
  slotId: string
  doctorId: string
  serviceId?: string
  reportId?: string
  bypassCredits?: boolean
}

export interface UpdateAppointmentPayload {
  appointmentDate?: string
  slotId?: string
  doctorId?: string
  serviceId?: string
  reportId?: string
}

export const appointmentService = {
  getAll: async (): Promise<{ appointments: Appointment[] }> => {
    const { data } = await apiClient.get('/appointments')
    return data
  },
  getMine: async (): Promise<{ appointments: Appointment[] }> => {
    const { data } = await apiClient.get('/appointments/me')
    return data
  },
  getById: async (id: string): Promise<{ appointment: Appointment }> => {
    const { data } = await apiClient.get(`/appointments/${id}`)
    return data
  },
  create: async (payload: CreateAppointmentPayload): Promise<{ message: string; appointment: Appointment; credits?: AppointmentCreditsMeta }> => {
    const { data } = await apiClient.post('/appointments', payload)
    return data
  },
  update: async (id: string, payload: UpdateAppointmentPayload): Promise<{ message: string; appointment: Appointment }> => {
    const { data } = await apiClient.patch(`/appointments/${id}`, payload)
    return data
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/appointments/${id}`)
    return data
  },
  changeStatus: async (id: string, status: AppointmentStatusValue): Promise<{ message: string; appointment: Appointment; credits?: AppointmentCreditsMeta }> => {
    const { data } = await apiClient.patch(`/appointments/${id}/status`, { status })
    return data
  },
}
