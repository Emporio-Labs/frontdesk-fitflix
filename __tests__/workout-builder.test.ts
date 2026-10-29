import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkoutStore } from '@/stores/workout-store'
import type { Exercise, WorkoutPlan } from '@/types/workout'

const sampleExercise: Exercise = {
  _id: 'ex_bench_press',
  name: 'Barbell Bench Press',
  muscleGroups: ['Chest'],
  targetedMuscles: ['Pectoralis Major', 'Triceps'],
  difficulty: 'Intermediate',
  equipment: 'Barbell',
  instructions: 'Lower bar to chest and press up.',
  commonMistakes: [],
  tips: [],
  caloriesPerSet: 15,
  isSystem: true,
  createdBy: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  imageUrl: null,
}

describe('Feature 9: Workout Builder (Client-side) Unit Tests', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useWorkoutStore.setState({
      plans: [],
      currentPlan: {
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
      },
      selectedDayIndex: 0,
      assignedUserIds: [],
    })
  })

  describe('LocalStorage Persistence & Draft Edge Cases', () => {
    it('exposes that currentPlan draft is NOT persisted to storage (only saved plans are persisted)', () => {
      // In workout-store.ts, partialize: (state) => ({ plans: state.plans })
      // Notice currentPlan is excluded from partialize
      const store = useWorkoutStore.getState()

      store.setPlanField('name', 'Hypertrophy Phase 1')
      store.addDay()
      store.addExerciseToDay(0, sampleExercise, 'workout')

      const updatedState = useWorkoutStore.getState()
      expect(updatedState.currentPlan.name).toBe('Hypertrophy Phase 1')
      expect(updatedState.currentPlan.days).toHaveLength(1)

      // When the persist middleware partializes state for localStorage:
      // Any in-progress workout drafted by a trainer is wiped on page reload or navigation
      const persistConfig = (useWorkoutStore as any).persist
      if (persistConfig?.getOptions) {
        const partialized = persistConfig.getOptions().partialize(updatedState)
        expect(partialized).not.toHaveProperty('currentPlan')
        expect(partialized).toHaveProperty('plans')
      }
    })
  })

  describe('Exercise & Day Reordering Edge Cases', () => {
    it('adds exercises to specific sections and computes orderIndex sequentially', () => {
      const store = useWorkoutStore.getState()
      store.addDay()

      store.addExerciseToDay(0, sampleExercise, 'warmup')
      store.addExerciseToDay(0, { ...sampleExercise, _id: 'ex_incline' }, 'workout')

      const day = useWorkoutStore.getState().currentPlan.days?.[0]
      expect(day?.exercises).toHaveLength(2)
      expect(day?.exercises[0].section).toBe('warmup')
      expect(day?.exercises[0].orderIndex).toBe(0)
      expect(day?.exercises[1].section).toBe('workout')
      expect(day?.exercises[1].orderIndex).toBe(1)
    })

    it('exposes that reordering exercises across sections does NOT update exercise section attribute', () => {
      const store = useWorkoutStore.getState()
      store.addDay()

      // Add one warmup and one main workout exercise
      store.addExerciseToDay(0, { ...sampleExercise, _id: 'ex_1', name: 'Warmup Jog' }, 'warmup')
      store.addExerciseToDay(0, { ...sampleExercise, _id: 'ex_2', name: 'Heavy Squat' }, 'workout')

      // User drags the warmup exercise after the workout exercise
      store.reorderExercisesInDay(0, 0, 1)

      const exercises = useWorkoutStore.getState().currentPlan.days?.[0].exercises || []
      expect(exercises[0].exerciseId).toBe('ex_2')
      expect(exercises[1].exerciseId).toBe('ex_1')

      // Notice: exercise 1 moved to index 1, but its section remains 'warmup'
      // When the UI filters exercises by section, ex_1 still shows up in the Warm Up box
      expect(exercises[1].section).toBe('warmup')
    })

    it('exposes dead day index when all days are removed', () => {
      const store = useWorkoutStore.getState()
      store.addDay() // Day 1
      expect(useWorkoutStore.getState().currentPlan.days).toHaveLength(1)

      // Staff deletes Day 1
      store.removeDay(0)
      expect(useWorkoutStore.getState().currentPlan.days).toHaveLength(0)

      // Now selectedDayIndex is 0, but days array is empty
      // Trying to add an exercise silently fails because days[0] is undefined
      store.addExerciseToDay(0, sampleExercise, 'workout')
      expect(useWorkoutStore.getState().currentPlan.days).toHaveLength(0)
    })
  })

  describe('Plan Creation & Local CRUD Operations', () => {
    it('saves a new plan into the local plans array and generates a fallback ID', () => {
      const store = useWorkoutStore.getState()
      store.setPlanField('name', 'Strength Protocol 5x5')
      store.addDay()
      store.addExerciseToDay(0, sampleExercise, 'workout')

      const saved = store.savePlan()

      expect(saved.name).toBe('Strength Protocol 5x5')
      expect(saved.id).toBeDefined()
      expect(saved.days).toHaveLength(1)

      const allPlans = useWorkoutStore.getState().plans
      expect(allPlans).toHaveLength(1)
      expect(allPlans[0].name).toBe('Strength Protocol 5x5')
    })

    it('deletes an existing plan from the local plans array', () => {
      const store = useWorkoutStore.getState()
      store.setPlanField('name', 'Temporary Plan')
      const saved = store.savePlan()

      expect(useWorkoutStore.getState().plans).toHaveLength(1)

      store.deletePlan(saved.id!)
      expect(useWorkoutStore.getState().plans).toHaveLength(0)
    })

    it('loads an existing plan into builder and resets assignment fields', () => {
      const store = useWorkoutStore.getState()
      const mockPlan: WorkoutPlan = {
        _id: 'plan_existing_123',
        id: 'plan_existing_123',
        name: 'Loaded Plan',
        difficulty: 'Advanced',
        duration: 8,
        goal: 'Strength',
        splitType: 'PushPullLegs',
        days: [
          {
            dayNumber: 1,
            name: 'Push Day',
            isRestDay: false,
            exercises: [],
          },
        ],
        status: 'Active',
        assignedUsers: ['user_alpha', 'user_beta'],
        isTemplate: true,
        createdBy: 'admin_1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }

      store.loadPlan(mockPlan)

      const state = useWorkoutStore.getState()
      expect(state.currentPlan.name).toBe('Loaded Plan')
      expect(state.assignedUserIds).toEqual(['user_alpha', 'user_beta'])
      expect(state.selectedDayIndex).toBe(0)
    })
  })
})
