import { describe, it, expect, vi, beforeEach } from 'vitest'
import { workoutPlanService } from '@/lib/services/workout-plan.service'
import { apiClient } from '@/lib/api-client'

describe('Feature 15: Workout Plan Assignment & Calendar Scheduling Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Bulk Assignment & Partial Failure Handling', () => {
    it('successfully assigns a workout plan to multiple members and tracks created list', async () => {
      const mockResult = {
        planId: 'plan_gold_4day',
        startDate: '2026-11-01T00:00:00.000Z',
        created: ['usr_1', 'usr_2'],
        skipped: [],
        failed: [],
      }

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockResult })

      const result = await workoutPlanService.assignUsers('plan_gold_4day', {
        userIds: ['usr_1', 'usr_2'],
        startDate: '2026-11-01',
      })

      expect(result.created).toEqual(['usr_1', 'usr_2'])
      expect(result.failed).toHaveLength(0)
    })

    it('exposes partial failure where some members fail assignment without failing the HTTP response', async () => {
      // Backend returns 200 with partial failures in the failed array
      const mockPartialFailureResult = {
        planId: 'plan_gold_4day',
        startDate: '2026-11-01T00:00:00.000Z',
        created: ['usr_valid_1'],
        skipped: [],
        failed: [
          { userId: 'usr_invalid_2', error: 'User already has an active overlapping plan' },
        ],
      }

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockPartialFailureResult })

      const result = await workoutPlanService.assignUsers('plan_gold_4day', {
        userIds: ['usr_valid_1', 'usr_invalid_2'],
      })

      expect(result.created).toHaveLength(1)
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].error).toContain('overlapping plan')
    })
  })

  describe('Role-Based Access Control on Plan Assignment', () => {
    it('exposes that frontdesk staff is rejected with 403 Forbidden when assigning workout plans', async () => {
      // Backend: workoutPlanRouter.post("/:id/assign", authorize(["admin", "trainer"]), assignUsers);
      // Frontdesk receptionists assisting members at the counter receive 403 Forbidden
      const forbiddenError = {
        response: {
          status: 403,
          data: { message: 'Forbidden: Insufficient permissions for role frontdesk' },
        },
      }

      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(forbiddenError)

      await expect(
        workoutPlanService.assignUsers('plan_gold_4day', {
          userIds: ['usr_walkin_member'],
        })
      ).rejects.toMatchObject({
        response: { status: 403 },
      })
    })
  })

  describe('Schedule Re-assignment & Batch Updates', () => {
    it('submits batch schedule updates to shift training days', async () => {
      const mockScheduleResponse = {
        assignmentId: 'assign_123',
        schedule: [
          {
            date: '2026-11-03',
            dayNumber: 1,
            dayName: 'Upper Body',
            isRestDay: false,
            status: 'pending',
          },
        ],
      }

      vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({ data: mockScheduleResponse })

      const result = await workoutPlanService.batchUpdateSchedule('assign_123', {
        updates: [{ dayNumber: 1, newScheduledDate: '2026-11-03' }],
      })

      expect(result.assignmentId).toBe('assign_123')
      expect(result.schedule[0].date).toBe('2026-11-03')
    })
  })
})
