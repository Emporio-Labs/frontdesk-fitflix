'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Skeleton, SkeletonCard } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import { NutritionStatusCell } from '@/components/nutrition/nutrition-status-cell'
import {
  IconChevronDown,
  IconCheck,
  IconDroplet,
  IconSalad,
  IconUsers,
  IconExternalLink,
  IconFlame,
  IconMeat,
  IconBread,
  IconButterfly,
  IconSparkles,
  IconInfoCircle,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconScale,
  IconPercentage,
} from '@tabler/icons-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  useNutritionPlans,
  useMealLogs,
  useAdherence,
  useNutritionAssessment,
  useNutritionProgress,
} from '@/hooks/use-nutrition'
import { useUsers } from '@/hooks/use-users'
import {
  MEAL_TYPE_LABELS,
  type MealLog,
  type MealType,
  type StoredMeal,
  type UserNutritionPlan,
  type NutritionAssessment,
  type NutritionGoal,
  type NutritionProgress,
} from '@/lib/types/nutrition'
import { normalizeMeal, optionCalories } from '@/lib/nutrition-normalize'
import { cn } from '@/lib/utils'
import { toNumberSafe } from '@/lib/health-insights'
import type { User, ActivityLevel } from '@/lib/services/user.service'

// ── Constants & types ─────────────────────────────────────────────────────────

type MealStatus = 'completed' | 'skipped' | 'pending'
const MAIN_SLOTS: MealType[] = ['Breakfast', 'Lunch', 'Dinner']
const DEFAULT_WATER_TARGET_ML = 3000
const WATER_ML_PER_KG = 40

// Per-kg factors keyed by nutrition goal. Used when explicit plan/assessment
// targets are not set. `kcalPerKg` drives the weight-only calorie fallback;
// the rest drive macro-only fallbacks.
const PER_KG_FACTORS: Record<NutritionGoal, {
  protein: number
  carbs: number
  fat: number
  kcalPerKg: number
}> = {
  WeightLoss:  { protein: 1.8, carbs: 3, fat: 0.8, kcalPerKg: 25 },
  MuscleGain:  { protein: 2.0, carbs: 5, fat: 1.0, kcalPerKg: 38 },
  Maintenance: { protein: 1.4, carbs: 4, fat: 0.9, kcalPerKg: 32 },
  Endurance:   { protein: 1.6, carbs: 6, fat: 1.0, kcalPerKg: 38 },
  Medical:     { protein: 1.2, carbs: 4, fat: 0.9, kcalPerKg: 30 },
  Custom:      { protein: 1.2, carbs: 4, fat: 0.9, kcalPerKg: 30 },
}

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  Sedentary:  1.2,
  Light:      1.375,
  Moderate:   1.55,
  Active:     1.725,
  VeryActive: 1.9,
}

// Goal-adjusted calorie deltas over TDEE (deficit / surplus).
const GOAL_KCAL_ADJUSTMENT: Record<NutritionGoal, number> = {
  WeightLoss:  -500,
  MuscleGain:   300,
  Endurance:    200,
  Maintenance:    0,
  Medical:        0,
  Custom:         0,
}

interface MacroTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface NutritionProfile {
  weight: number | null
  height: number | null
  age: number | null
  gender: string | null
  activity: ActivityLevel
  goal: NutritionGoal
}

type TargetSource = 'plan' | 'assessment' | 'profile' | 'default' | 'none'

interface NutritionTargets {
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  water: number | null
  source: TargetSource
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function userLabel(u: User): string {
  return u.username || u.email || u.phone || u._id
}

function userSubLabel(u: User): string {
  return [u.email, u.phone].filter(Boolean).join(' · ')
}

function sumMealMacros(items: { proteinG: number; carbsG: number; fatG: number; caloriesKcal: number }[]): MacroTotals {
  return items.reduce(
    (acc, it) => ({
      calories: acc.calories + (Number(it.caloriesKcal) || 0),
      protein:  acc.protein  + (Number(it.proteinG)    || 0),
      carbs:    acc.carbs    + (Number(it.carbsG)       || 0),
      fat:      acc.fat      + (Number(it.fatG)         || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

function mealStatus(meal: StoredMeal, log: MealLog | undefined): MealStatus {
  if (!log) return 'pending'
  return log.consumed ? 'completed' : 'skipped'
}

/** Map free-text onboarding goal labels to the typed NutritionGoal enum. */
function inferNutritionGoal(labels: string[] | undefined | null): NutritionGoal {
  const text = (labels ?? []).map((s) => s.toLowerCase()).join(' ')
  if (/muscle|strength|bulk|gain/.test(text))             return 'MuscleGain'
  if (/weight loss|weightloss|fat loss|lose weight|lean/.test(text)) return 'WeightLoss'
  if (/endurance|cardio|run|cycle|stamina/.test(text))    return 'Endurance'
  if (/maintenance|maintain|healthy|fit/.test(text))      return 'Maintenance'
  
  // Fallback to strict match if regex fails (e.g. if the backend returned exactly "WeightLoss" but as a single token)
  if (labels?.includes('WeightLoss')) return 'WeightLoss'
  if (labels?.includes('MuscleGain')) return 'MuscleGain'
  if (labels?.includes('Maintenance')) return 'Maintenance'
  if (labels?.includes('Endurance')) return 'Endurance'
  
  return 'Custom'
}

/**
 * Resolve daily targets — first non-null wins per macro:
 *   1. Plan (explicit `targetCaloriesKcal` / `targetMacros`)
 *   2. Assessment (`targetCaloriesKcal` / `targetMacros`)
 *   3. Profile calculation:
 *      - calories: Mifflin-St Jeor × activity multiplier + goal adjustment
 *                  (needs weight + height + age + gender), else weight × kcalPerKg[goal]
 *      - protein/fat: weight × factor[goal]
 *      - carbs: fill remaining calorie budget, else weight × carbsPerKg[goal]
 * Water: assessment value → weight × 40 ml → 3000 ml default.
 */
function computeNutritionTargets(
  plan: UserNutritionPlan | null,
  assessment: NutritionAssessment | null | undefined,
  profile: NutritionProfile
): NutritionTargets {
  const factor = PER_KG_FACTORS[profile.goal] ?? PER_KG_FACTORS.Custom
  const w = profile.weight

  // ── Profile-derived calories ──────────────────────────────────────────────
  let caloriesFromProfile: number | null = null
  if (
    w != null &&
    profile.height != null &&
    profile.age != null
  ) {
    const isFemale = (profile.gender || '').toLowerCase().startsWith('f')
    const bmr = isFemale
      ? 10 * w + 6.25 * profile.height - 5 * profile.age - 161
      : 10 * w + 6.25 * profile.height - 5 * profile.age + 5
    const tdee = bmr * (ACTIVITY_MULTIPLIER[profile.activity] ?? 1.55)
    caloriesFromProfile = Math.round(tdee + (GOAL_KCAL_ADJUSTMENT[profile.goal] ?? 0))
  } else if (w != null) {
    caloriesFromProfile = Math.round(w * factor.kcalPerKg)
  }

  // ── Profile-derived protein / fat (weight × factor) ───────────────────────
  const proteinFromProfile = w != null ? Math.round(w * factor.protein) : null
  const fatFromProfile     = w != null ? Math.round(w * factor.fat)     : null

  // ── Resolve macros via tiered ladder ──────────────────────────────────────
  const calories =
    plan?.targetCaloriesKcal ?? assessment?.targetCaloriesKcal ?? caloriesFromProfile
  const protein =
    plan?.targetMacros?.proteinG ?? assessment?.targetMacros?.proteinG ?? proteinFromProfile
  const fat =
    plan?.targetMacros?.fatG ?? assessment?.targetMacros?.fatG ?? fatFromProfile

  // ── Carbs: prefer remaining calorie budget; legacy weight × factor if not ─
  let carbsFromProfile: number | null = null
  if (calories != null && protein != null && fat != null) {
    const remainingKcal = calories - protein * 4 - fat * 9
    carbsFromProfile = Math.max(0, Math.round(remainingKcal / 4))
  } else if (w != null) {
    carbsFromProfile = Math.round(w * factor.carbs)
  }
  const carbs =
    plan?.targetMacros?.carbsG ?? assessment?.targetMacros?.carbsG ?? carbsFromProfile

  // ── Water ────────────────────────────────────────────────────────────────
  const waterFromProfile = w != null ? Math.round(w * WATER_ML_PER_KG) : null
  const water = assessment?.waterTargetMl ?? waterFromProfile ?? DEFAULT_WATER_TARGET_ML

  // ── Source resolution ────────────────────────────────────────────────────
  const planHasTargets = plan?.targetCaloriesKcal != null || plan?.targetMacros?.proteinG != null
  const assessmentHasTargets =
    assessment?.targetCaloriesKcal != null || assessment?.targetMacros?.proteinG != null
  const profileDerived = caloriesFromProfile != null || proteinFromProfile != null

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

  return { calories, protein, carbs, fat, water, source }
}

/** Compute macros consumed today from logs (only `consumed === true` slots). */
function computeConsumed(meals: StoredMeal[], logBySlot: Map<string, MealLog>): MacroTotals {
  let calories = 0, protein = 0, carbs = 0, fat = 0
  for (const meal of meals) {
    const log = logBySlot.get(meal.mealType)
    if (!log?.consumed) continue
    const m = sumMealMacros(normalizeMeal(meal).defaultOption.items)
    calories += m.calories; protein += m.protein; carbs += m.carbs; fat += m.fat
  }
  return { calories, protein, carbs, fat }
}

/** Redistribution of skipped-meal macros across remaining pending main meals. */
function redistributeMissedMacros(
  meals: StoredMeal[],
  logBySlot: Map<string, MealLog>
): {
  missedSlots: MealType[]
  remainingSlots: MealType[]
  perSlot: MacroTotals | null
  totalMissed: MacroTotals
} {
  const missedSlots: MealType[] = []
  const remainingSlots: MealType[] = []
  let totalMissed: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 }

  for (const meal of meals) {
    if (!MAIN_SLOTS.includes(meal.mealType)) continue
    const status = mealStatus(meal, logBySlot.get(meal.mealType))
    if (status === 'skipped') {
      missedSlots.push(meal.mealType)
      const m = sumMealMacros(normalizeMeal(meal).defaultOption.items)
      totalMissed = {
        calories: totalMissed.calories + m.calories,
        protein:  totalMissed.protein  + m.protein,
        carbs:    totalMissed.carbs    + m.carbs,
        fat:      totalMissed.fat      + m.fat,
      }
    } else if (status === 'pending') {
      remainingSlots.push(meal.mealType)
    }
  }

  const perSlot: MacroTotals | null =
    remainingSlots.length > 0
      ? {
          calories: Math.max(0, Math.round(totalMissed.calories / remainingSlots.length)),
          protein:  Math.max(0, Math.round(totalMissed.protein  / remainingSlots.length)),
          carbs:    Math.max(0, Math.round(totalMissed.carbs    / remainingSlots.length)),
          fat:      Math.max(0, Math.round(totalMissed.fat      / remainingSlots.length)),
        }
      : null

  return {
    missedSlots,
    remainingSlots,
    perSlot,
    totalMissed: {
      calories: Math.round(totalMissed.calories),
      protein:  Math.round(totalMissed.protein),
      carbs:    Math.round(totalMissed.carbs),
      fat:      Math.round(totalMissed.fat),
    },
  }
}

// ── Color tier for progress bar ───────────────────────────────────────────────

function barColorClass(pct: number): string {
  if (pct >= 100) return 'bg-green-600 dark:bg-green-500'
  if (pct >= 80)  return 'bg-green-500 dark:bg-green-400'
  if (pct >= 40)  return 'bg-blue-400  dark:bg-blue-400'
  return 'bg-amber-400 dark:bg-amber-400'
}

// ── Intake card ───────────────────────────────────────────────────────────────

interface IntakeCardProps {
  label: string
  icon: React.ElementType
  unit: string
  consumed: number | null
  target: number | null
  /** Short note shown beneath the consumed value when consumed is unavailable */
  unavailableNote?: string
  /** Shows a small deficit indicator below the bar */
  hasDeficit?: boolean
  /** Shows a green "recovered" note when target was met despite earlier skips */
  targetRecovered?: boolean
}

function IntakeCard({
  label,
  icon: Icon,
  unit,
  consumed,
  target,
  unavailableNote,
  hasDeficit,
  targetRecovered,
}: IntakeCardProps) {
  const hasConsumed = consumed != null
  const hasTarget   = target != null && target > 0

  const pct = hasConsumed && hasTarget
    ? Math.min(150, Math.round((consumed! / target!) * 100))
    : null

  const exceeded  = pct != null && pct >= 100
  const remaining = hasConsumed && hasTarget
    ? Math.max(0, Math.round(target! - consumed!))
    : null

  const barPct   = pct != null ? Math.min(100, pct) : 0
  const barColor = pct != null ? barColorClass(pct) : 'bg-muted-foreground/20'

  const unitSuffix = unit === 'kcal' ? ' kcal' : unit

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Large consumed value */}
        <div>
          {hasConsumed ? (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold leading-none">
                {Math.round(consumed!)}
              </span>
              <span className="text-sm text-muted-foreground">{unitSuffix}</span>
            </div>
          ) : (
            <span className="text-2xl font-bold text-muted-foreground">—</span>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {hasConsumed
              ? `consumed${hasTarget ? ` · of ${Math.round(target!)}${unitSuffix} target` : ''}`
              : (unavailableNote ?? 'not tracked')}
          </p>
        </div>

        {/* Progress bar */}
        {hasTarget ? (
          <div className="space-y-1.5">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn('h-full rounded-full transition-all duration-500', barColor)}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {!hasConsumed
                  ? `${Math.round(target!)}${unitSuffix} target`
                  : exceeded
                  ? `Target exceeded by ${Math.round(consumed! - target!)}${unitSuffix}`
                  : remaining != null
                  ? `${remaining}${unitSuffix} remaining`
                  : ''}
              </span>
              {pct != null && (
                <span className="font-semibold">{pct}%</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No nutrition targets assigned</p>
        )}

        {/* Deficit / recovery notes */}
        {hasDeficit && !targetRecovered && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Deficit carried from skipped meals
          </p>
        )}
        {targetRecovered && (
          <p className="text-xs text-green-600 dark:text-green-400">
            Target recovered by later intake
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Member combobox ───────────────────────────────────────────────────────────

function MemberCombobox({
  users,
  loading,
  value,
  onChange,
}: {
  users: User[]
  loading: boolean
  value?: User
  onChange: (u: User) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full sm:w-[360px] justify-between"
        >
          <span className="truncate">
            {value
              ? userLabel(value)
              : loading
              ? 'Loading members…'
              : 'Search and select a member…'}
          </span>
          <IconChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search by username, email, or phone…" />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandGroup>
              {users.slice(0, 100).map((u) => {
                const searchValue = `${u.username ?? ''} ${u.email ?? ''} ${u.phone ?? ''}`
                return (
                  <CommandItem
                    key={u._id}
                    value={searchValue}
                    onSelect={() => { onChange(u); setOpen(false) }}
                  >
                    <IconCheck
                      className={cn(
                        'mr-2 h-4 w-4',
                        value?._id === u._id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{userLabel(u)}</span>
                      {userSubLabel(u) && (
                        <span className="truncate text-xs text-muted-foreground">
                          {userSubLabel(u)}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── Meal timeline row ─────────────────────────────────────────────────────────

function MealTimelineRow({ meal, log }: { meal: StoredMeal; log?: MealLog }) {
  const status   = mealStatus(meal, log)
  const normalized = normalizeMeal(meal)
  const option   = normalized.defaultOption
  const macros   = sumMealMacros(option.items)
  const calories = optionCalories(option)

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-2',
        status === 'completed' && 'bg-muted/40',
        status === 'skipped'   && 'border-red-200 dark:border-red-900/40'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {normalized.name || MEAL_TYPE_LABELS[meal.mealType] || meal.mealType}
            </span>
            <Badge variant="secondary" className="text-xs">
              {MEAL_TYPE_LABELS[meal.mealType] ?? meal.mealType}
            </Badge>
            {normalized.timeOfDay && (
              <span className="text-xs text-muted-foreground">· {normalized.timeOfDay}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {option.items.length
              ? option.items.map((i) => `${i.foodName} (${i.quantityG}g)`).join(', ')
              : 'No foods'}
          </p>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-muted px-2 py-1">{Math.round(calories)} kcal</span>
        <span className="rounded-md bg-muted px-2 py-1">P {Math.round(macros.protein)}g</span>
        <span className="rounded-md bg-muted px-2 py-1">C {Math.round(macros.carbs)}g</span>
        <span className="rounded-md bg-muted px-2 py-1">F {Math.round(macros.fat)}g</span>
      </div>
    </div>
  )
}

// ── Workspace ─────────────────────────────────────────────────────────────────

function NutritionWorkspace({
  userId,
  selectedUser,
}: {
  userId: string
  selectedUser: User
}) {
  const today = new Date().toISOString().slice(0, 10)

  const { data: plans = [],  isLoading: plansLoading }  = useNutritionPlans(userId)
  const { data: assessment }                            = useNutritionAssessment(userId)
  const { data: adherence = [] }                        = useAdherence(userId)
  const { data: progress = [] }                         = useNutritionProgress(userId)

  const plan: UserNutritionPlan | undefined = useMemo(
    () => plans.find((p) => p.status === 'Active') ?? plans[0],
    [plans]
  )

  const latestWeightKg = useMemo<number | null>(() => {
    const withWeight = progress.filter((p) => typeof p.weight === 'number' && p.weight! > 0)
    if (!withWeight.length) return null
    return [...withWeight].sort((a, b) => b.date.localeCompare(a.date))[0].weight ?? null
  }, [progress])

  const { data: mealLogs = [] } = useMealLogs(plan?._id ?? '', today)

  const logBySlot = useMemo(() => {
    const map = new Map<string, MealLog>()
    for (const l of mealLogs) map.set(l.slot, l)
    return map
  }, [mealLogs])

  const allMeals: StoredMeal[] = useMemo(
    () => plan?.days?.flatMap((d) => d.meals ?? []) ?? [],
    [plan]
  )

  const consumed = useMemo(
    () => computeConsumed(allMeals, logBySlot),
    [allMeals, logBySlot]
  )

  const profile: NutritionProfile = useMemo(() => {
    const goalFromPlan = plan?.goal
    const goal = goalFromPlan ?? inferNutritionGoal(selectedUser.healthGoals)
    const ageNum = selectedUser.age ? Number(selectedUser.age) : NaN
    return {
      weight:   toNumberSafe(selectedUser.healthMarkers?.weight) ?? latestWeightKg,
      height:   toNumberSafe(selectedUser.healthMarkers?.height) ?? null,
      age:      Number.isFinite(ageNum) && ageNum > 0 ? ageNum : null,
      gender:   selectedUser.gender || null,
      activity: (selectedUser.healthMarkers?.activityLevel ?? 'Moderate') as ActivityLevel,
      goal,
    }
  }, [selectedUser, latestWeightKg, plan])

  const targets = useMemo(
    () => computeNutritionTargets(plan ?? null, assessment, profile),
    [plan, assessment, profile]
  )

  const recovery = useMemo(
    () => redistributeMissedMacros(allMeals, logBySlot),
    [allMeals, logBySlot]
  )

  // Deficit is active when main meals were skipped AND remaining slots still exist.
  const hasDeficit    = recovery.missedSlots.length > 0 && recovery.remainingSlots.length > 0
  // Target recovered = some were skipped but the consumed macro still met the target.
  const proteinRecovered = recovery.missedSlots.length > 0 &&
    targets?.protein != null && consumed.protein >= targets.protein
  const caloriesRecovered = recovery.missedSlots.length > 0 &&
    targets?.calories != null && consumed.calories >= targets.calories

  if (plansLoading) return <SkeletonCard />

  if (!plan) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={<IconSalad className="h-10 w-10" />}
            title="No active plan"
            description={`${userLabel(selectedUser)} has no nutrition plan assigned yet.`}
          />
        </CardContent>
      </Card>
    )
  }

  const targetSourceLabel =
    targets?.source === 'plan'
      ? 'Targets from assigned nutrition plan'
      : targets?.source === 'assessment'
      ? 'Targets from nutrition profile'
      : targets?.source === 'profile'
      ? 'Targets calculated from onboarding profile and nutrition goal'
      : targets?.source === 'default'
      ? 'Targets default to 3000 ml hydration only — no plan or weight on file'
      : 'No targets set — assign a plan with macro targets or log member weight'

  const showActionableEmptyHint = targets?.source === 'none' || targets?.source === 'default'

  return (
    <div className="space-y-6">
      {/* Target source note */}
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <IconInfoCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{targetSourceLabel}</span>
        </div>
        {showActionableEmptyHint && (
          <span className="pl-5 italic">
            Log a progress entry with body weight, or backfill onboarding health markers, to auto-calculate targets.
          </span>
        )}
      </div>

      {/* Intake summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <IntakeCard
          label="Calories"
          icon={IconFlame}
          unit="kcal"
          consumed={consumed.calories}
          target={targets?.calories ?? null}
          hasDeficit={hasDeficit}
          targetRecovered={caloriesRecovered}
        />
        <IntakeCard
          label="Protein"
          icon={IconMeat}
          unit="g"
          consumed={consumed.protein}
          target={targets?.protein ?? null}
          hasDeficit={hasDeficit}
          targetRecovered={proteinRecovered}
        />
        <IntakeCard
          label="Carbs"
          icon={IconBread}
          unit="g"
          consumed={consumed.carbs}
          target={targets?.carbs ?? null}
          hasDeficit={hasDeficit}
        />
        <IntakeCard
          label="Fat"
          icon={IconButterfly}
          unit="g"
          consumed={consumed.fat}
          target={targets?.fat ?? null}
          hasDeficit={hasDeficit}
        />
        <IntakeCard
          label="Water"
          icon={IconDroplet}
          unit="ml"
          consumed={null}
          target={targets?.water ?? DEFAULT_WATER_TARGET_ML}
          unavailableNote="tracked in member app"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: plan card + recovery */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="min-w-0">
                <CardTitle className="truncate">{plan.name}</CardTitle>
                <CardDescription>
                  {plan.goal.replace(/([a-z])([A-Z])/g, '$1 $2')}
                </CardDescription>
              </div>
              <NutritionStatusCell status={plan.status} />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start</span>
                <span>
                  {plan.startDate ? new Date(plan.startDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>
                  {plan.updatedAt
                    ? new Date(plan.updatedAt).toLocaleDateString()
                    : plan.createdAt
                    ? new Date(plan.createdAt).toLocaleDateString()
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span>{plan.durationDays ? `${plan.durationDays} days` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Meals / day</span>
                <span>{allMeals.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Nutrient recovery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IconSparkles className="h-4 w-4 text-primary" />
                Nutrient Recovery
              </CardTitle>
              <CardDescription>Missed nutrients redistributed across remaining meals</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              {recovery.missedSlots.length === 0 ? (
                <p className="text-muted-foreground">
                  No missed main meals today. Nothing to redistribute.
                </p>
              ) : recovery.perSlot ? (
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">
                      {recovery.missedSlots.join(', ')}
                    </span>{' '}
                    {recovery.missedSlots.length === 1 ? 'was' : 'were'} skipped.
                  </p>
                  <p className="text-muted-foreground">
                    {recovery.totalMissed.protein}g protein redistributed across{' '}
                    {recovery.remainingSlots.join(' and ')}{' '}
                    (+{recovery.perSlot.protein}g each).
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="secondary">+{recovery.perSlot.protein}g protein</Badge>
                    <Badge variant="secondary">+{recovery.perSlot.carbs}g carbs</Badge>
                    <Badge variant="secondary">+{recovery.perSlot.calories} kcal</Badge>
                  </div>
                </div>
              ) : (
                <p>
                  <span className="font-medium">{recovery.missedSlots.join(', ')}</span>{' '}
                  skipped. Aim for a higher-protein evening snack to compensate.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: meal timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s Meals</CardTitle>
            <CardDescription>
              {allMeals.length} meal{allMeals.length === 1 ? '' : 's'} in the active plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {allMeals.length === 0 ? (
              <EmptyState
                title="No meals in this plan"
                description="The assigned plan has no meals configured."
              />
            ) : (
              allMeals.map((meal, i) => (
                <MealTimelineRow
                  key={`${meal.mealType}-${i}`}
                  meal={meal}
                  log={logBySlot.get(meal.mealType)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent meal logs */}
      <RecentMealLogsCard meals={allMeals} mealLogs={mealLogs} />

      {/* Progress tracking */}
      <ProgressTrackingSection progress={progress} goal={profile.goal} />
    </div>
  )
}

// ── Recent Meal Logs section ──────────────────────────────────────────────────

function RecentMealLogsCard({
  meals,
  mealLogs,
}: {
  meals: StoredMeal[]
  mealLogs: MealLog[]
}) {
  const mealBySlot = useMemo(() => {
    const map = new Map<string, StoredMeal>()
    for (const m of meals) map.set(m.mealType, m)
    return map
  }, [meals])

  const rows = useMemo(() => {
    return [...mealLogs]
      .sort((a, b) => {
        const ta = a.loggedAt ? new Date(a.loggedAt).getTime() : 0
        const tb = b.loggedAt ? new Date(b.loggedAt).getTime() : 0
        return tb - ta
      })
      .map((log) => {
        const meal = mealBySlot.get(log.slot)
        const option = meal ? normalizeMeal(meal).defaultOption : null
        const macros = option ? sumMealMacros(option.items) : { calories: 0, protein: 0, carbs: 0, fat: 0 }
        const calories = option ? optionCalories(option) : (log.calories ?? 0)
        const foods = option?.items.length
          ? option.items.map((i) => `${i.foodName} (${i.quantityG}g)`).join(', ')
          : '—'
        const when = log.loggedAt
          ? new Date(log.loggedAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })
          : new Date(log.date).toLocaleDateString()
        return {
          id: log._id,
          slot: log.slot,
          consumed: log.consumed,
          foods,
          calories,
          macros,
          when,
        }
      })
  }, [mealLogs, mealBySlot])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Meal Logs</CardTitle>
        <CardDescription>
          {rows.length
            ? `${rows.length} meal log${rows.length === 1 ? '' : 's'} today`
            : 'Track which meals have been logged today'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={<IconSalad className="h-10 w-10" />}
            title="No meal logs yet"
            description="Meals logged today will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meal</TableHead>
                  <TableHead>Foods</TableHead>
                  <TableHead className="whitespace-nowrap">Calories</TableHead>
                  <TableHead>Macros</TableHead>
                  <TableHead className="whitespace-nowrap">Logged At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {MEAL_TYPE_LABELS[r.slot] ?? r.slot}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <span className="line-clamp-2 text-sm">{r.foods}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {Math.round(r.calories)} kcal
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 text-xs">
                        <span className="rounded-md bg-muted px-2 py-0.5">
                          P {Math.round(r.macros.protein)}g
                        </span>
                        <span className="rounded-md bg-muted px-2 py-0.5">
                          C {Math.round(r.macros.carbs)}g
                        </span>
                        <span className="rounded-md bg-muted px-2 py-0.5">
                          F {Math.round(r.macros.fat)}g
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {r.when}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={r.consumed ? 'completed' : 'skipped'}
                        size="sm"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Progress Tracking section ─────────────────────────────────────────────────

type TrendDirection = 'up' | 'down' | 'flat'

interface ProgressMetricEntry {
  date: string
  value: number
}

function pickEntries(
  progress: NutritionProgress[],
  field: 'weight' | 'bodyFatPct'
): ProgressMetricEntry[] {
  return [...progress]
    .filter((p) => typeof p[field] === 'number' && (p[field] as number) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ date: p.date, value: p[field] as number }))
}

function classifyTrend(
  delta: number,
  metric: 'weight' | 'bodyFatPct',
  goal: NutritionGoal
): { color: string; positive: boolean } {
  if (Math.abs(delta) < 0.05) return { color: 'text-muted-foreground', positive: false }
  if (metric === 'bodyFatPct') {
    return delta < 0
      ? { color: 'text-green-600 dark:text-green-400', positive: true }
      : { color: 'text-amber-600 dark:text-amber-400', positive: false }
  }
  // Weight
  const goingDown = delta < 0
  const aligned =
    (goal === 'WeightLoss' && goingDown) ||
    (goal === 'MuscleGain' && !goingDown) ||
    (goal === 'Maintenance' && Math.abs(delta) < 1) ||
    (goal === 'Endurance' && Math.abs(delta) < 1)
  return aligned
    ? { color: 'text-green-600 dark:text-green-400', positive: true }
    : { color: 'text-amber-600 dark:text-amber-400', positive: false }
}

function ProgressMetricCard({
  title,
  description,
  icon: Icon,
  entries,
  unit,
  metric,
  goal,
  strokeColor,
}: {
  title: string
  description: string
  icon: React.ElementType
  entries: ProgressMetricEntry[]
  unit: string
  metric: 'weight' | 'bodyFatPct'
  goal: NutritionGoal
  strokeColor: string
}) {
  const current = entries.length ? entries[entries.length - 1] : null
  const previous = entries.length > 1 ? entries[entries.length - 2] : null
  const delta = current && previous ? current.value - previous.value : null

  const trend: TrendDirection =
    delta == null ? 'flat' : delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat'
  const TrendIcon =
    trend === 'up' ? IconTrendingUp : trend === 'down' ? IconTrendingDown : IconMinus
  const trendClass = delta != null ? classifyTrend(delta, metric, goal).color : 'text-muted-foreground'

  const chartData = useMemo(
    () =>
      entries.slice(-10).map((e) => ({
        date: new Date(e.date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        value: e.value,
      })),
    [entries]
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {current == null ? (
          <p className="text-sm text-muted-foreground">
            No {metric === 'weight' ? 'weight' : 'body fat'} entries yet — log
            progress to start tracking.
          </p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold leading-none">
                    {current.value.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">{unit}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Current ·{' '}
                  {new Date(current.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                {previous ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Previous{' '}
                      <span className="font-medium text-foreground">
                        {previous.value.toFixed(1)}
                        {unit}
                      </span>
                    </p>
                    {delta != null && (
                      <div
                        className={cn(
                          'mt-1 flex items-center justify-end gap-1 text-sm font-medium',
                          trendClass
                        )}
                      >
                        <TrendIcon className="h-4 w-4" />
                        <span>
                          {delta > 0 ? '+' : ''}
                          {delta.toFixed(1)}
                          {unit}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    First entry — log again to see a trend
                  </p>
                )}
              </div>
            </div>

            {chartData.length > 1 && (
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      domain={['auto', 'auto']}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [`${Number(v).toFixed(1)}${unit}`, title]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={strokeColor}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ProgressTrackingSection({
  progress,
  goal,
}: {
  progress: NutritionProgress[]
  goal: NutritionGoal
}) {
  const weightEntries = useMemo(() => pickEntries(progress, 'weight'), [progress])
  const bodyFatEntries = useMemo(() => pickEntries(progress, 'bodyFatPct'), [progress])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ProgressMetricCard
        title="Weight Progress"
        description="Tracked from member progress entries"
        icon={IconScale}
        entries={weightEntries}
        unit="kg"
        metric="weight"
        goal={goal}
        strokeColor="#3b82f6"
      />
      <ProgressMetricCard
        title="Body Fat Progress"
        description="Body fat percentage trend"
        icon={IconPercentage}
        entries={bodyFatEntries}
        unit="%"
        metric="bodyFatPct"
        goal={goal}
        strokeColor="#10b981"
      />
    </div>
  )
}

// ── Goal display label normalizer ────────────────────────────────────────────

const GOAL_DISPLAY_LABELS: Record<string, string> = {
  WeightLoss:  'Weight Loss',
  MuscleGain:  'Muscle Gain',
  Maintenance: 'Maintenance',
  Endurance:   'Endurance',
  Medical:     'Medical',
  Custom:      'Custom Goal',
}

function normalizeGoalDisplay(goals: string[] | undefined | null): string {
  const inferred = inferNutritionGoal(goals)
  return GOAL_DISPLAY_LABELS[inferred] ?? inferred
}

// ── Profile summary mini-cards ────────────────────────────────────────────────

interface ProfileCardItem {
  label: string
  value: string
}

function ProfileSummaryCards({ user }: { user: User }) {
  const weight  = user.healthMarkers?.weight  != null ? `${user.healthMarkers.weight}kg`  : '—'
  const height  = user.healthMarkers?.height  != null ? `${user.healthMarkers.height}cm`  : '—'
  const ageNum  = user.age ? Number(user.age) : NaN
  const age     = Number.isFinite(ageNum) && ageNum > 0 ? String(ageNum) : '—'
  const goal    = normalizeGoalDisplay(user.healthGoals)

  const cards: ProfileCardItem[] = [
    { label: 'Weight', value: weight },
    { label: 'Age',    value: age    },
    { label: 'Goal',   value: goal   },
    { label: 'Height', value: height },
  ]

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {cards.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col justify-center rounded-lg border bg-card px-3 py-2 shadow-sm"
          style={{ minWidth: '112px', maxWidth: '140px', height: '60px' }}
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-none mb-1">
            {label}
          </span>
          <span className="text-sm font-semibold leading-none text-foreground truncate">
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Top-level export ──────────────────────────────────────────────────────────

export function MyNutritionDashboard() {
  const { data: users = [], isLoading: usersLoading } = useUsers()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const selectedUser = useMemo(
    () => users.find((u) => u._id === selectedUserId),
    [users, selectedUserId]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* LEFT: title */}
        <div className="shrink-0">
          <h2 className="text-3xl font-bold tracking-tight">My Nutrition</h2>
          <p className="text-muted-foreground">
            Monitor any member&apos;s daily intake, plan, and meal progress
          </p>
        </div>

        {/* CENTER: profile summary cards — only when a user is selected */}
        {selectedUser && (
          <ProfileSummaryCards user={selectedUser} />
        )}

        {/* RIGHT: member dropdown */}
        <div className="shrink-0">
          {usersLoading ? (
            <Skeleton className="h-10 w-[360px]" />
          ) : (
            <MemberCombobox
              users={users}
              loading={usersLoading}
              value={selectedUser}
              onChange={(u) => setSelectedUserId(u._id)}
            />
          )}
        </div>
      </div>

      {!selectedUser ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<IconUsers className="h-10 w-10" />}
              title="Select a member"
              description="Pick a member above to view their nutrition for today."
            />
          </CardContent>
        </Card>
      ) : (
        <NutritionWorkspace userId={selectedUser._id} selectedUser={selectedUser} />
      )}
    </div>
  )
}
