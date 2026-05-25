// Enums aligned with backend (capitalized)
export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core'
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type SessionStatus = 'Active' | 'Completed' | 'Abandoned'
export type ExerciseType = 'Warmup' | 'Main' | 'Mobility' | 'Stretching' | 'Cooldown' | 'Cardio'
export type WorkoutSection = 'warmup' | 'workout' | 'stretching'

// Backend-aligned enums
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
  equipment?: string
  search?: string
  isSystem?: boolean
  page?: number
  limit?: number
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
  exercises: WorkoutExercise[]
  createdAt: string
  updatedAt: string
}

// Frontend-only: workout plan (no backend model)
export interface WorkoutDay {
  dayNumber: number
  name: string
  isRestDay: boolean
  exercises: WorkoutExercise[]
}

export interface WorkoutPlan {
  id: string
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
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
export const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced']
export const EXERCISE_TYPES: ExerciseType[] = ['Warmup', 'Main', 'Mobility', 'Stretching', 'Cooldown', 'Cardio']
export const WORKOUT_SECTIONS: WorkoutSection[] = ['warmup', 'workout', 'stretching']
export const PLAN_GOALS: { value: PlanGoal; label: string }[] = [
  { value: 'Strength', label: 'Strength' },
  { value: 'Hypertrophy', label: 'Hypertrophy' },
  { value: 'Endurance', label: 'Endurance' },
  { value: 'WeightLoss', label: 'Weight Loss' },
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
