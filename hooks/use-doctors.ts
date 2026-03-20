import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doctorService, CreateDoctorPayload, UpdateDoctorPayload } from '@/lib/services/doctor.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useDoctors() {
  return useQuery({
    queryKey: queryKeys.doctors.all(),
    queryFn: doctorService.getAll,
    select: (data) => data.doctors,
  })
}

export function useDoctor(id: string) {
  return useQuery({
    queryKey: queryKeys.doctors.detail(id),
    queryFn: () => doctorService.getById(id),
    select: (data) => data.doctor,
    enabled: !!id,
  })
}

export function useCreateDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDoctorPayload) => doctorService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.doctors.all() })
      toast.success(data.message || 'Doctor created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create doctor')
    },
  })
}

export function useUpdateDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDoctorPayload }) =>
      doctorService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.doctors.all() })
      qc.invalidateQueries({ queryKey: queryKeys.doctors.detail(data.doctor._id) })
      toast.success(data.message || 'Doctor updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update doctor')
    },
  })
}

export function useDeleteDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => doctorService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.doctors.all() })
      toast.success(data.message || 'Doctor deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete doctor')
    },
  })
}
