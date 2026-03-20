import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { slotService, CreateSlotPayload, UpdateSlotPayload } from '@/lib/services/slot.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useSlots() {
  return useQuery({
    queryKey: queryKeys.slots.all(),
    queryFn: slotService.getAll,
    select: (data) => data.slots,
  })
}

export function useSlot(id: string) {
  return useQuery({
    queryKey: queryKeys.slots.detail(id),
    queryFn: () => slotService.getById(id),
    select: (data) => data.slot,
    enabled: !!id,
  })
}

export function useCreateSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSlotPayload) => slotService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      toast.success(data.message || 'Slot created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create slot')
    },
  })
}

export function useUpdateSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSlotPayload }) =>
      slotService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      qc.invalidateQueries({ queryKey: queryKeys.slots.detail(data.slot._id) })
      toast.success(data.message || 'Slot updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update slot')
    },
  })
}

export function useDeleteSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => slotService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.slots.all() })
      toast.success(data.message || 'Slot deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete slot')
    },
  })
}
