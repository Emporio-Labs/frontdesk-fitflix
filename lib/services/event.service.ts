import { apiClient } from '@/lib/api-client'

export interface EventVenue {
  name: string
  address: string
  city: string
  landmark?: string
  googleMapsUrl?: string
  locationId?: string
}

export interface TicketTier {
  tierId: string
  name: string
  badgeLabel: string
  badgeColor: string
  type: 'free' | 'rsvp' | 'paid'
  price: number
  creditCost?: number
  totalQuantity: number
  soldQuantity?: number
  validFrom?: string
  validUntil?: string
  perks: string[]
  maxTicketsPerUser?: number
}

export interface Collaborator {
  name: string
  role: string
  logoUrl: string
  websiteUrl?: string
}

export interface Sponsor {
  name: string
  logoUrl: string
  tier: string
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
  ticketTiers?: TicketTier[]
  collaborators?: Collaborator[]
  sponsors?: Sponsor[]
}

export interface FitflixEvent {
  id: string
  _id?: string
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
  ticketTiers?: TicketTier[]
  collaborators?: Collaborator[]
  sponsors?: Sponsor[]
  createdAt: string
  updatedAt: string
}

export async function createEvent(payload: CreateEventPayload): Promise<{ message: string; event: FitflixEvent }> {
  const response = await apiClient.post<{ message: string; event: FitflixEvent }>('/events', payload)
  return response.data
}

export async function getEvents(status?: string): Promise<FitflixEvent[]> {
  try {
    const params = status && status !== 'all' ? { status } : {}
    const response = await apiClient.get<{ events?: FitflixEvent[]; data?: FitflixEvent[] }>('/events', { params })
    return response.data.events || response.data.data || []
  } catch {
    return []
  }
}

export async function getEventById(id: string): Promise<FitflixEvent> {
  const response = await apiClient.get<{ event: FitflixEvent }>(`/events/${id}`)
  return response.data.event
}

export async function updateEvent(id: string, payload: Partial<CreateEventPayload>): Promise<FitflixEvent> {
  const response = await apiClient.patch<{ message: string; event: FitflixEvent }>(`/events/${id}`, payload)
  return response.data.event
}

export async function deleteEvent(id: string): Promise<void> {
  await apiClient.delete(`/events/${id}`)
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

export interface RegisterEventPayload {
  tierId: string
  attendeeName: string
  attendeeEmail: string
  attendeePhone: string
  answers?: Record<string, string>
  paymentReference?: string
}

export interface EventRegistration {
  id: string
  _id?: string
  ticketId: string
  tierId: string
  tierName: string
  attendeeName: string
  attendeeEmail: string
  attendeePhone: string
  paymentStatus: string
  amountPaid: number
  verificationToken: string
  checkedIn?: boolean
  checkedInAt?: string
  createdAt: string
}

export interface RegisterEventResponse {
  message: string
  registration: EventRegistration
  event: {
    id: string
    title: string
    slug: string
    startDate: string
    reportingTime: string
    venue: EventVenue
    coverImageUrl?: string
  }
}

export async function getPublicEvent(slug: string): Promise<FitflixEvent> {
  const response = await apiClient.get<{ event: FitflixEvent }>(`/events/public/${slug}`)
  return response.data.event
}

export async function registerForEvent(slug: string, payload: RegisterEventPayload): Promise<RegisterEventResponse> {
  const response = await apiClient.post<RegisterEventResponse>(`/events/${slug}/register`, payload)
  return response.data
}

export async function getEventRegistrations(
  id: string,
  params?: { checkedIn?: boolean; tierId?: string; search?: string }
): Promise<{ total: number; registrations: EventRegistration[] }> {
  const response = await apiClient.get<{ total: number; registrations: EventRegistration[] }>(
    `/events/${id}/registrations`,
    { params }
  )
  return response.data
}
