import { z } from 'zod'

// ── Enums / unions ────────────────────────────────────────────────────────────
export const MEAL_SLOTS = [
  'Breakfast',
  'Mid-Morning',
  'Lunch',
  'Snack',
  'Dinner',
  'Post-Workout',
] as const
export type MealSlot = (typeof MEAL_SLOTS)[number]

export const NUTRITION_GOALS = [
  'weight_loss',
  'muscle_gain',
  'maintenance',
  'recomposition',
  'medical',
] as const
export type NutritionGoal = (typeof NUTRITION_GOALS)[number]

export type PlanStatus = 'assigned' | 'active' | 'completed' | 'cancelled'
export type AdherenceStatus = 'on_track' | 'behind' | 'off_track'

// ── Domain entities (shapes inferred — see nutrition.service.ts assumptions) ────
export interface Macros {
  protein: number
  carbs: number
  fat: number
}

export interface FoodItem {
  _id: string
  name: string
  category?: string
  servingSize: number
  unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
  createdAt?: string
  updatedAt?: string
}

export interface TemplateMealItem {
  foodId: string
  foodName: string
  quantity: number
  unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface TemplateMeal {
  slot: MealSlot
  items: TemplateMealItem[]
}

export interface NutritionTemplate {
  _id: string
  name: string
  description?: string
  goal: NutritionGoal
  totalCalories: number
  macros: Macros
  meals: TemplateMeal[]
  nutritionistId?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserNutritionPlan {
  _id: string
  userId: string
  userName?: string
  templateId?: string
  name: string
  goal: NutritionGoal
  status: PlanStatus
  startDate: string
  endDate?: string | null
  totalCalories: number
  macros: Macros
  meals: TemplateMeal[]
  createdAt?: string
  updatedAt?: string
}

export interface MealLog {
  _id: string
  planId: string
  userId: string
  date: string
  slot: MealSlot
  consumed: boolean
  calories?: number
  notes?: string
  loggedAt?: string
}

export interface HydrationLog {
  _id: string
  userId: string
  date: string
  glasses: number
  ml: number
  targetMl?: number
  loggedAt?: string
}

export interface AdherenceDaily {
  date: string
  userId: string
  plannedCalories: number
  consumedCalories: number
  adherencePct: number
  mealsPlanned: number
  mealsCompleted: number
  status: AdherenceStatus
}

export interface NutritionProgress {
  _id: string
  userId: string
  date: string
  weight?: number
  bodyFatPct?: number
  notes?: string
  createdAt?: string
}

// ── Form / payload zod schemas (react-hook-form + zodResolver) ─────────────────
export const foodSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional(),
  servingSize: z.coerce.number().positive('Must be > 0'),
  unit: z.string().min(1, 'Unit is required'),
  calories: z.coerce.number().nonnegative(),
  protein: z.coerce.number().nonnegative(),
  carbs: z.coerce.number().nonnegative(),
  fat: z.coerce.number().nonnegative(),
})
export type FoodFormValues = z.infer<typeof foodSchema>

export const templateMealItemSchema = z.object({
  foodId: z.string().min(1, 'Select a food'),
  foodName: z.string(),
  quantity: z.coerce.number().positive('Qty > 0'),
  unit: z.string(),
  calories: z.coerce.number().nonnegative(),
  protein: z.coerce.number().nonnegative(),
  carbs: z.coerce.number().nonnegative(),
  fat: z.coerce.number().nonnegative(),
})

export const templateMealSchema = z.object({
  slot: z.enum(MEAL_SLOTS),
  items: z.array(templateMealItemSchema).min(1, 'Add at least one food'),
})

export const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  goal: z.enum(NUTRITION_GOALS),
  meals: z.array(templateMealSchema).min(1, 'Add at least one meal'),
})
export type TemplateFormValues = z.infer<typeof templateSchema>

export const assignPlanSchema = z.object({
  userId: z.string().min(1, 'Select a member'),
  templateId: z.string().min(1, 'Select a template'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
})
export type AssignPlanFormValues = z.infer<typeof assignPlanSchema>

export const progressSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  weight: z.coerce.number().positive().optional(),
  bodyFatPct: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
})
export type ProgressFormValues = z.infer<typeof progressSchema>

// ── API payload DTOs ──────────────────────────────────────────────────────────
export type CreateFoodPayload = FoodFormValues
export type UpdateFoodPayload = Partial<FoodFormValues>

export interface CreateTemplatePayload {
  name: string
  description?: string
  goal: NutritionGoal
  meals: TemplateMeal[]
}
export type UpdateTemplatePayload = Partial<CreateTemplatePayload>

export interface AssignPlanPayload {
  userId: string
  templateId: string
  startDate: string
  endDate?: string
}

export interface LogMealPayload {
  planId: string
  date: string
  slot: MealSlot
  consumed: boolean
  calories?: number
  notes?: string
}

export interface LogHydrationPayload {
  userId?: string
  date: string
  glasses: number
  ml: number
}

export interface LogProgressPayload {
  userId?: string
  date: string
  weight?: number
  bodyFatPct?: number
  notes?: string
}
