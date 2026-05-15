// Enums aligned with backend (capitalized)
export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core'
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type SessionStatus = 'Active' | 'Completed' | 'Abandoned'

// Frontend-only enums (no backend plan model yet)
export type PlanStatus = 'draft' | 'active' | 'archived'
export type SplitType = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'bro_split' | 'custom'
export type PlanGoal =
  | 'muscle_gain'
  | 'fat_loss'
  | 'strength'
  | 'endurance'
  | 'flexibility'
  | 'general_fitness'

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
  exercise?: Pick<Exercise, 'name' | 'muscleGroup' | 'difficulty' | 'equipment' | 'caloriesPerSet'>
  orderIndex: number
  targetSets: number
  targetReps: number
  targetWeightKg: number
  restSeconds: number
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
export const PLAN_GOALS: { value: PlanGoal; label: string }[] = [
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'fat_loss', label: 'Fat Loss' },
  { value: 'strength', label: 'Strength' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'general_fitness', label: 'General Fitness' },
]
export const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: 'full_body', label: 'Full Body' },
  { value: 'upper_lower', label: 'Upper / Lower' },
  { value: 'push_pull_legs', label: 'Push / Pull / Legs' },
  { value: 'bro_split', label: 'Bro Split' },
  { value: 'custom', label: 'Custom' },
]
