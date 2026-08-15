import { apiClient } from '@/lib/api-client'

export interface OperatingHours {
  dayOfWeek: number // 0 = Sunday … 6 = Saturday
  openTime: string
  closeTime: string
  isClosed: boolean
}

export interface GraceGrantLimits {
  frontdeskMaxPerGrant: number
  frontdeskMaxPerMonth: number
  defaultExpiryDays: number
}

export interface LocationSettings {
  operatingHours?: OperatingHours[]
  taxRatePercent: number
  currency: string
  bookingWindowDays: number
  cancellationWindowHours: number
  pauseMaxDaysPerTerm: number
  slotDurationMinutes: number
  bufferMinutes: number
  graceGrantLimits: GraceGrantLimits
}

export interface LocationAddress {
  line1?: string
  line2?: string
  city?: string
  state?: string
  pincode?: string
  country?: string
}

export interface Location {
  _id: string
  id?: string
  name: string
  code: string
  address?: LocationAddress
  geo?: { lat: number | null; lng: number | null }
  phone?: string
  email?: string
  timezone: string
  isActive: boolean
  settings?: LocationSettings
  createdAt?: string
  updatedAt?: string
}

export interface CreateLocationPayload {
  name: string
  code: string
  address?: LocationAddress
  phone?: string
  email?: string
  timezone?: string
  isActive?: boolean
  settings?: Partial<LocationSettings>
}

export type UpdateLocationPayload = Partial<CreateLocationPayload>

/**
 * The API serialises Mongo documents through applyIdTransform, which deletes
 * `_id` and exposes the `id` virtual instead. The rest of this codebase keys
 * off `_id`, so normalise once here — reading `_id` straight off the response
 * yields undefined, which silently disables dependent queries rather than
 * failing loudly.
 */
const normalizeLocation = (raw: any): Location => ({
  ...raw,
  _id: raw?._id ?? raw?.id ?? '',
  id: raw?.id ?? raw?._id ?? '',
})

export const locationService = {
  getAll: async (includeInactive = false) => {
    const { data } = await apiClient.get('/api/v1/locations', {
      params: includeInactive ? { includeInactive: 'true' } : undefined,
    })
    return {
      locations: (data?.locations ?? []).map(normalizeLocation),
      count: data?.count ?? 0,
    } as { locations: Location[]; count: number }
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get(`/api/v1/locations/${id}`)
    return { location: normalizeLocation(data?.location) }
  },

  create: async (payload: CreateLocationPayload) => {
    const { data } = await apiClient.post('/api/v1/locations', payload)
    return {
      message: data?.message || 'Location created',
      location: normalizeLocation(data?.location),
    }
  },

  update: async (id: string, payload: UpdateLocationPayload) => {
    const { data } = await apiClient.patch(`/api/v1/locations/${id}`, payload)
    return {
      message: data?.message || 'Location updated',
      location: normalizeLocation(data?.location),
    }
  },

  // Deactivates rather than deletes — locations are referenced by bookings,
  // visits and memberships, so removing one would orphan that history.
  deactivate: async (id: string) => {
    const { data } = await apiClient.delete(`/api/v1/locations/${id}`)
    return {
      message: data?.message || 'Location deactivated',
      location: normalizeLocation(data?.location),
    }
  },

  getSettings: async (id: string) => {
    const { data } = await apiClient.get(`/api/v1/locations/${id}/settings`)
    return data as {
      locationId: string
      name: string
      timezone: string
      settings: LocationSettings
    }
  },

  updateSettings: async (id: string, payload: Partial<LocationSettings>) => {
    const { data } = await apiClient.put(`/api/v1/locations/${id}/settings`, payload)
    return data as { message: string; locationId: string; settings: LocationSettings }
  },

  // Settings are per-location, so standing up a new branch means retyping the
  // whole policy block. This clones it from a branch already configured right.
  copySettingsFrom: async (id: string, sourceId: string) => {
    const { data } = await apiClient.post(
      `/api/v1/locations/${id}/settings/copy-from/${sourceId}`
    )
    return data as { message: string; locationId: string; settings: LocationSettings }
  },
}
