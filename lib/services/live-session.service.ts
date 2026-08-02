import { apiClient } from '@/lib/api-client'

export interface LiveSession {
  id: string
  classId: string
  className: string
  sessionType: 'group_class' | 'live_stream' | ''
  instructor: string
  instructorUserId: string | null
  sessionDate: string
  startTime: string
  endTime: string
  deliveryType: string
  capacity: number
  currentBookings: number
  remainingCapacity: number
  status: 'SCHEDULED' | 'FULL' | 'CANCELLED' | 'COMPLETED'
  streamRoomId: string
  videoConferenceId: string
  creditCost: number
  durationMinutes: number
}

function normalizeLiveSession(raw: any): LiveSession {
  const c = raw.classId || {}
  return {
    id: raw._id,
    classId: c._id || '',
    className: c.name || '',
    sessionType: c.sessionType || '',
    instructor: c.instructor || '',
    instructorUserId: c.instructorUserId || null,
    sessionDate: raw.sessionDate,
    startTime: raw.startTime,
    endTime: raw.endTime,
    deliveryType: raw.deliveryType || '',
    capacity: raw.capacity || 0,
    currentBookings: raw.currentBookings || 0,
    remainingCapacity: raw.remainingCapacity || 0,
    status: raw.status || 'SCHEDULED',
    streamRoomId: raw.streamRoomId || c.streamRoomId || '',
    videoConferenceId: raw.videoConferenceId || '',
    creditCost: c.creditCost || 0,
    durationMinutes: c.durationMinutes || 0
  }
}

export const liveSessionService = {
  async getAll(filters?: { date?: string; status?: string; trainerId?: string }) {
    const params = new URLSearchParams()
    if (filters?.date) params.append('date', filters.date)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.trainerId) params.append('trainerId', filters.trainerId)

    const res = await apiClient.get(`/api/v1/admin/classes/schedule?${params.toString()}`)
    
    let sessions = (res.data?.sessions || []).map(normalizeLiveSession)
    
    // Filter to ONLINE or HYBRID
    sessions = sessions.filter((s: LiveSession) => 
      s.deliveryType === 'ONLINE' || s.deliveryType === 'HYBRID'
    )
    
    // Sort by sessionDate and startTime
    sessions.sort((a: LiveSession, b: LiveSession) => {
      const dateA = new Date(`${a.sessionDate.split('T')[0]}T${a.startTime}`)
      const dateB = new Date(`${b.sessionDate.split('T')[0]}T${b.startTime}`)
      return dateA.getTime() - dateB.getTime()
    })

    return { sessions }
  },

  async endSession(id: string) {
    const res = await apiClient.patch(`/api/v1/admin/classes/schedule/${id}`, { status: 'COMPLETED' })
    return res.data
  }
}
