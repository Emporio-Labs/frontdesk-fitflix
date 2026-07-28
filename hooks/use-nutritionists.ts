import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  nutritionistService,
  type Nutritionist,
  type CreateNutritionistPayload,
  type UpdateNutritionistPayload,
} from '@/lib/services/nutritionist.service'
import { toast } from 'sonner'

export function useNutritionists() {
  return useQuery({
    queryKey: queryKeys.nutritionists.all(),
    queryFn: nutritionistService.getNutritionists,
    select: (data) => data.nutritionists,
  })
}

export function useNutritionistAssignmentLogs() {
  return useQuery({
    queryKey: queryKeys.nutritionists.logs(),
    queryFn: nutritionistService.getAssignmentLogs,
    select: (data) => data.logs,
  })
}

export function useCreateNutritionist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateNutritionistPayload) => nutritionistService.create(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nutritionists.all() })
      toast.success(data.message || 'Nutritionist added successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to add nutritionist')
    },
  })
}

export function useUpdateNutritionist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateNutritionistPayload }) =>
      nutritionistService.update(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nutritionists.all() })
      toast.success(data.message || 'Nutritionist updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update nutritionist')
    },
  })
}

export function useAssignNutritionist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: nutritionistService.assignNutritionist,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nutritionists.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.nutritionists.logs() })
      queryClient.invalidateQueries({ queryKey: queryKeys.nutrition.members() })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
      
      if (data.warning) {
        toast.warning(data.warning)
      } else {
        toast.success(data.message || 'Assignment completed successfully')
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to complete assignment')
    },
  })
}
