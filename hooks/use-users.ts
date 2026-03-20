import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService, CreateUserPayload, UpdateUserPayload } from '@/lib/services/user.service'
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
    select: (data) => data.user,
    enabled: !!id,
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
      toast.error(err?.response?.data?.message || 'Failed to create user')
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
