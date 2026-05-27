import { z } from 'zod'

// ── Enums / unions ────────────────────────────────────────────────────────────
export const MEAL_TYPES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'PreWorkout',
  'PostWorkout',
] as const
export type MealType = (typeof MEAL_TYPES)[number]

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  Breakfast: 'Breakfast',
  Lunch: 'Lunch',
  Dinner: 'Dinner',
  Snack: 'Snack',
  PreWorkout: 'Pre-Workout',
  PostWorkout: 'Post-Workout',
}

export const NUTRITION_GOALS = [
  'WeightLoss',
  'MuscleGain',
  'Maintenance',
  'Endurance',
  'Medical',
  'Custom',
] as const
export type NutritionGoal = (typeof NUTRITION_GOALS)[number]

export const NUTRITION_GOAL_LABELS: Record<NutritionGoal, string> = {
  WeightLoss: 'Weight Loss',
  MuscleGain: 'Muscle Gain',
  Maintenance: 'Maintenance',
  Endurance: 'Endurance',
  Medical: 'Medical',
  Custom: 'Custom',
}

export const FOOD_PREFERENCES = [
  'Vegetarian',
  'Non-Vegetarian',
  'Vegan',
  'Eggetarian'
] as const
export type FoodPreference = (typeof FOOD_PREFERENCES)[number]

export const ALLERGIES = [
  'Dairy',
  'Nuts',
  'Gluten',
  'Seafood',
  'Soy',
  'Egg',
  'Custom'
] as const

export const MEDICAL_CONDITIONS = [
  'Diabetes',
  'PCOS',
  'Thyroid',
  'Hypertension',
  'Cholesterol',
  'Fatty Liver',
  'Gut Issues',
  'Custom'
] as const

export const MEAL_PATTERNS = [
  '3 Meals',
  '4 Meals',
  '5 Meals',
  'Custom'
] as const
export type MealPattern = (typeof MEAL_PATTERNS)[number]

export type NutritionPlanStatus = 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Archived'
export type AdherenceStatus = 'on_track' | 'behind' | 'off_track'

// ── Clinical extensions (all additive / backward-compatible) ─────────────────

export const DIETARY_PREFERENCES = [
  'Vegetarian',
  'Vegan',
  'Eggetarian',
  'NonVegetarian',
  'Pescatarian',
  'Jain',
  'Keto',
  'Other',
] as const
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number]

export const DIETARY_PREFERENCE_LABELS: Record<DietaryPreference, string> = {
  Vegetarian: 'Vegetarian',
  Vegan: 'Vegan',
  Eggetarian: 'Eggetarian',
  NonVegetarian: 'Non-Vegetarian',
  Pescatarian: 'Pescatarian',
  Jain: 'Jain',
  Keto: 'Keto',
  Other: 'Other',
}

// Richer clinical timeline — parallel to MealType, never a replacement.
export const TIMELINE_SLOTS = [
  'EarlyMorning',
  'PreWorkout',
  'DuringWorkout',
  'PostWorkout',
  'Breakfast',
  'MidMorning',
  'Lunch',
  'EveningSnack',
  'Dinner',
  'Bedtime',
] as const
export type TimelineSlot = (typeof TIMELINE_SLOTS)[number]

export const TIMELINE_SLOT_LABELS: Record<TimelineSlot, string> = {
  EarlyMorning: 'Early Morning',
  PreWorkout: 'Pre-Workout',
  DuringWorkout: 'During Workout',
  PostWorkout: 'Post-Workout',
  Breakfast: 'Breakfast',
  MidMorning: 'Mid-Morning',
  Lunch: 'Lunch',
  EveningSnack: 'Evening Snack',
  Dinner: 'Dinner',
  Bedtime: 'Bedtime',
}

// Lossless projection of the richer timeline back onto the 6-value MealType
// so meal logging / optimistic updates keep working unchanged.
export const TIMELINE_TO_MEALTYPE: Record<TimelineSlot, MealType> = {
  EarlyMorning: 'Snack',
  PreWorkout: 'PreWorkout',
  DuringWorkout: 'PreWorkout',
  PostWorkout: 'PostWorkout',
  Breakfast: 'Breakfast',
  MidMorning: 'Snack',
  Lunch: 'Lunch',
  EveningSnack: 'Snack',
  Dinner: 'Dinner',
  Bedtime: 'Snack',
}

// Sensible reverse default when a meal has no explicit timelineSlot.
export const MEALTYPE_TO_TIMELINE: Record<MealType, TimelineSlot> = {
  Breakfast: 'Breakfast',
  Lunch: 'Lunch',
  Dinner: 'Dinner',
  Snack: 'EveningSnack',
  PreWorkout: 'PreWorkout',
  PostWorkout: 'PostWorkout',
}

export const MEAL_REASON_TAGS = [
  'Satiety',
  'BloodSugarControl',
  'Recovery',
  'FatMetabolism',
  'MuscleProteinSynthesis',
  'Hydration',
  'Digestion',
] as const
export type MealReasonTag = (typeof MEAL_REASON_TAGS)[number]

export const MEAL_REASON_TAG_LABELS: Record<MealReasonTag, string> = {
  Satiety: 'Improves satiety',
  BloodSugarControl: 'Supports blood sugar control',
  Recovery: 'Supports recovery',
  FatMetabolism: 'Supports fat metabolism',
  MuscleProteinSynthesis: 'Supports muscle protein synthesis',
  Hydration: 'Supports hydration',
  Digestion: 'Supports digestion',
}

export interface MealReasoning {
  tags?: MealReasonTag[]
  rationale?: string | null
}

export const LIFESTYLE_CATEGORIES = [
  'Hydration',
  'Meditation',
  'Sleep',
  'Recovery',
  'Digestion',
] as const
export type LifestyleCategory = (typeof LIFESTYLE_CATEGORIES)[number]

export const LIFESTYLE_CATEGORY_LABELS: Record<LifestyleCategory, string> = {
  Hydration: 'Hydration',
  Meditation: 'Meditation',
  Sleep: 'Sleep Guidance',
  Recovery: 'Recovery Tips',
  Digestion: 'Digestion Support',
}

export interface LifestyleRecommendation {
  category: LifestyleCategory
  title?: string
  detail?: string | null
}

// ── Populated member (returned by backend when userId is populated) ──────────
export interface PopulatedMember {
  _id: string
  username?: string
  fullName?: string
  email?: string
  phone?: string
}

// ── Nutrition dashboard member (GET /nutrition/members) ─────────────────────
export interface NutritionDashboardMember {
  _id: string
  member: PopulatedMember
  nutritionStatus?: string
  onboardingStep?: string
  bookingStatus?: string
  bookingDate?: string
}

// ── Domain entities ───────────────────────────────────────────────────────────
export interface MacroTarget {
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
  fiberG?: number | null
  sugarG?: number | null
}

export interface MacroSnapshot {
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG?: number | null
  sugarG?: number | null
}

export interface FoodItem {
  _id: string
  name: string
  brand?: string | null
  source: 'System' | 'Custom'
  basePer: number
  servingLabel: string
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG?: number | null
  sugarG?: number | null
  barcode?: string | null
  isActive: boolean
  // Clinical metadata (additive, optional — older foods may omit these)
  isVeg?: boolean | null
  allergens?: string[]
  mealTypes?: MealType[]
  foodTags?: string[]
  dietaryPreferences?: DietaryPreference[]
  createdAt?: string
  updatedAt?: string
}

export interface StoredMealItem {
  foodId: string
  foodName: string
  quantityG: number
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG?: number | null
  sugarG?: number | null
}

export interface MealItemInput {
  foodId: string
  quantityG: number
}

export interface MealOption {
  optionId?: string
  label?: string
  items: StoredMealItem[]
  reasoning?: MealReasoning
  isDefault?: boolean
}

export interface MealOptionInput {
  optionId?: string
  label?: string
  items: MealItemInput[]
  reasoning?: MealReasoning
  isDefault?: boolean
}

export interface StoredMeal {
  mealType: MealType
  name: string
  timeOfDay?: string | null
  notes?: string
  items: StoredMealItem[]
  // Clinical extensions (additive, optional)
  timelineSlot?: TimelineSlot | null
  reasoning?: MealReasoning
  options?: MealOption[]
}

export interface MealInput {
  mealType: MealType
  name: string
  timeOfDay?: string | null
  notes?: string
  items: MealItemInput[]
  // Clinical extensions (additive, optional)
  timelineSlot?: TimelineSlot | null
  reasoning?: MealReasoning
  options?: MealOptionInput[]
}

export interface DayInput {
  dayNumber: number
  meals: MealInput[]
}

export interface StoredDay {
  dayNumber: number
  meals: StoredMeal[]
}

export interface NutritionTemplate {
  _id: string
  name: string
  description?: string
  createdBy?: string
  goal: NutritionGoal
  status: NutritionPlanStatus
  tags?: string[]
  targetCaloriesKcal?: number | null
  targetMacros?: MacroTarget
  durationDays?: number
  days: StoredDay[]
  // Clinical extensions (additive, optional)
  lifestyle?: LifestyleRecommendation[]
  conditionTags?: string[]
  allergenWarnings?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface UserNutritionPlan {
  _id: string
  userId: string
  userName?: string
  member?: PopulatedMember
  templateId?: string
  name: string
  goal: NutritionGoal
  status: NutritionPlanStatus
  startDate: string
  endDate?: string | null
  targetCaloriesKcal?: number | null
  targetMacros?: MacroTarget
  durationDays?: number
  days: StoredDay[]
  // Clinical extensions (additive, optional)
  lifestyle?: LifestyleRecommendation[]
  conditionTags?: string[]
  allergenWarnings?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface MealLog {
  _id: string
  planId: string
  userId: string
  date: string
  slot: MealType
  consumed: boolean
  calories?: number
  notes?: string
  // Optional, inert with respect to slot-based optimistic logging
  selectedOptionId?: string
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
  brand: z.string().optional(),
  basePer: z.coerce.number().positive('Must be > 0').max(10000).optional(),
  servingLabel: z.string().optional(),
  caloriesKcal: z.coerce.number().nonnegative(),
  proteinG: z.coerce.number().nonnegative(),
  carbsG: z.coerce.number().nonnegative(),
  fatG: z.coerce.number().nonnegative(),
  fiberG: z.coerce.number().nonnegative().nullable().optional(),
  sugarG: z.coerce.number().nonnegative().nullable().optional(),
  barcode: z.string().optional(),
  // Clinical metadata (additive, optional)
  isVeg: z.boolean().nullable().optional(),
  allergens: z.array(z.string()).optional(),
  mealTypes: z.array(z.enum(MEAL_TYPES)).optional(),
  foodTags: z.array(z.string()).optional(),
  dietaryPreferences: z.array(z.enum(DIETARY_PREFERENCES)).optional(),
})
export type FoodFormValues = z.infer<typeof foodSchema>

export const templateMealItemSchema = z.object({
  foodId: z.string().min(1, 'Select a food'),
  quantityG: z.coerce.number().positive('Qty > 0').max(10000),
})

export const mealReasoningSchema = z
  .object({
    tags: z.array(z.enum(MEAL_REASON_TAGS)).optional(),
    rationale: z.string().max(1000).nullable().optional(),
  })
  .optional()

export const mealOptionSchema = z.object({
  optionId: z.string().optional(),
  label: z.string().max(120).optional(),
  isDefault: z.boolean().optional(),
  reasoning: mealReasoningSchema,
  items: z.array(templateMealItemSchema).min(1, 'Add at least one food'),
})

export const lifestyleSchema = z.object({
  category: z.enum(LIFESTYLE_CATEGORIES),
  title: z.string().max(200).optional(),
  detail: z.string().max(2000).nullable().optional(),
})

export const templateMealSchema = z
  .object({
    mealType: z.enum(MEAL_TYPES),
    name: z.string().min(1),
    timeOfDay: z.string().nullable().optional(),
    timelineSlot: z.enum(TIMELINE_SLOTS).nullable().optional(),
    notes: z.string().max(1000).optional(),
    reasoning: mealReasoningSchema,
    options: z.array(mealOptionSchema).default([]),
    items: z.array(templateMealItemSchema).default([]),
  })
  .superRefine((meal, ctx) => {
    const hasFlat = (meal.items?.length ?? 0) >= 1
    const hasOption = (meal.options ?? []).some(
      (o) => (o.items?.length ?? 0) >= 1
    )
    if (!hasFlat && !hasOption) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Add at least one food',
        path: ['items'],
      })
    }
  })

export const templateDaySchema = z.object({
  selectedDays: z.array(z.string()).min(1, 'Select at least one day'),
  meals: z.array(templateMealSchema).default([]),
})

export const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().max(2000).optional(),
  goal: z.enum(NUTRITION_GOALS),
  targetCaloriesKcal: z.coerce.number().min(0).max(100000).nullable().optional(),
  targetMacros: z.object({
    proteinG: z.coerce.number().min(0).nullable().optional(),
    carbsG: z.coerce.number().min(0).nullable().optional(),
    fatG: z.coerce.number().min(0).nullable().optional(),
    fiberG: z.coerce.number().min(0).nullable().optional(),
    sugarG: z.coerce.number().min(0).nullable().optional(),
  }).optional(),
  durationDays: z.coerce.number().int().min(1).max(366).optional(),
  days: z.array(templateDaySchema).default([]),
  lifestyle: z.array(lifestyleSchema).default([]),
  conditionTags: z.array(z.string()).optional(),
  // Frontend-only fields mapped to conditionTags
  foodPreference: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medicalConditions: z.array(z.string()).optional(),
  mealPattern: z.string().optional(),
})
export type TemplateFormValues = z.infer<typeof templateSchema>

export const assignPlanSchema = z.object({
  userId: z.string().min(1, 'Select a member'),
  planId: z.string().min(1, 'Select a plan'),
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
  targetCaloriesKcal?: number | null
  targetMacros?: MacroTarget
  durationDays?: number
  days: DayInput[]
  lifestyle?: LifestyleRecommendation[]
  conditionTags?: string[]
}
export type UpdateTemplatePayload = Partial<CreateTemplatePayload>

export interface AssignPlanPayload {
  planId: string
  userId: string
  startDate: string
  endDate?: string
}

export interface LogMealPayload {
  planId: string
  date: string
  slot: MealType
  consumed: boolean
  calories?: number
  notes?: string
  // Optional, inert with respect to slot-based optimistic logging
  selectedOptionId?: string
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

// ── Nutrition assessment (enriches onboarding — never duplicates it) ──────────
// Allergies / medical conditions / goal are read READ-ONLY from onboarding.
// Only nutrition-specific fields are writable here. *Snapshot fields are an
// optional, non-authoritative denormalized copy for plan-time reference.
export interface NutritionAssessment {
  _id?: string
  userId: string
  dietaryPreference?: DietaryPreference | null
  preferredFoods?: string[]
  dislikedFoods?: string[]
  mealsPerDay?: number | null
  waterTargetMl?: number | null
  targetCaloriesKcal?: number | null
  targetMacros?: MacroTarget
  notes?: string | null
  allergiesSnapshot?: string[]
  medicalConditionsSnapshot?: string[]
  goalSnapshot?: NutritionGoal | null
  createdAt?: string
  updatedAt?: string
}

export const assessmentSchema = z.object({
  dietaryPreference: z.enum(DIETARY_PREFERENCES).nullable().optional(),
  preferredFoods: z.array(z.string()).optional(),
  dislikedFoods: z.array(z.string()).optional(),
  mealsPerDay: z.coerce.number().int().min(1).max(12).nullable().optional(),
  waterTargetMl: z.coerce.number().min(0).max(20000).nullable().optional(),
  targetCaloriesKcal: z.coerce
    .number()
    .min(0)
    .max(100000)
    .nullable()
    .optional(),
  targetMacros: z
    .object({
      proteinG: z.coerce.number().min(0).nullable().optional(),
      carbsG: z.coerce.number().min(0).nullable().optional(),
      fatG: z.coerce.number().min(0).nullable().optional(),
      fiberG: z.coerce.number().min(0).nullable().optional(),
      sugarG: z.coerce.number().min(0).nullable().optional(),
    })
    .optional(),
  notes: z.string().max(2000).nullable().optional(),
})
export type AssessmentFormValues = z.infer<typeof assessmentSchema>

export interface SaveAssessmentPayload extends AssessmentFormValues {
  userId: string
}
