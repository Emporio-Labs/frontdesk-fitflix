import { apiClient } from '@/lib/api-client'

export interface EventVenue {
  name: string
  address: string
  city: string
  landmark?: string
  googleMapsUrl?: string
  locationId?: string
}

export interface CreateEventPayload {
  title: string
  slug?: string
  tagline?: string
  description?: string
  eventType: string
  status?: string
  startDate: string
  endDate: string
  reportingTime: string
  venue: EventVenue
  totalCapacity: number
  coverImageUrl?: string
  badgeWatermarkUrl?: string
}

export interface FitflixEvent {
  id: string
  title: string
  slug: string
  tagline?: string
  description?: string
  eventType: string
  status: string
  startDate: string
  endDate: string
  reportingTime: string
  venue: EventVenue
  totalCapacity: number
  totalRegistered: number
  totalCheckedIn: number
  coverImageUrl?: string
  badgeWatermarkUrl?: string
  createdAt: string
  updatedAt: string
}

export async function createEvent(payload: CreateEventPayload): Promise<{ message: string; event: FitflixEvent }> {
  const response = await apiClient.post<{ message: string; event: FitflixEvent }>('/events', payload)
  return response.data
}

export async function getEvents(): Promise<FitflixEvent[]> {
  try {
    const response = await apiClient.get<{ events?: FitflixEvent[]; data?: FitflixEvent[] }>('/events')
    return response.data.events || response.data.data || []
  } catch {
    return []
  }
}

export async function uploadEventImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)
  const response = await apiClient.post<{ url: string }>('/events/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data.url
}
