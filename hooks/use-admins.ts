import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService, CreateAdminPayload, UpdateAdminPayload } from '@/lib/services/admin.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useAdmins() {
  return useQuery({
    queryKey: queryKeys.admins.all(),
    queryFn: adminService.getAll,
    select: (data) => data.admins,
  })
}

export function useAdmin(id: string) {
  return useQuery({
    queryKey: queryKeys.admins.detail(id),
    queryFn: () => adminService.getById(id),
    select: (data) => data.admin,
    enabled: !!id,
  })
}

export function useCreateAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAdminPayload) => adminService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.admins.all() })
      toast.success(data.message || 'Admin created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create admin')
    },
  })
}

export function useUpdateAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAdminPayload }) =>
      adminService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.admins.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admins.detail(data.admin._id) })
      toast.success(data.message || 'Admin updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update admin')
    },
  })
}

export function useDeleteAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.admins.all() })
      toast.success(data.message || 'Admin deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete admin')
    },
  })
}
