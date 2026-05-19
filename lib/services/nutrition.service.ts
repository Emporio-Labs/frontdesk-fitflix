import { apiClient } from '@/lib/api-client'
import type {
  AdherenceDaily,
  AssignPlanPayload,
  CreateFoodPayload,
  CreateTemplatePayload,
  FoodItem,
  HydrationLog,
  LogHydrationPayload,
  LogMealPayload,
  LogProgressPayload,
  MealLog,
  NutritionProgress,
  NutritionTemplate,
  UpdateFoodPayload,
  UpdateTemplatePayload,
  UserNutritionPlan,
} from '@/lib/types/nutrition'

// ─────────────────────────────────────────────────────────────────────────────
// ASSUMPTION: The backend Nutrition module was completed but is not yet in
// api_docs.md. All paths and response shapes below are inferred from the backend
// domain models (NutritionTemplate, UserNutritionPlan, MealLog,
// NutritionAdherenceDaily, NutritionProgress, NutritionHydrationLog, food
// catalog). Verify path segments / query params / field names against live API
// responses and correct THIS file + lib/types/nutrition.ts only — hooks and
// pages are designed to stay stable. PDF export is a deferred backend seam.
// ─────────────────────────────────────────────────────────────────────────────

export const nutritionService = {
  // ── Food catalog ────────────────────────────────────────────────────────────
  getFoods: async (search?: string) => {
    const { data } = await apiClient.get('/nutrition/foods', {
      params: search ? { search } : undefined,
    })
    return data as { items: FoodItem[] }
  },
  createFood: async (payload: CreateFoodPayload) => {
    const { data } = await apiClient.post('/nutrition/foods', payload)
    return data as { message: string; food: FoodItem }
  },
  updateFood: async (id: string, payload: UpdateFoodPayload) => {
    const { data } = await apiClient.patch(`/nutrition/foods/${id}`, payload)
    return data as { message: string; food: FoodItem }
  },
  deleteFood: async (id: string) => {
    const { data } = await apiClient.delete(`/nutrition/foods/${id}`)
    return data as { message: string }
  },

  // ── Templates (nutritionist-owned reusable plans) ───────────────────────────
  getTemplates: async () => {
    const { data } = await apiClient.get('/nutrition/templates')
    return data as { items: NutritionTemplate[] }
  },
  getTemplate: async (id: string) => {
    const { data } = await apiClient.get(`/nutrition/templates/${id}`)
    return data as { template: NutritionTemplate }
  },
  createTemplate: async (payload: CreateTemplatePayload) => {
    const { data } = await apiClient.post('/nutrition/templates', payload)
    return data as { message: string; template: NutritionTemplate }
  },
  updateTemplate: async (id: string, payload: UpdateTemplatePayload) => {
    const { data } = await apiClient.patch(`/nutrition/templates/${id}`, payload)
    return data as { message: string; template: NutritionTemplate }
  },
  deleteTemplate: async (id: string) => {
    const { data } = await apiClient.delete(`/nutrition/templates/${id}`)
    return data as { message: string }
  },

  // ── Assigned user plans (deep snapshot of a template) ───────────────────────
  getPlans: async (userId?: string) => {
    const { data } = await apiClient.get('/nutrition/plans', {
      params: userId ? { userId } : undefined,
    })
    return data as { items: UserNutritionPlan[] }
  },
  getPlan: async (id: string) => {
    const { data } = await apiClient.get(`/nutrition/plans/${id}`)
    return data as { plan: UserNutritionPlan }
  },
  // Active plan for the authenticated member (user dashboard).
  getMyPlan: async () => {
    const { data } = await apiClient.get('/nutrition/me/plan')
    return data as { plan: UserNutritionPlan | null }
  },
  assignPlan: async (payload: AssignPlanPayload) => {
    const { data } = await apiClient.post('/nutrition/plans', payload)
    return data as { message: string; plan: UserNutritionPlan }
  },
  deletePlan: async (id: string) => {
    const { data } = await apiClient.delete(`/nutrition/plans/${id}`)
    return data as { message: string }
  },

  // ── Meal logs ───────────────────────────────────────────────────────────────
  getMealLogs: async (planId: string, date?: string) => {
    const { data } = await apiClient.get(`/nutrition/plans/${planId}/meal-logs`, {
      params: date ? { date } : undefined,
    })
    return data as { items: MealLog[] }
  },
  logMeal: async (payload: LogMealPayload) => {
    const { data } = await apiClient.post('/nutrition/meal-logs', payload)
    return data as { message: string; mealLog: MealLog }
  },

  // ── Hydration ───────────────────────────────────────────────────────────────
  getHydration: async (userId: string, date?: string) => {
    const { data } = await apiClient.get('/nutrition/hydration', {
      params: { userId, ...(date ? { date } : {}) },
    })
    return data as { items: HydrationLog[] }
  },
  logHydration: async (payload: LogHydrationPayload) => {
    const { data } = await apiClient.post('/nutrition/hydration', payload)
    return data as { message: string; hydration: HydrationLog }
  },

  // ── Adherence (read-only materialized daily rollup) ─────────────────────────
  getAdherence: async (userId: string, from?: string, to?: string) => {
    const { data } = await apiClient.get('/nutrition/adherence', {
      params: { userId, ...(from ? { from } : {}), ...(to ? { to } : {}) },
    })
    return data as { items: AdherenceDaily[] }
  },

  // ── Progress tracking ───────────────────────────────────────────────────────
  getProgress: async (userId: string) => {
    const { data } = await apiClient.get('/nutrition/progress', {
      params: { userId },
    })
    return data as { items: NutritionProgress[] }
  },
  logProgress: async (payload: LogProgressPayload) => {
    const { data } = await apiClient.post('/nutrition/progress', payload)
    return data as { message: string; progress: NutritionProgress }
  },

  // ── PDF (deferred backend seam — UI renders a disabled button) ──────────────
  getPlanPdfUrl: (id: string) => `/nutrition/plans/${id}/pdf`,
}
