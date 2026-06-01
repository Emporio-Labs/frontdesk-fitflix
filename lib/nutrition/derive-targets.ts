import { toNumberSafe } from '@/lib/health-insights'
import type {
  NutritionAssessment,
  NutritionGoal,
  UserNutritionPlan,
} from '@/lib/types/nutrition'
import type { ActivityLevel, User } from '@/lib/services/user.service'

export const DEFAULT_WATER_TARGET_ML = 3000
const WATER_ML_PER_KG = 40

const PER_KG_FACTORS: Record<
  NutritionGoal,
  { protein: number; carbs: number; fat: number; kcalPerKg: number }
> = {
  WeightLoss: { protein: 1.8, carbs: 3, fat: 0.8, kcalPerKg: 25 },
  MuscleGain: { protein: 2.0, carbs: 5, fat: 1.0, kcalPerKg: 38 },
  Maintenance: { protein: 1.4, carbs: 4, fat: 0.9, kcalPerKg: 32 },
  Endurance: { protein: 1.6, carbs: 6, fat: 1.0, kcalPerKg: 38 },
  Medical: { protein: 1.2, carbs: 4, fat: 0.9, kcalPerKg: 30 },
  Custom: { protein: 1.2, carbs: 4, fat: 0.9, kcalPerKg: 30 },
}

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  Sedentary: 1.2,
  Light: 1.375,
  Moderate: 1.55,
  Active: 1.725,
  VeryActive: 1.9,
}

const GOAL_KCAL_ADJUSTMENT: Record<NutritionGoal, number> = {
  WeightLoss: -500,
  MuscleGain: 300,
  Endurance: 200,
  Maintenance: 0,
  Medical: 0,
  Custom: 0,
}

export type TargetSource =
  | 'plan'
  | 'assessment'
  | 'profile'
  | 'default'
  | 'none'

export interface NutritionTargets {
  calories: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  waterMl: number | null
  source: TargetSource
}

export interface NutritionProfile {
  weight: number | null
  height: number | null
  age: number | null
  gender: string | null
  activity: ActivityLevel
  goal: NutritionGoal
}

/** Map free-text onboarding goal labels to the typed NutritionGoal enum. */
export function inferNutritionGoal(
  labels: string[] | undefined | null
): NutritionGoal {
  const text = (labels ?? []).map((s) => s.toLowerCase()).join(' ')
  if (/muscle|strength|bulk|gain/.test(text)) return 'MuscleGain'
  if (/weight loss|weightloss|fat loss|lose weight|lean/.test(text))
    return 'WeightLoss'
  if (/endurance|cardio|run|cycle|stamina/.test(text)) return 'Endurance'
  if (/maintenance|maintain|healthy|fit/.test(text)) return 'Maintenance'
  if (labels?.includes('WeightLoss')) return 'WeightLoss'
  if (labels?.includes('MuscleGain')) return 'MuscleGain'
  if (labels?.includes('Maintenance')) return 'Maintenance'
  if (labels?.includes('Endurance')) return 'Endurance'
  return 'Custom'
}

export function profileFromUser(
  user: User | undefined | null,
  overrides: { goal?: NutritionGoal; latestWeightKg?: number | null } = {}
): NutritionProfile {
  const goal =
    overrides.goal ?? inferNutritionGoal(user?.healthGoals)
  const ageNum = user?.age ? Number(user.age) : NaN
  return {
    weight:
      toNumberSafe(user?.healthMarkers?.weight) ??
      overrides.latestWeightKg ??
      null,
    height: toNumberSafe(user?.healthMarkers?.height) ?? null,
    age: Number.isFinite(ageNum) && ageNum > 0 ? ageNum : null,
    gender: user?.gender || null,
    activity: (user?.healthMarkers?.activityLevel ?? 'Moderate') as ActivityLevel,
    goal,
  }
}

/**
 * Resolve daily targets — first non-null wins per macro:
 *   1. Plan (explicit `targetCaloriesKcal` / `targetMacros`)
 *   2. Assessment (`targetCaloriesKcal` / `targetMacros`)
 *   3. Profile calculation (Mifflin-St Jeor or weight × factor)
 */
export function computeNutritionTargets(
  plan: UserNutritionPlan | null | undefined,
  assessment: NutritionAssessment | null | undefined,
  profile: NutritionProfile
): NutritionTargets {
  const factor = PER_KG_FACTORS[profile.goal] ?? PER_KG_FACTORS.Custom
  const w = profile.weight

  let caloriesFromProfile: number | null = null
  if (w != null && profile.height != null && profile.age != null) {
    const isFemale = (profile.gender || '').toLowerCase().startsWith('f')
    const bmr = isFemale
      ? 10 * w + 6.25 * profile.height - 5 * profile.age - 161
      : 10 * w + 6.25 * profile.height - 5 * profile.age + 5
    const tdee = bmr * (ACTIVITY_MULTIPLIER[profile.activity] ?? 1.55)
    caloriesFromProfile = Math.round(
      tdee + (GOAL_KCAL_ADJUSTMENT[profile.goal] ?? 0)
    )
  } else if (w != null) {
    caloriesFromProfile = Math.round(w * factor.kcalPerKg)
  }

  const proteinFromProfile = w != null ? Math.round(w * factor.protein) : null
  const fatFromProfile = w != null ? Math.round(w * factor.fat) : null

  const calories =
    plan?.targetCaloriesKcal ??
    assessment?.targetCaloriesKcal ??
    caloriesFromProfile
  const protein =
    plan?.targetMacros?.proteinG ??
    assessment?.targetMacros?.proteinG ??
    proteinFromProfile
  const fat =
    plan?.targetMacros?.fatG ??
    assessment?.targetMacros?.fatG ??
    fatFromProfile

  let carbsFromProfile: number | null = null
  if (calories != null && protein != null && fat != null) {
    const remainingKcal = calories - protein * 4 - fat * 9
    carbsFromProfile = Math.max(0, Math.round(remainingKcal / 4))
  } else if (w != null) {
    carbsFromProfile = Math.round(w * factor.carbs)
  }
  const carbs =
    plan?.targetMacros?.carbsG ??
    assessment?.targetMacros?.carbsG ??
    carbsFromProfile

  const waterFromProfile = w != null ? Math.round(w * WATER_ML_PER_KG) : null
  const water =
    assessment?.waterTargetMl ?? waterFromProfile ?? DEFAULT_WATER_TARGET_ML

  const planHasTargets =
    plan?.targetCaloriesKcal != null || plan?.targetMacros?.proteinG != null
  const assessmentHasTargets =
    assessment?.targetCaloriesKcal != null ||
    assessment?.targetMacros?.proteinG != null
  const profileDerived =
    caloriesFromProfile != null || proteinFromProfile != null

  const source: TargetSource = planHasTargets
    ? 'plan'
    : assessmentHasTargets
    ? 'assessment'
    : profileDerived
    ? 'profile'
    : assessment?.waterTargetMl != null
    ? 'assessment'
    : water === DEFAULT_WATER_TARGET_ML
    ? 'default'
    : 'none'

  return {
    calories,
    proteinG: protein,
    carbsG: carbs,
    fatG: fat,
    waterMl: water,
    source,
  }
}
