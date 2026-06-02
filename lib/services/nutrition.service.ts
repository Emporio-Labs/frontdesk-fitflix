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
  NutritionDashboardMember,
  NutritionAssessment,
  NutritionProgress,
  NutritionTemplate,
  SaveAssessmentPayload,
  UpdateFoodPayload,
  UpdateTemplatePayload,
  UserNutritionPlan,
  Recipe,
  RecipeIngredient,
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
  // ── Dashboard members (nutritionist booking pipeline) ─────────────────────
  // GET /nutrition/dashboard/members returns members in the nutritionist
  // booking / plan pipeline with populated member details, nutrition status,
  // onboarding step (flat camelCase `onboardingStep`), and booking status.
  getNutritionMembers: async () => {
    const { data } = await apiClient.get('/nutrition/dashboard/members')
    return data as { members: NutritionDashboardMember[] }
  },

  // ── Food catalog / Recipes ──────────────────────────────────────────────────
  getFoods: async (search?: string) => {
    const { data } = await apiClient.get('/nutrition/foods', {
      params: {
        limit: 1000,
        ...(search ? { query: search } : {}),
      },
    })
    return data as { items: FoodItem[]; total: number; page: number; limit: number }
  },
  getRecipes: async (search?: string) => {
    const { data } = await apiClient.get('/nutrition/recipes', {
      params: search ? { categoryId: search } : undefined,
    })
    return data as { recipes: Recipe[]; total: number }
  },
  getCategories: async () => {
    const { data } = await apiClient.get('/nutrition/categories')
    return data as { categories: { _id: string; name: string }[] }
  },
  getRecipeWithIngredients: async (id: string) => {
    const { data } = await apiClient.get(`/nutrition/recipes/${id}`)
    return data as { recipe: Recipe; ingredients: RecipeIngredient[] }
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

  // ── Diet plans (reusable templates backing the Diet Plans tab) ──────────────
  getTemplates: async () => {
    const { data } = await apiClient.get('/nutrition/templates')
    return data as { templates: NutritionTemplate[] }
  },
  createTemplate: async (payload: CreateTemplatePayload) => {
    const { data } = await apiClient.post('/nutrition/templates', payload)
    return data as { message: string; template: NutritionTemplate }
  },
  updateTemplate: async (id: string, payload: UpdateTemplatePayload) => {
    const { data } = await apiClient.patch(`/nutrition/templates/${id}`, payload)
    return data as { message: string; template: NutritionTemplate }
  },

  // ── Assigned user plans (deep snapshot of a template) ───────────────────────
  getPlans: async (userId?: string) => {
    const { data } = await apiClient.get('/nutrition/plans', {
      params: userId ? { userId } : undefined,
    })
    return data as { plans: UserNutritionPlan[] }
  },
  getPlan: async (id: string) => {
    const { data } = await apiClient.get(`/nutrition/plans/${id}`)
    return data as { plan: UserNutritionPlan }
  },
  getMyPlan: async () => {
    const { data } = await apiClient.get('/nutrition/my/plans')
    return data as { plans: UserNutritionPlan[] }
  },
  assignPlan: async (payload: AssignPlanPayload) => {
    const { planId, ...body } = payload
    const { data } = await apiClient.post(`/nutrition/templates/${planId}/assign`, body)
    return data as { message: string; plan: UserNutritionPlan }
  },
  updatePlan: async (id: string, payload: UpdateTemplatePayload) => {
    const { data } = await apiClient.patch(`/nutrition/plans/${id}`, payload)
    return data as { message: string; plan: UserNutritionPlan }
  },
  deletePlan: async (id: string) => {
    const { data } = await apiClient.delete(`/nutrition/plans/${id}`)
    return data as { message: string }
  },

  // ── Meal logs ───────────────────────────────────────────────────────────────
  getMealLogs: async (planId: string, date?: string) => {
    const { data } = await apiClient.get(`/nutrition/my/meal-logs`, {
      params: { planId, ...(date ? { date } : {}) },
    })
    return data as { items: MealLog[] }
  },
  logMeal: async (payload: LogMealPayload) => {
    const { data } = await apiClient.post('/nutrition/my/meal-logs', payload)
    return data as { message: string; mealLog: MealLog }
  },

  // ── Hydration ───────────────────────────────────────────────────────────────
  getHydration: async (userId: string, date?: string) => {
    const { data } = await apiClient.get('/nutrition/my/hydration', {
      params: { userId, ...(date ? { date } : {}) },
    })
    return data as { items: HydrationLog[] }
  },
  logHydration: async (payload: LogHydrationPayload) => {
    const { data } = await apiClient.post('/nutrition/my/hydration', payload)
    return data as { message: string; hydration: HydrationLog }
  },

  // ── Adherence (read-only materialized daily rollup) ─────────────────────────
  getAdherence: async (userId: string, from?: string, to?: string) => {
    const { data } = await apiClient.get('/nutrition/my/adherence', {
      params: { userId, ...(from ? { from } : {}), ...(to ? { to } : {}) },
    })
    return data as { items: AdherenceDaily[] }
  },

  // ── Progress tracking ───────────────────────────────────────────────────────
  getProgress: async (userId: string) => {
    const { data } = await apiClient.get('/nutrition/my/progress', { params: { userId } })
    return data as { items: NutritionProgress[] }
  },
  logProgress: async (payload: LogProgressPayload) => {
    const { data } = await apiClient.post('/nutrition/my/progress', payload)
    return data as { message: string; progress: NutritionProgress }
  },

  // ── Nutrition assessment (enriches onboarding — never duplicates it) ────────
  // ASSUMPTION: GET/PUT /nutrition/assessment?userId= is UNVERIFIED. The
  // assessment is advisory and never gates plan creation. A 404 (endpoint not
  // implemented yet) resolves to { assessment: null } so the UI shows an empty
  // state instead of erroring.
  getAssessment: async (userId: string) => {
    try {
      const { data } = await apiClient.get('/nutrition/assessment', {
        params: { userId },
      })
      return data as { assessment: NutritionAssessment | null }
    } catch (e: any) {
      if (e?.response?.status === 404) return { assessment: null }
      throw e
    }
  },
  saveAssessment: async (payload: SaveAssessmentPayload) => {
    const { data } = await apiClient.put('/nutrition/assessment', payload)
    return data as { message: string; assessment: NutritionAssessment }
  },

  // ── PDF (deferred backend seam — UI renders a disabled button) ──────────────
  getPlanPdfUrl: (id: string) => `/nutrition/plans/${id}/pdf`,
}
