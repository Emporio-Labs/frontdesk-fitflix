import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  nutritionistBookingService,
  NotYourClientError,
} from '@/lib/services/nutritionist-booking.service'
import { doctorService } from '@/lib/services/doctor.service'
import { apiClient } from '@/lib/api-client'

describe('Feature 7: Doctor & Nutritionist Appointments', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Nutritionist Booking Status Normalization', () => {
    it('translates backend ACCEPTED status to Confirmed', async () => {
      apiClient.defaults.adapter = async (config) => {
        return {
          data: {
            bookings: [
              {
                _id: 'nb_1',
                userId: { id: 'u1', name: 'Kavita Singh' },
                status: 'ACCEPTED',
                bookingDate: '2026-11-05',
                startTime: '10:00',
                endTime: '10:30',
              },
            ],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }

      const res = await nutritionistBookingService.getAll()
      expect(res.bookings.length).toBe(1)
      expect(res.bookings[0].bookingStatus).toBe('Confirmed')
      expect(res.bookings[0].appointmentDate).toBe('2026-11-05')
    })

    it('translates backend RESCHEDULE_REQUIRED to RescheduleRequired', async () => {
      apiClient.defaults.adapter = async (config) => {
        return {
          data: {
            bookings: [
              {
                _id: 'nb_2',
                status: 'RESCHEDULE_REQUIRED',
                bookingDate: '2026-11-06',
              },
            ],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }

      const res = await nutritionistBookingService.getAll()
      expect(res.bookings[0].bookingStatus).toBe('RescheduleRequired')
    })
  })

  describe('Nutritionist Client Ownership Guard (FX-06.3)', () => {
    it('throws NotYourClientError when accessing unassigned client profile (403)', async () => {
      apiClient.defaults.adapter = async (config) => {
        const error: any = new Error('Forbidden')
        error.config = config
        error.response = { status: 403, data: { message: 'Not assigned to you' } }
        throw error
      }

      await expect(
        nutritionistBookingService.getMyClientById('usr_unassigned')
      ).rejects.toThrow(NotYourClientError)
    })
  })

  describe('Doctor API Route Gaps (Missing Backend Contract)', () => {
    it('fails when calling /doctors because backend route is not registered', async () => {
      apiClient.defaults.adapter = async (config) => {
        const error: any = new Error('Request failed with status code 404')
        error.config = config
        error.response = { status: 404, data: { message: 'Cannot GET /doctors' } }
        throw error
      }

      await expect(doctorService.getAll()).rejects.toThrow()
    })
  })

  describe('Nutritionist Booking Status Transitions', () => {
    it('calls accept endpoint and returns confirmed booking', async () => {
      let sentUrl = ''

      apiClient.defaults.adapter = async (config) => {
        sentUrl = config.url || ''
        return {
          data: {
            message: 'Booking accepted',
            booking: { _id: 'nb_1', status: 'ACCEPTED' },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }

      const res = await nutritionistBookingService.accept('nb_1')
      expect(sentUrl).toBe('/nutritionist/bookings/nb_1/accept')
      expect(res.booking.bookingStatus).toBe('Confirmed')
    })
  })
})
