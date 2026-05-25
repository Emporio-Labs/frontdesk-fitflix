import { create } from 'zustand'
import type {
  WorkoutPlan,
  WorkoutDay,
  WorkoutExercise,
  Exercise,
  CreateWorkoutPlanPayload,
  UpdateWorkoutPlanPayload,
} from '@/types/workout'

interface WorkoutStore {
  currentPlan: Partial<WorkoutPlan>
  selectedDayIndex: number
  assignedUserIds: string[]
  assignmentStartDate: string // ISO date (YYYY-MM-DD)

  setPlanField: <K extends keyof WorkoutPlan>(field: K, value: WorkoutPlan[K]) => void
  setSelectedDay: (index: number) => void
  addDay: () => void
  removeDay: (index: number) => void
  updateDay: (index: number, updates: Partial<WorkoutDay>) => void
  addExerciseToDay: (dayIndex: number, exercise: Exercise) => void
  removeExerciseFromDay: (dayIndex: number, exerciseIndex: number) => void
  updateExerciseInDay: (
    dayIndex: number,
    exerciseIndex: number,
    updates: Partial<WorkoutExercise>
  ) => void
  reorderExercisesInDay: (dayIndex: number, oldIndex: number, newIndex: number) => void
  loadPlan: (plan: WorkoutPlan) => void
  resetPlan: () => void
  getPlanPayload: () => CreateWorkoutPlanPayload
  getUpdatePayload: () => UpdateWorkoutPlanPayload
  toggleUserAssignment: (userId: string) => void
  setAssignedUsers: (userIds: string[]) => void
  setAssignmentStartDate: (date: string) => void
}

const todayIsoDate = (): string => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DEFAULT_PLAN: Partial<WorkoutPlan> = {
  name: '',
  description: '',
  difficulty: 'Intermediate',
  duration: 4,
  goal: 'GeneralFitness',
  splitType: 'Custom',
  days: [],
  status: 'Draft',
  assignedUsers: [],
  isTemplate: false,
}

export const useWorkoutStore = create<WorkoutStore>()((set, get) => ({
  currentPlan: { ...DEFAULT_PLAN },
  selectedDayIndex: 0,
  assignedUserIds: [],
  assignmentStartDate: todayIsoDate(),

  setPlanField: (field, value) =>
    set((s) => ({ currentPlan: { ...s.currentPlan, [field]: value } })),

  setSelectedDay: (index) => set({ selectedDayIndex: index }),

  addDay: () =>
    set((s) => {
      const days = [...(s.currentPlan.days || [])]
      const dayNumber = days.length + 1
      days.push({ dayNumber, name: `Day ${dayNumber}`, isRestDay: false, exercises: [] })
      return { currentPlan: { ...s.currentPlan, days }, selectedDayIndex: days.length - 1 }
    }),

  removeDay: (index) =>
    set((s) => {
      const days = [...(s.currentPlan.days || [])]
      days.splice(index, 1)
      const renumbered = days.map((d, i) => ({ ...d, dayNumber: i + 1 }))
      return {
        currentPlan: { ...s.currentPlan, days: renumbered },
        selectedDayIndex: Math.min(s.selectedDayIndex, Math.max(renumbered.length - 1, 0)),
      }
    }),

  updateDay: (index, updates) =>
    set((s) => {
      const days = [...(s.currentPlan.days || [])]
      if (days[index]) days[index] = { ...days[index], ...updates }
      return { currentPlan: { ...s.currentPlan, days } }
    }),

  addExerciseToDay: (dayIndex, exercise) =>
    set((s) => {
      const days = [...(s.currentPlan.days || [])]
      if (!days[dayIndex]) return s
      const exercises = [...days[dayIndex].exercises]
      exercises.push({
        exerciseId: exercise._id,
        exercise: {
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          difficulty: exercise.difficulty,
          equipment: exercise.equipment,
          caloriesPerSet: exercise.caloriesPerSet,
        },
        targetSets: 3,
        targetReps: 12,
        targetWeightKg: 20,
        restSeconds: 60,
        orderIndex: exercises.length,
      })
      days[dayIndex] = { ...days[dayIndex], exercises }
      return { currentPlan: { ...s.currentPlan, days } }
    }),

  removeExerciseFromDay: (dayIndex, exerciseIndex) =>
    set((s) => {
      const days = [...(s.currentPlan.days || [])]
      if (!days[dayIndex]) return s
      const exercises = [...days[dayIndex].exercises]
      exercises.splice(exerciseIndex, 1)
      days[dayIndex] = {
        ...days[dayIndex],
        exercises: exercises.map((e, i) => ({ ...e, orderIndex: i })),
      }
      return { currentPlan: { ...s.currentPlan, days } }
    }),

  updateExerciseInDay: (dayIndex, exerciseIndex, updates) =>
    set((s) => {
      const days = [...(s.currentPlan.days || [])]
      if (!days[dayIndex]) return s
      const exercises = [...days[dayIndex].exercises]
      if (exercises[exerciseIndex]) {
        exercises[exerciseIndex] = { ...exercises[exerciseIndex], ...updates }
      }
      days[dayIndex] = { ...days[dayIndex], exercises }
      return { currentPlan: { ...s.currentPlan, days } }
    }),

  reorderExercisesInDay: (dayIndex, oldIndex, newIndex) =>
    set((s) => {
      const days = [...(s.currentPlan.days || [])]
      if (!days[dayIndex]) return s
      const exercises = [...days[dayIndex].exercises]
      const [moved] = exercises.splice(oldIndex, 1)
      exercises.splice(newIndex, 0, moved)
      days[dayIndex] = {
        ...days[dayIndex],
        exercises: exercises.map((e, i) => ({ ...e, orderIndex: i })),
      }
      return { currentPlan: { ...s.currentPlan, days } }
    }),

  loadPlan: (plan) =>
    set({
      currentPlan: { ...plan },
      selectedDayIndex: 0,
      assignedUserIds: (plan.assignedUsers || []).map((u: any) =>
        typeof u === 'string' ? u : u._id
      ),
      assignmentStartDate: todayIsoDate(),
    }),

  resetPlan: () =>
    set({
      currentPlan: { ...DEFAULT_PLAN, days: [] },
      selectedDayIndex: 0,
      assignedUserIds: [],
      assignmentStartDate: todayIsoDate(),
    }),

  getPlanPayload: () => {
    const s = get()
    return {
      name: s.currentPlan.name || 'Untitled Plan',
      description: s.currentPlan.description || '',
      difficulty: s.currentPlan.difficulty || 'Intermediate',
      duration: s.currentPlan.duration || 4,
      goal: s.currentPlan.goal || 'GeneralFitness',
      splitType: s.currentPlan.splitType || 'Custom',
      status: s.currentPlan.status || 'Draft',
      isTemplate: s.currentPlan.isTemplate || false,
      templateCategory: s.currentPlan.templateCategory || undefined,
      assignedUsers: s.assignedUserIds,
      days: (s.currentPlan.days || []).map((day) => ({
        dayNumber: day.dayNumber,
        name: day.name,
        isRestDay: day.isRestDay,
        exercises: day.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          orderIndex: ex.orderIndex,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeightKg: ex.targetWeightKg ?? 0,
          restSeconds: ex.restSeconds ?? 60,
        })),
      })),
    }
  },
 
  getUpdatePayload: () => {
    const s = get()
    return {
      name: s.currentPlan.name || 'Untitled Plan',
      description: s.currentPlan.description || '',
      difficulty: s.currentPlan.difficulty || 'Intermediate',
      duration: s.currentPlan.duration || 4,
      goal: s.currentPlan.goal || 'GeneralFitness',
      splitType: s.currentPlan.splitType || 'Custom',
      status: s.currentPlan.status || 'Draft',
      isTemplate: s.currentPlan.isTemplate || false,
      templateCategory: s.currentPlan.templateCategory || undefined,
      assignedUsers: s.assignedUserIds,
      days: s.currentPlan.days?.map((day) => ({
        dayNumber: day.dayNumber,
        name: day.name,
        isRestDay: day.isRestDay,
        exercises: day.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          orderIndex: ex.orderIndex,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeightKg: ex.targetWeightKg ?? 0,
          restSeconds: ex.restSeconds ?? 60,
        })),
      })),
    }
  },

  toggleUserAssignment: (userId) =>
    set((s) => {
      const ids = [...s.assignedUserIds]
      const idx = ids.indexOf(userId)
      if (idx >= 0) ids.splice(idx, 1)
      else ids.push(userId)
      return { assignedUserIds: ids }
    }),

  setAssignedUsers: (userIds) => set({ assignedUserIds: userIds }),

  setAssignmentStartDate: (date) => set({ assignmentStartDate: date }),
}))
