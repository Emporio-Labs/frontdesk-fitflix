import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trainerWorkoutService } from '@/lib/services/trainer-workout.service'
import { apiClient } from '@/lib/api-client'

describe('Feature 13: Trainer Member Roster & Client Tracking Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('User Assignment Normalization & 404 Handling', () => {
    it('normalizes member workout plan assignment with progress schedule and user days', async () => {
      const mockAssignment = {
        _id: 'assign_123',
        status: 'active',
        startDate: '2026-10-25T00:00:00Z',
        planId: {
          _id: 'plan_gold',
          name: 'Hypertrophy Gold 4-Day',
          goal: 'Hypertrophy',
          splitType: 'UpperLower',
        },
        dayProgress: [
          { dayNumber: 1, scheduledDate: '2026-10-25', status: 'completed' },
          { dayNumber: 2, scheduledDate: '2026-10-26', status: 'pending' },
        ],
        userDays: [
          { dayNumber: 1, name: 'Upper Body', isRestDay: false, exercises: [] },
          { dayNumber: 2, name: 'Lower Body', isRestDay: false, exercises: [] },
        ],
      }

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockAssignment })

      const assignment = await trainerWorkoutService.getUserAssignment('usr_member_1')

      expect(assignment._id).toBe('assign_123')
      expect(assignment.status).toBe('active')
      expect(assignment.planId?.name).toBe('Hypertrophy Gold 4-Day')
      expect(assignment.dayProgress).toHaveLength(2)
      expect(assignment.userDays).toHaveLength(2)
    })

    it('rejects with 404 when member has never been assigned a workout plan', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { error: 'No assignment found for user' },
        },
      }

      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(notFoundError)

      await expect(trainerWorkoutService.getUserAssignment('usr_new_walkin')).rejects.toMatchObject({
        response: { status: 404 },
      })
    })
  })

  describe('Roster Ownership & Relief Trainer Edge Cases', () => {
    it('exposes that relief trainer is rejected with 403 NOT_YOUR_MEMBER when opening colleague client', async () => {
      // Backend: assertTrainerOwnsMember throws TrainerRosterError("NOT_YOUR_MEMBER")
      const rosterError = {
        response: {
          status: 403,
          data: { message: 'This member is not assigned to you' },
        },
      }

      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(rosterError)

      await expect(
        trainerWorkoutService.getActiveSession('usr_colleague_member')
      ).rejects.toMatchObject({
        response: {
          status: 403,
          data: { message: 'This member is not assigned to you' },
        },
      })
    })

    it('successfully starts and stops live workout session overseeing', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: { isOverseen: true } })
      vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({ data: { isOverseen: false } })

      const startResult = await trainerWorkoutService.startOverseeing('usr_member_1')
      expect(startResult.isOverseen).toBe(true)

      const stopResult = await trainerWorkoutService.stopOverseeing('usr_member_1')
      expect(stopResult.isOverseen).toBe(false)
    })
  })
})
