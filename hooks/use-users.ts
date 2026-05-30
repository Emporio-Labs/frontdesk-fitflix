import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  userService,
  User,
  CreateUserPayload,
  UpdateUserPayload,
  OnboardUserPayload,
  ChangePasswordPayload,
} from '@/lib/services/user.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: userService.getAll,
    select: (data) => data.users,
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => userService.getById(id),
    select: (data: any): User | undefined => {
      if (!data) return undefined
      return data.user !== undefined ? data.user : data
    },
    enabled: !!id,
  })
}

export function useMe() {
  return useQuery({
    queryKey: ['users', 'me'] as const,
    queryFn: userService.getMe,
    select: (data) => data.user,
  })
}

export function useMyReports() {
  return useQuery({
    queryKey: ['users', 'me', 'reports'] as const,
    queryFn: userService.getMyReports,
    select: (data) => data.reports,
  })
}

export function useMyHpodMetrics() {
  return useQuery({
    queryKey: ['users', 'me', 'hpod-metrics'] as const,
    queryFn: userService.getMyHpodMetrics,
    select: (data) => data.history,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => userService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      toast.success(data.message || 'User created successfully')
    },
    onError: (err: any) => {
      const data = err?.response?.data
      const details = data?.details
      if (details && typeof details === 'object') {
        const messages = Object.entries(details)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(', ')
        toast.error(messages || data?.error || 'Failed to create user')
      } else {
        toast.error(data?.error || data?.message || 'Failed to create user')
      }
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      userService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      qc.invalidateQueries({ queryKey: queryKeys.users.detail(data.user._id) })
      toast.success(data.message || 'User updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update user')
    },
  })
}

export function useOnboardUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OnboardUserPayload }) =>
      userService.onboard(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      qc.invalidateQueries({ queryKey: queryKeys.users.detail(data.user._id) })
      toast.success(data.message || 'User onboarded successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to onboard user')
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) =>
      userService.changePassword(payload),
    onSuccess: (data) => {
      toast.success(data.message || 'Password updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to change password')
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      toast.success(data.message || 'User deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete user')
    },
  })
}
