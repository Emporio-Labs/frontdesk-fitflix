import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  adminService,
  InviteAdminPayload,
  UpdateAdminPayload,
  AdminStatus,
} from '@/lib/services/admin.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useAdmins(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.admins.all(),
    queryFn: adminService.getAll,
    select: (data) => data.admins,
    enabled: options?.enabled ?? true,
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

// FX-30.1/30.2 — invite a new staff account. No password is sent; the backend
// emails a first-sign-in link. Replaces the old plaintext-password create path.
export function useInviteAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InviteAdminPayload) => adminService.invite(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.admins.all() })
      toast.success(data.message || 'Invite sent')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to send invite')
    },
  })
}

export function useResendInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.resendInvite(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.admins.all() })
      toast.success(data.message || 'Invite link resent')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to resend invite')
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

// FX-30.3 — enable/disable an account, including disabling the shared login.
export function useSetAdminStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminStatus }) =>
      adminService.setStatus(id, status),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.admins.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admins.detail(data.admin._id) })
      toast.success(data.message || 'Account status updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update account status')
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
