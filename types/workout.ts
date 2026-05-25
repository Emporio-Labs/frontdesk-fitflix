// Enums aligned with backend (capitalized)
export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core'
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type SessionStatus = 'Active' | 'Completed' | 'Abandoned'

export type PlanStatus = 'Draft' | 'Published' | 'Archived'
export type SplitType = 'FullBody' | 'UpperLower' | 'PushPullLegs' | 'BroSplit' | 'Custom'
export type PlanGoal =
  | 'MuscleGain'
  | 'WeightLoss'
  | 'Strength'
  | 'Endurance'
  | 'Mobility'
  | 'GeneralFitness'

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
export const PLAN_GOALS: { value: PlanGoal; label: string }[] = [
  { value: 'MuscleGain', label: 'Muscle Gain' },
  { value: 'WeightLoss', label: 'Weight Loss' },
  { value: 'Strength', label: 'Strength' },
  { value: 'Endurance', label: 'Endurance' },
  { value: 'Mobility', label: 'Mobility' },
  { value: 'GeneralFitness', label: 'General Fitness' },
]
export const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: 'FullBody', label: 'Full Body' },
  { value: 'UpperLower', label: 'Upper / Lower' },
  { value: 'PushPullLegs', label: 'Push / Pull / Legs' },
  { value: 'BroSplit', label: 'Bro Split' },
  { value: 'Custom', label: 'Custom' },
]
