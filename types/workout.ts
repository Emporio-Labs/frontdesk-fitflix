// Enums aligned with backend (capitalized)
export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core'
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type SessionStatus = 'Active' | 'Completed' | 'Abandoned'
export type ExerciseType = 'Warmup' | 'Main' | 'Mobility' | 'Stretching' | 'Cooldown' | 'Cardio'
export type WorkoutSection = 'warmup' | 'workout' | 'stretching'

export type PlanStatus = 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Archived'
export type SplitType = 'FullBody' | 'UpperLower' | 'PushPull' | 'PushPullLegs' | 'Custom'
export type PlanGoal =
  | 'Strength'
  | 'Hypertrophy'
  | 'Endurance'
  | 'WeightLoss'
  | 'Maintenance'
  | 'Custom'

// Backend exercise model (matches GET /exercises response)
export interface Exercise {
  _id: string
  name: string
  muscleGroup: MuscleGroup
  targetedMuscles: string[]
  difficulty: Difficulty
  equipment: string
  instructions: string
  commonMistakes: string[]
  tips: string[]
  caloriesPerSet: number
  exerciseType?: ExerciseType
  sectionTypes?: WorkoutSection[]
  imageUrl: string | null
  isSystem: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface ExerciseFilters {
  muscleGroup?: MuscleGroup
  difficulty?: Difficulty
  section?: WorkoutSection
  equipment?: string
  search?: string
  isSystem?: boolean
  page?: number
  limit?: number
}

// Central category resolution: backend stores sections in `sectionTypes`
// (default ["workout"]); legacy `exerciseType` is mapped as a fallback.
export function getExerciseSections(
  exercise: Pick<Exercise, 'sectionTypes' | 'exerciseType'>
): WorkoutSection[] {
  if (exercise.sectionTypes && exercise.sectionTypes.length > 0) {
    return exercise.sectionTypes
  }
  switch (exercise.exerciseType) {
    case 'Warmup':
      return ['warmup']
    case 'Stretching':
    case 'Cooldown':
    case 'Mobility':
      return ['stretching']
    default:
      return ['workout']
  }
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ExerciseListResponse {
  exercises: Exercise[]
  pagination: PaginationInfo
}

export interface CreateExercisePayload {
  name: string
  muscleGroup: MuscleGroup
  targetedMuscles: string[]
  difficulty: Difficulty
  equipment?: string
  instructions?: string
  commonMistakes?: string[]
  tips?: string[]
  caloriesPerSet?: number
  sectionTypes?: WorkoutSection[]
  imageUrl?: string
}

export interface UpdateExercisePayload {
  name?: string
  muscleGroup?: MuscleGroup
  targetedMuscles?: string[]
  difficulty?: Difficulty
  equipment?: string
  instructions?: string
  commonMistakes?: string[]
  tips?: string[]
  caloriesPerSet?: number
  sectionTypes?: WorkoutSection[]
  imageUrl?: string
}

// Backend workout exercise (matches session exercise structure)
export interface WorkoutExercise {
  _id?: string
  exerciseId: string
  exercise?: Pick<Exercise, 'name' | 'muscleGroup' | 'difficulty' | 'equipment' | 'caloriesPerSet' | 'exerciseType' | 'sectionTypes'>
  orderIndex: number
  targetSets: number
  targetReps: number
  targetWeightKg: number
  restSeconds: number
  section: WorkoutSection
  durationSeconds?: number | null
  notes?: string | null
  isCompleted?: boolean
  sets?: SetLog[]
}

export interface SetLog {
  _id: string
  setNumber: number
  actualReps: number
  actualWeightKg: number
  rpe?: number
  isWarmup: boolean
  completedAt: string
  notes?: string
}

// Backend workout session (matches GET /workouts/:id)
export interface WorkoutSession {
  _id: string
  userId: string
  date: string
  status: SessionStatus
  startedAt: string
  completedAt: string | null
  notes: string | null
  planId?: string | null
  exercises: WorkoutExercise[]
  createdAt: string
  updatedAt: string
}

export interface WorkoutDay {
  dayNumber: number
  name: string
  isRestDay: boolean
  exercises: WorkoutExercise[]
}

export interface WorkoutPlan {
  _id: string
  id?: string
  name: string
  description: string
  difficulty: Difficulty
  duration: number
  goal: PlanGoal
  splitType: SplitType
  days: WorkoutDay[]
  status: PlanStatus
  assignedUsers: string[]
  isTemplate: boolean
  templateCategory?: string
  // Plain ObjectId string, or populated `{ _id, name, email }` on list/detail responses
  createdBy: string | { _id: string; name?: string; email?: string }
  createdAt: string
  updatedAt: string
}

export interface CreateWorkoutPlanPayload {
  name: string
  description?: string
  difficulty: Difficulty
  duration: number
  goal: PlanGoal
  splitType?: SplitType
  status?: PlanStatus
  isTemplate?: boolean
  templateCategory?: string
  assignedUsers?: string[]
  days?: WorkoutDay[]
}

export interface UpdateWorkoutPlanPayload {
  name?: string
  description?: string
  difficulty?: Difficulty
  duration?: number
  goal?: PlanGoal
  splitType?: SplitType
  status?: PlanStatus
  isTemplate?: boolean
  templateCategory?: string
  assignedUsers?: string[]
  days?: WorkoutDay[]
}

export const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
export const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced']
export const EXERCISE_TYPES: ExerciseType[] = ['Warmup', 'Main', 'Mobility', 'Stretching', 'Cooldown', 'Cardio']
export const WORKOUT_SECTIONS: WorkoutSection[] = ['warmup', 'workout', 'stretching']
export const PLAN_GOALS: { value: PlanGoal; label: string }[] = [
  { value: 'Hypertrophy', label: 'Muscle Gain (Hypertrophy)' },
  { value: 'Strength', label: 'Strength' },
  { value: 'WeightLoss', label: 'Weight Loss' },
  { value: 'Endurance', label: 'Endurance' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Custom', label: 'Custom' },
]
export const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: 'FullBody', label: 'Full Body' },
  { value: 'UpperLower', label: 'Upper / Lower' },
  { value: 'PushPull', label: 'Push / Pull' },
  { value: 'PushPullLegs', label: 'Push / Pull / Legs' },
  { value: 'Custom', label: 'Custom' },
]
export const PLAN_STATUSES: { value: PlanStatus; label: string }[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Active', label: 'Active' },
  { value: 'Paused', label: 'Paused' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Archived', label: 'Archived' },
]

// Drafts persisted to localStorage before the enums were aligned with the
// backend may still carry values the API rejects — map them to valid ones.
const LEGACY_GOAL_MAP: Record<string, PlanGoal> = {
  MuscleGain: 'Hypertrophy',
  Mobility: 'Custom',
  GeneralFitness: 'Maintenance',
}

export function normalizePlanGoal(goal?: string): PlanGoal {
  if (!goal) return 'Custom'
  if (PLAN_GOALS.some((g) => g.value === goal)) return goal as PlanGoal
  return LEGACY_GOAL_MAP[goal] ?? 'Custom'
}

export function normalizeSplitType(splitType?: string): SplitType | undefined {
  if (!splitType) return undefined
  return SPLIT_TYPES.some((s) => s.value === splitType) ? (splitType as SplitType) : 'Custom'
}

export function normalizePlanStatus(status?: string): PlanStatus | undefined {
  if (!status) return undefined
  if (PLAN_STATUSES.some((s) => s.value === status)) return status as PlanStatus
  return status === 'Published' ? 'Active' : 'Draft'
}
