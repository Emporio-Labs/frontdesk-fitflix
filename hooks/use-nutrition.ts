import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { nutritionService } from '@/lib/services/nutrition.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'
import type {
  AssignPlanPayload,
  CreateFoodPayload,
  CreateTemplatePayload,
  LogHydrationPayload,
  LogMealPayload,
  LogProgressPayload,
  MealLog,
  SaveAssessmentPayload,
  UpdateFoodPayload,
  UpdateTemplatePayload,
} from '@/lib/types/nutrition'

// ── Dashboard members ────────────────────────────────────────────────────────
export function useNutritionMembers() {
  return useQuery({
    queryKey: queryKeys.nutrition.members(),
    queryFn: nutritionService.getNutritionMembers,
    select: (data) => data.members,
  })
}

function invalidateNutrition(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.nutrition.all() })
}

// ── Food catalog ──────────────────────────────────────────────────────────────
export function useFoods(search?: string) {
  return useQuery({
    queryKey: queryKeys.nutrition.foods(search),
    queryFn: () => nutritionService.getFoods(search),
    select: (data) => data.items,
  })
}

export function useRecipes(search?: string) {
  return useQuery({
    queryKey: queryKeys.nutrition.recipes(search),
    queryFn: () => nutritionService.getRecipes(search),
    select: (data) => data.recipes,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['nutrition', 'categories'],
    queryFn: nutritionService.getCategories,
    select: (data) => data.categories,
  })
}

export function useRecipe(id: string, enabled = false) {
  return useQuery({
    queryKey: ['nutrition', 'recipe', id],
    queryFn: () => nutritionService.getRecipeWithIngredients(id),
    enabled: enabled && !!id,
  })
}

export function useCreateFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFoodPayload) => nutritionService.createFood(payload),
    onSuccess: (data) => {
      invalidateNutrition(qc)
      toast.success(data.message || 'Food added')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to add food'),
  })
}

export function useUpdateFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFoodPayload }) =>
      nutritionService.updateFood(id, payload),
    onSuccess: (data) => {
      invalidateNutrition(qc)
      toast.success(data.message || 'Food updated')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to update food'),
  })
}

export function useDeleteFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => nutritionService.deleteFood(id),
    onSuccess: (data) => {
      invalidateNutrition(qc)
      toast.success(data.message || 'Food deleted')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to delete food'),
  })
}

// ── Diet plans (templates backing the Diet Plans tab) ────────────────────────
export function useNutritionTemplates() {
  return useQuery({
    queryKey: queryKeys.nutrition.templates.all(),
    queryFn: nutritionService.getTemplates,
    select: (data) => data.templates,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) =>
      nutritionService.createTemplate(payload),
    onSuccess: (data) => {
      invalidateNutrition(qc)
      toast.success(data.message || 'Diet plan created')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to create diet plan'),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTemplatePayload }) =>
      nutritionService.updateTemplate(id, payload),
    onSuccess: (data) => {
      invalidateNutrition(qc)
      toast.success(data.message || 'Diet plan updated')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to update diet plan'),
  })
}

// ── Assigned plans ────────────────────────────────────────────────────────────
export function useNutritionPlans(userId?: string) {
  return useQuery({
    queryKey: queryKeys.nutrition.plans.all(userId),
    queryFn: () => nutritionService.getPlans(userId),
    select: (data) => data.plans,
  })
}

export function useNutritionPlan(id: string) {
  return useQuery({
    queryKey: queryKeys.nutrition.plans.detail(id),
    queryFn: () => nutritionService.getPlan(id),
    select: (data) => data.plan,
    enabled: !!id,
  })
}

export function useMyNutritionPlans() {
  return useQuery({
    queryKey: queryKeys.nutrition.plans.mine(),
    queryFn: nutritionService.getMyPlan,
    select: (data) => data.plans,
  })
}

export function useAssignPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AssignPlanPayload) => nutritionService.assignPlan(payload),
    onSuccess: (data) => {
      invalidateNutrition(qc)
      toast.success(data.message || 'Plan assigned')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to assign plan'),
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTemplatePayload }) =>
      nutritionService.updatePlan(id, payload),
    onSuccess: (data, variables) => {
      invalidateNutrition(qc)
      toast.success(data.message || 'Plan updated')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to update plan'),
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => nutritionService.deletePlan(id),
    onSuccess: (data) => {
      invalidateNutrition(qc)
      toast.success(data.message || 'Plan removed')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to remove plan'),
  })
}

// ── Meal logs (optimistic completion toggle) ──────────────────────────────────
export function useMealLogs(planId: string, date?: string, userId?: string) {
  return useQuery({
    queryKey: queryKeys.nutrition.mealLogs(planId, date, userId),
    queryFn: () => nutritionService.getMealLogs(planId, date, userId),
    select: (data) => data.items,
    enabled: !!planId,
  })
}

export function useLogMeal(planId: string, date?: string) {
  const qc = useQueryClient()
  const key = queryKeys.nutrition.mealLogs(planId, date)
  return useMutation({
    mutationFn: (payload: LogMealPayload) => nutritionService.logMeal(payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<{ items: MealLog[] }>(key)
      if (prev?.items) {
        const next = prev.items.map((m) =>
          m.slot === payload.slot && m.date === payload.date
            ? { ...m, consumed: payload.consumed }
            : m
        )
        qc.setQueryData(key, { items: next })
      }
      return { prev }
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
      toast.error(err?.response?.data?.message || 'Failed to log meal')
    },
    onSuccess: () => {
      invalidateNutrition(qc)
    },
  })
}

// ── Hydration ─────────────────────────────────────────────────────────────────
export function useHydration(userId: string, date?: string) {
  return useQuery({
    queryKey: queryKeys.nutrition.hydration(userId, date),
    queryFn: () => nutritionService.getHydration(userId, date),
    select: (data) => data.items,
    enabled: !!userId,
  })
}

export function useLogHydration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: LogHydrationPayload) =>
      nutritionService.logHydration(payload),
    onSuccess: (data) => {
      invalidateNutrition(qc)
      toast.success(data.message || 'Hydration logged')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to log hydration'),
  })
}

// ── Adherence (read-only) ─────────────────────────────────────────────────────
export function useAdherence(userId: string, from?: string, to?: string) {
  return useQuery({
    queryKey: queryKeys.nutrition.adherence(userId, from, to),
    queryFn: () => nutritionService.getAdherence(userId, from, to),
    select: (data) => data.items,
    enabled: !!userId,
  })
}

// ── Progress ──────────────────────────────────────────────────────────────────
export function useNutritionProgress(userId: string) {
  return useQuery({
    queryKey: queryKeys.nutrition.progress(userId),
    queryFn: () => nutritionService.getProgress(userId),
    select: (data) => data.items,
    enabled: !!userId,
  })
}

export function useLogProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: LogProgressPayload) =>
      nutritionService.logProgress(payload),
    onSuccess: (data) => {
      invalidateNutrition(qc)
      toast.success(data.message || 'Progress logged')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to log progress'),
  })
}

// ── Assessment (advisory; enriches onboarding, never gates plans) ────────────
export function useNutritionAssessment(userId: string) {
  return useQuery({
    queryKey: queryKeys.nutrition.assessment(userId),
    queryFn: () => nutritionService.getAssessment(userId),
    select: (data) => data.assessment,
    enabled: !!userId,
  })
}

export function useSaveAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveAssessmentPayload) =>
      nutritionService.saveAssessment(payload),
    onSuccess: (data) => {
      invalidateNutrition(qc)
      toast.success(data.message || 'Assessment saved')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to save assessment'),
  })
}
