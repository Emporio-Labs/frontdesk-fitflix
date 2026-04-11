import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  appointmentService,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  AppointmentStatusValue,
} from '@/lib/services/appointment.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments.all(),
    queryFn: appointmentService.getAll,
    select: (data) => data.appointments,
  })
}

export function useMyAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments.mine(),
    queryFn: appointmentService.getMine,
    select: (data) => data.appointments,
  })
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id),
    queryFn: () => appointmentService.getById(id),
    select: (data) => data.appointment,
    enabled: !!id,
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) => appointmentService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all() })
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      qc.invalidateQueries({ queryKey: ['credits'] })

      const consumed = data?.credits?.consumed
      const bypassed = data?.appointment?.creditsBypassed ?? data?.credits?.bypassed

      if (bypassed) {
        toast.success('Appointment created. Credits were bypassed for this appointment.')
        return
      }

      if (typeof consumed === 'number') {
        toast.success(
          `Appointment created. ${consumed} credit${consumed === 1 ? '' : 's'} consumed.`
        )
        return
      }

      toast.success(data.message || 'Appointment created successfully')
    },
    onError: (err: any) => {
      const status = err?.response?.status

      if (status === 409) {
        qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
        toast.error('That slot just got filled. Availability has been refreshed.')
        return
      }

      if (status === 402) {
        toast.error('Insufficient credits for this appointment.')
        return
      }

      toast.error(err?.response?.data?.message || 'Failed to create appointment')
    },
  })
}

export function useUpdateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAppointmentPayload }) =>
      appointmentService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all() })
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      toast.success(data.message || 'Appointment updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update appointment')
    },
  })
}

export function useDeleteAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => appointmentService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all() })
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      qc.invalidateQueries({ queryKey: ['credits'] })
      toast.success(data.message || 'Appointment deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete appointment')
    },
  })
}

export function useChangeAppointmentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatusValue }) =>
      appointmentService.changeStatus(id, status),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all() })
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      qc.invalidateQueries({ queryKey: ['credits'] })

      if (variables.status === 2) {
        const refunded = data?.credits?.refunded ?? 0

        if (refunded > 0) {
          toast.success(
            `Appointment cancelled. ${refunded} credit${refunded === 1 ? '' : 's'} refunded.`
          )
          return
        }

        toast.success('Appointment already cancelled. No additional refund was applied.')
        return
      }

      toast.success(data.message || 'Appointment status updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update appointment status')
    },
  })
}
