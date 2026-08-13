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
  // Absolute instants computed server-side (Asia/Kolkata) — prefer these over
  // sessionDate+startTime/endTime, which are wall-clock strings that drift by
  // the timezone offset if reconstructed with the browser's local Date().
  startsAtUtc: string | null
  endsAtUtc: string | null
  deliveryType: string
  capacity: number
  currentBookings: number
  remainingCapacity: number
  status: 'SCHEDULED' | 'FULL' | 'CANCELLED' | 'COMPLETED'
  // Room lifecycle, distinct from `status`: a session can be SCHEDULED with
  // roomStatus READY (room provisioned, nobody's ended the class yet) or
  // COMPLETED with roomStatus EXPIRED (the T+30 sweep tore it down).
  roomStatus: 'PENDING' | 'READY' | 'EXPIRED' | null
  roomExpiresAt: string | null
  streamRoomId: string
  videoConferenceId: string
  creditCost: number
  durationMinutes: number
  hostLiveAt: string | null
}

export interface ZegoSessionToken {
  token: string
  appID: number
  roomId: string
  userId: string
  userName: string
  role: 'host' | 'member'
  expiresAt: string
  roomOpensAt: string
  sessionEndsAt: string
  windowClosesAt: string
}

export interface EndSessionResult {
  message: string
  attendanceMarked: number
  kicked: string[]
  kickErrors: Array<{ userIds: string[]; message: string }>
}

function normalizeLiveSession(raw: any): LiveSession {
  const c = raw.classId || {}
  const duration = c.durationMinutes || 60

  // `status` now comes from the server as-is: the lifecycle sweep flips
  // SCHEDULED -> COMPLETED itself at (end + SESSION_ROOM_EXPIRY_MINUTES), so
  // guessing it client-side off a locally-reconstructed end time is no longer
  // needed — and was wrong by up to the expiry grace while the host was
  // legitimately still running over.
  const status = raw.status || 'SCHEDULED'

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
    startsAtUtc: raw.startsAtUtc || null,
    endsAtUtc: raw.endsAtUtc || null,
    deliveryType: raw.deliveryType || '',
    capacity: raw.capacity || 0,
    currentBookings: raw.currentBookings || 0,
    remainingCapacity: raw.remainingCapacity || 0,
    status: status,
    roomStatus: raw.roomStatus || null,
    roomExpiresAt: raw.roomExpiresAt || null,
    streamRoomId: raw.streamRoomId || c.streamRoomId || '',
    videoConferenceId: raw.videoConferenceId || '',
    creditCost: c.creditCost || 0,
    durationMinutes: duration,
    hostLiveAt: raw.hostLiveAt || null,
  }
}

export const liveSessionService = {
  // `includeOffline` keeps OFFLINE occurrences in the result. The default stays
  // ONLINE/HYBRID-only because the Live Sessions panel is explicitly an
  // online-sessions view; callers that reason about every class's schedule
  // (e.g. the Group Classes "Completed" tab) opt in.
  async getAll(filters?: { date?: string; status?: string; trainerId?: string; includeOffline?: boolean }) {
    const params = new URLSearchParams()
    if (filters?.date) params.append('date', filters.date)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.trainerId) params.append('trainerId', filters.trainerId)

    const res = await apiClient.get(`/api/v1/admin/classes/schedule?${params.toString()}`)

    let sessions = (res.data?.sessions || []).map(normalizeLiveSession)

    // Filter to ONLINE or HYBRID
    if (!filters?.includeOffline) {
      sessions = sessions.filter((s: LiveSession) =>
        s.deliveryType === 'ONLINE' || s.deliveryType === 'HYBRID'
      )
    }

    // Sort by sessionDate and startTime
    sessions.sort((a: LiveSession, b: LiveSession) => {
      const dateA = new Date(`${a.sessionDate.split('T')[0]}T${a.startTime}`)
      const dateB = new Date(`${b.sessionDate.split('T')[0]}T${b.startTime}`)
      return dateA.getTime() - dateB.getTime()
    })

    return { sessions }
  },

  // Room-bound, role-scoped, time-windowed — replaces the old client-side
  // generateKitTokenForTest/local /api/zego-token mint, neither of which
  // checked who was asking or which room they were allowed into.
  async getToken(sessionId: string): Promise<ZegoSessionToken> {
    const res = await apiClient.post(`/api/v1/zego/sessions/${sessionId}/token`)
    return res.data
  },

  // Host-only heartbeat: called when host client successfully joins Zego room
  async reportHostPresence(sessionId: string): Promise<{ hostLiveAt: string }> {
    const res = await apiClient.post(`/api/v1/zego/sessions/${sessionId}/host-presence`)
    return res.data
  },

  // Ending a session now has side effects (attendance backfill, best-effort
  // Zego kick) that a blind status PATCH doesn't perform — the backend
  // rejects `PATCH .../schedule/:id { status: 'COMPLETED' }` for this reason.
  async endSession(id: string): Promise<EndSessionResult> {
    const res = await apiClient.post(`/api/v1/zego/sessions/${id}/end`)
    return res.data
  }
}
