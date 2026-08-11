import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nutritionistService, CreateNutritionistPayload, UpdateNutritionistPayload } from '@/lib/services/nutritionist.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useNutritionists() {
  return useQuery({
    queryKey: queryKeys.nutritionists.all(),
    queryFn: nutritionistService.getAll,
    select: (data) => data.nutritionists,
  })
}

export function useCreateNutritionist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateNutritionistPayload) => nutritionistService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.nutritionists.all() })
      toast.success(data.message || 'Nutritionist added successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to add nutritionist')
    },
  })
}

export function useUpdateNutritionist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateNutritionistPayload }) =>
      nutritionistService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.nutritionists.all() })
      qc.invalidateQueries({ queryKey: queryKeys.nutritionists.detail(data.nutritionist._id) })
      toast.success(data.message || 'Nutritionist updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update nutritionist')
    },
  })
}
