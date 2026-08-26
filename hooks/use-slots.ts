import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  slotService,
  CreateSlotPayload,
  UpdateSlotPayload,
  GenerateSlotsPayload,
  SlotFilterParams,
  SlotResourceType,
  SlotExpertType,
} from '@/lib/services/slot.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useSlots(filters?: SlotFilterParams) {
  return useQuery({
    queryKey: filters ? queryKeys.slots.list(filters) : queryKeys.slots.all(),
    queryFn: () => slotService.getAll(filters),
    select: (data) => data.slots,
  })
}

export function useAvailableSlots(
  params: {
    date: string
    resourceType?: SlotResourceType
    expertType?: SlotExpertType
    locationId?: string
    resourceId?: string
  },
  enabled = true
) {
  return useQuery({
    queryKey: ['slots', 'available', params],
    queryFn: () => slotService.getAvailable(params),
    select: (data) => data.slots,
    enabled: enabled && !!params.date,
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
      qc.invalidateQueries({ queryKey: ['slots'] })
      toast.success(data.message || 'Slot created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create slot')
    },
  })
}

export function useGenerateSlots() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: GenerateSlotsPayload) => slotService.generate(payload),
    onSuccess: (data) => {
      if (!data.dryRun) {
        qc.invalidateQueries({ queryKey: ['slots'] })
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to generate slots')
    },
  })
}

export function useUpdateSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSlotPayload }) =>
      slotService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['slots'] })
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
      qc.invalidateQueries({ queryKey: ['slots'] })
      toast.success(data.message || 'Slot deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete slot')
    },
  })
}

export function useBulkDeleteSlots() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (slotIds: string[]) => slotService.bulkDelete(slotIds),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['slots'] })
      toast.success(data.message || 'Slots deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete slots')
    },
  })
}

export function useBulkUpdateSlots() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { slotIds: string[]; capacity?: number }) =>
      slotService.bulkUpdate(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['slots'] })
      toast.success(data.message || 'Slots updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update slots')
    },
  })
}
