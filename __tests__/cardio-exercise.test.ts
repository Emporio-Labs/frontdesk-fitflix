import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkoutStore } from '@/stores/workout-store'
import { formatSeconds } from '@/lib/format-seconds'
import type { Exercise } from '@/types/workout'

const base: Exercise = {
  _id: 'ex',
  name: 'Exercise',
  muscleGroups: ['Legs'],
  targetedMuscles: [],
  difficulty: 'Beginner',
  equipment: '',
  instructions: '',
  commonMistakes: [],
  tips: [],
  caloriesPerSet: 0,
  isSystem: false,
  createdBy: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  imageUrl: null,
}

describe('cardio exercises are prescribed by time', () => {
  beforeEach(() => {
    useWorkoutStore.setState({
      plans: [],
      currentPlan: { name: '', days: [], assignedUsers: [] },
      selectedDayIndex: 0,
      assignedUserIds: [],
    })
    useWorkoutStore.getState().addDay()
  })

  it('a cardio exercise is added with a 10 minute duration', () => {
    useWorkoutStore
      .getState()
      .addExerciseToDay(0, { ...base, _id: 'tm', name: 'Incline Walk', exerciseType: 'cardio' })
    const row = useWorkoutStore.getState().currentPlan.days![0].exercises[0]
    expect(row.durationSeconds).toBe(600)
    expect(row.targetSets).toBe(1)
    expect(row.targetReps).toBe(1)
    expect(row.targetWeightKg).toBe(0)
    expect(row.exercise?.exerciseType).toBe('cardio')
  })

  it('a strength exercise keeps sets × reps and no duration', () => {
    useWorkoutStore.getState().addExerciseToDay(0, { ...base, exerciseType: 'strength' })
    const row = useWorkoutStore.getState().currentPlan.days![0].exercises[0]
    expect(row.durationSeconds).toBeUndefined()
    expect(row.targetSets).toBe(3)
    expect(row.targetReps).toBe(12)
  })

  it('formats durations', () => {
    expect(formatSeconds(45)).toBe('45s')
    expect(formatSeconds(600)).toBe('10 min')
    expect(formatSeconds(750)).toBe('12 min 30s')
  })
})
