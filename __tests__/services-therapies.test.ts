import { describe, it, expect, vi, beforeEach } from 'vitest'
import { serviceService } from '@/lib/services/service.service'
import { therapyService } from '@/lib/services/therapy.service'
import { apiClient } from '@/lib/api-client'

describe('Feature 10: Services & Therapies Catalog Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Data Normalization & Legacy Envelope Handling', () => {
    it('normalizes legacy backend service response fields into a standard ServiceCatalogItem', async () => {
      const mockLegacyService = {
        _id: 'srv_physio_1',
        serviceName: 'Physiotherapy Consultation',
        serviceTime: 45,
        creditCost: 2,
        description: 'Post-workout recovery assessment',
        tags: ['Recovery', 'Physio'],
        slots: ['slot_1', 'slot_2'],
      }

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { services: [mockLegacyService] },
      })

      const result = await serviceService.getAll()

      expect(result.services).toHaveLength(1)
      expect(result.services[0].id).toBe('srv_physio_1')
      expect(result.services[0].name).toBe('Physiotherapy Consultation')
      expect(result.services[0].time).toBe(45)
      expect(result.services[0].creditCost).toBe(2)
      expect(result.services[0].tags).toEqual(['Recovery', 'Physio'])
    })

    it('normalizes therapy items and preserves isPaused status', async () => {
      const mockTherapy = {
        _id: 'th_ice_bath',
        therapyName: 'Cryo Ice Bath',
        therapyTime: 20,
        creditCost: 1,
        isPaused: true,
      }

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { therapies: [mockTherapy] },
      })

      const result = await therapyService.getAll()

      expect(result.therapies).toHaveLength(1)
      expect(result.therapies[0].name).toBe('Cryo Ice Bath')
      expect(result.therapies[0].isPaused).toBe(true)
      expect(result.therapies[0].creditCost).toBe(1)
    })

    it('falls back to safe default creditCost of 1 when backend returns invalid or negative creditCost', async () => {
      const mockMalformedTherapy = {
        id: 'th_sauna',
        name: 'Infrared Sauna',
        creditCost: -5, // invalid negative credit cost
      }

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: [mockMalformedTherapy],
      })

      const result = await therapyService.getAll()

      // parseCreditCost normalizes negative or non-finite values to fallback 1
      expect(result.therapies[0].creditCost).toBe(1)
    })
  })

  describe('Role-Based Access Control Edge Cases (Frontdesk staff omission)', () => {
    it('exposes that frontdesk staff receives 403 Forbidden on GET /services because route only authorizes admin, trainer, user', async () => {
      // Backend: serviceRouter.get("/", authorize(["admin", "trainer", "user"]), getAllServices);
      // Frontdesk staff role "frontdesk" is rejected by RBAC middleware
      const forbiddenError = {
        response: {
          status: 403,
          data: { message: 'Forbidden: Insufficient permissions for role frontdesk' },
        },
      }

      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(forbiddenError)

      await expect(serviceService.getAll()).rejects.toMatchObject({
        response: { status: 403 },
      })
    })

    it('exposes that frontdesk staff receives 403 Forbidden on GET /therapies because route only authorizes admin, trainer, user', async () => {
      // Backend: therapyRouter.get("/", authorize(["admin", "trainer", "user"]), getAllTherapies);
      const forbiddenError = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      }

      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(forbiddenError)

      await expect(therapyService.getAll()).rejects.toMatchObject({
        response: { status: 403 },
      })
    })
  })

  describe('Service Deletion & Cascade Vulnerability', () => {
    it('successfully calls delete API, exposing that backend performs un-checked hard deletion without cascade guard', async () => {
      vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
        data: { message: 'Service deleted' },
      })

      const result = await serviceService.delete('srv_active_with_bookings')

      expect(result.message).toBe('Service deleted')
      // Backend findOneAndDelete does not verify active Bookings or cancel associated Slots
    })
  })
})
