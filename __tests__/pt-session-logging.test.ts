import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trainerWorkoutService } from '@/lib/services/trainer-workout.service'
import { apiClient } from '@/lib/api-client'

describe('Feature 14: PT Session & Set Logging Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Session Creation & Exercise Setup', () => {
    it('creates a new workout session for a roster member with status Active', async () => {
      const mockSession = {
        _id: 'sess_101',
        userId: 'usr_member_1',
        date: '2026-10-28',
        status: 'Active',
        startedAt: '2026-10-28T10:00:00Z',
        exercises: [],
        updatedAt: '2026-10-28T10:00:00Z',
      }

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockSession })

      const session = await trainerWorkoutService.createSession('usr_member_1', {
        notes: 'Upper Body Power Day',
      })

      expect(session._id).toBe('sess_101')
      expect(session.status).toBe('Active')
    })

    it('adds an exercise to an active session with target reps and weight', async () => {
      const mockExercise = {
        _id: 'wex_1',
        sessionId: 'sess_101',
        exerciseId: 'ex_bench',
        orderIndex: 0,
        section: 'workout',
        targetSets: 4,
        targetReps: 10,
        targetWeightKg: 60,
        restSeconds: 90,
        sets: [],
      }

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockExercise })

      const exercise = await trainerWorkoutService.addExerciseToSession('usr_member_1', 'sess_101', {
        exerciseId: 'ex_bench',
        section: 'workout',
        targetSets: 4,
        targetReps: 10,
        targetWeightKg: 60,
        restSeconds: 90,
      })

      expect(exercise._id).toBe('wex_1')
      expect(exercise.targetSets).toBe(4)
      expect(exercise.targetWeightKg).toBe(60)
    })
  })

  describe('Set Logging & Inactive Session Lockout Edge Cases', () => {
    it('logs completed set and calculates set completion state', async () => {
      const mockLoggedSet = {
        _id: 'set_1',
        workoutExerciseId: 'wex_1',
        setNumber: 1,
        actualReps: 10,
        actualWeightKg: 60,
        isWarmup: false,
        completedAt: '2026-10-28T10:05:00Z',
        exerciseCompleted: false,
        setsRemaining: 3,
      }

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockLoggedSet })

      const result = await trainerWorkoutService.logSet(
        'usr_member_1',
        'sess_101',
        'wex_1',
        {
          actualReps: 10,
          actualWeightKg: 60,
          rpe: 8,
          isWarmup: false,
        }
      )

      expect(result.setNumber).toBe(1)
      expect(result.actualReps).toBe(10)
      expect(result.actualWeightKg).toBe(60)
      expect(result.setsRemaining).toBe(3)
    })

    it('exposes that logging a set on an accidentally completed session returns 409 Conflict lockout', async () => {
      // Backend: if (session.status !== WorkoutSessionStatus.Active) res.status(409).json({ message: "Session is not active" })
      const conflictError = {
        response: {
          status: 409,
          data: { message: 'Session is not active' },
        },
      }

      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(conflictError)

      await expect(
        trainerWorkoutService.logSet('usr_member_1', 'sess_completed_1', 'wex_1', {
          actualReps: 12,
          actualWeightKg: 50,
        })
      ).rejects.toMatchObject({
        response: { status: 409 },
      })
    })

    it('completes session by transitioning status from Active to Completed', async () => {
      const mockCompletedSession = {
        _id: 'sess_101',
        userId: 'usr_member_1',
        status: 'Completed',
        completedAt: '2026-10-28T10:45:00Z',
      }

      vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({ data: mockCompletedSession })

      const session = await trainerWorkoutService.updateSession('usr_member_1', 'sess_101', {
        status: 'Completed',
      })

      expect(session.status).toBe('Completed')
    })
  })
})
