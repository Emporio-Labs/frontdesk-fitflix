import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  WorkoutPlan,
  WorkoutDay,
  WorkoutExercise,
  Exercise,
  Difficulty,
  PlanGoal,
  SplitType,
  PlanStatus,
  WorkoutSection,
} from '@/types/workout'

interface WorkoutStore {
  // Persisted plan list (localStorage)
  plans: WorkoutPlan[]

  // Builder draft state
  currentPlan: Partial<WorkoutPlan>
  selectedDayIndex: number
  assignedUserIds: string[]
  assignmentStartDate: string // ISO date (YYYY-MM-DD)

  // Plan CRUD
  setPlanField: <K extends keyof WorkoutPlan>(field: K, value: WorkoutPlan[K]) => void
  setSelectedDay: (index: number) => void
  addDay: () => void
  removeDay: (index: number) => void
  updateDay: (index: number, updates: Partial<WorkoutDay>) => void
  addExerciseToDay: (dayIndex: number, exercise: Exercise, section?: WorkoutSection) => void
  removeExerciseFromDay: (dayIndex: number, exerciseIndex: number) => void
  updateExerciseInDay: (
    dayIndex: number,
    exerciseIndex: number,
    updates: Partial<WorkoutExercise>
  ) => void
  reorderExercisesInDay: (dayIndex: number, oldIndex: number, newIndex: number) => void
  loadPlan: (plan: WorkoutPlan) => void
  resetPlan: () => void
  savePlan: () => WorkoutPlan
  deletePlan: (planId: string) => void
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
  goal: 'Custom',
  splitType: 'Custom',
  days: [],
  status: 'Draft',
  assignedUsers: [],
  isTemplate: false,
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      plans: [],
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

      addExerciseToDay: (dayIndex, exercise, section = 'workout') =>
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
              exerciseType: exercise.exerciseType,
              sectionTypes: exercise.sectionTypes,
            },
            section,
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
          assignedUserIds: [...plan.assignedUsers],
          assignmentStartDate: todayIsoDate(),
        }),

      resetPlan: () =>
        set({
          currentPlan: { ...DEFAULT_PLAN, days: [] },
          selectedDayIndex: 0,
          assignedUserIds: [],
          assignmentStartDate: todayIsoDate(),
        }),

      savePlan: () => {
        const s = get()
        const now = new Date().toISOString()
        const isNew = !s.currentPlan.id

        const plan: WorkoutPlan = {
          _id: s.currentPlan._id || s.currentPlan.id || `plan_${Date.now()}`,
          id: s.currentPlan._id || s.currentPlan.id || `plan_${Date.now()}`,
          name: s.currentPlan.name || 'Untitled Plan',
          description: s.currentPlan.description || '',
          difficulty: s.currentPlan.difficulty || 'Intermediate',
          duration: s.currentPlan.duration || 4,
          goal: s.currentPlan.goal || 'Custom',
          splitType: s.currentPlan.splitType || 'Custom',
          days: s.currentPlan.days || [],
          status: s.currentPlan.status || 'Draft',
          assignedUsers: s.assignedUserIds,
          isTemplate: s.currentPlan.isTemplate || false,
          templateCategory: s.currentPlan.templateCategory,
          createdBy: s.currentPlan.createdBy || 'frontdesk',
          createdAt: s.currentPlan.createdAt || now,
          updatedAt: now,
        }

        set((prev) => {
          const plans = [...prev.plans]
          if (isNew) {
            plans.unshift(plan)
          } else {
            const idx = plans.findIndex((p) => p.id === plan.id)
            if (idx >= 0) plans[idx] = plan
            else plans.unshift(plan)
          }
          return { plans, currentPlan: plan }
        })

        return plan
      },

      deletePlan: (planId) =>
        set((s) => ({ plans: s.plans.filter((p) => p.id !== planId) })),

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
    }),
    {
      name: 'fitflix-workout-plans',
      version: 2,
      migrate: (persistedState) => persistedState,
      partialize: (state) => ({ plans: state.plans }),
    }
  )
)
