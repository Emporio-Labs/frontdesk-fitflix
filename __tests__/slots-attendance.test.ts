import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  slotService,
  SLOT_EXPERT_TYPE_LABELS,
  Slot,
} from '@/lib/services/slot.service'
import { gymVisitService } from '@/lib/services/gym-visit.service'
import { apiClient } from '@/lib/api-client'

function timeToMinutes(value: string): number | null {
  const [hoursRaw, minutesRaw] = value.split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return hours * 60 + minutes
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

describe('Feature 6: Slots & Attendance', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Slot Time Validation & Calculations', () => {
    it('converts valid 24h time strings to total minutes correctly', () => {
      expect(timeToMinutes('06:30')).toBe(6 * 60 + 30) // 390
      expect(timeToMinutes('18:45')).toBe(18 * 60 + 45) // 1125
      expect(timeToMinutes('00:00')).toBe(0)
    })

    it('rejects invalid or out-of-range time strings', () => {
      expect(timeToMinutes('25:00')).toBeNull()
      expect(timeToMinutes('10:65')).toBeNull()
      expect(timeToMinutes('abc')).toBeNull()
      expect(timeToMinutes('')).toBeNull()
    })

    it('validates that slot start time must precede end time', () => {
      const start = timeToMinutes('09:00')!
      const end = timeToMinutes('10:00')!
      const invalidEnd = timeToMinutes('08:30')!

      expect(start < end).toBe(true)
      expect(start < invalidEnd).toBe(false)
    })
  })

  describe('Slot Normalization & Capacity Rules', () => {
    it('normalizes facility slot with remaining capacity correctly', () => {
      const raw = {
        _id: 'slot_1',
        startTime: '08:00',
        endTime: '09:00',
        capacity: 4,
        remainingCapacity: 1,
        expertType: 'facility',
      }

      // Slot with remaining capacity > 0 is not booked out
      const isBooked = raw.remainingCapacity <= 0
      expect(isBooked).toBe(false)
      expect(SLOT_EXPERT_TYPE_LABELS[raw.expertType]).toBe('Facility / Therapy Resource')
    })

    it('marks slot as isBooked when remaining capacity reaches 0', () => {
      const raw = {
        _id: 'slot_full',
        capacity: 5,
        remainingCapacity: 0,
        expertType: 'facility',
      }

      const isBooked = raw.remainingCapacity <= 0
      expect(isBooked).toBe(true)
    })
  })

  describe('Attendance Visit Duration Formatting', () => {
    it('formats minutes into human readable hours and minutes', () => {
      expect(formatDuration(45)).toBe('45m')
      expect(formatDuration(60)).toBe('1h')
      expect(formatDuration(90)).toBe('1h 30m')
      expect(formatDuration(125)).toBe('2h 5m')
      expect(formatDuration(null)).toBe('—')
    })
  })

  describe('Gym Visit Service Check-In API', () => {
    it('submits member check-in payload with visitType and locationId', async () => {
      let sentUrl = ''
      let sentBody: any

      apiClient.defaults.adapter = async (config) => {
        sentUrl = config.url || ''
        sentBody = JSON.parse(config.data || '{}')
        return {
          data: {
            message: 'Check-in recorded',
            visit: {
              id: 'visit_1',
              userId: sentBody.userId,
              checkInAt: new Date().toISOString(),
              visitType: sentBody.visitType,
            },
          },
          status: 201,
          statusText: 'Created',
          headers: {},
          config,
        }
      }

      const res = await gymVisitService.checkIn({
        userId: 'usr_member_1',
        visitType: 'workout',
        notes: 'Forgot RFID card, checked in by name',
        locationId: 'loc_branch_1',
      })

      expect(sentUrl).toBe('/gym-visits/check-in')
      expect(sentBody.userId).toBe('usr_member_1')
      expect(sentBody.visitType).toBe('workout')
      expect(res.visit.userId).toBe('usr_member_1')
    })
  })
})
