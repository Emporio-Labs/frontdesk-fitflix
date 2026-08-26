export interface PopulatedUserRef {
  _id: string
  username?: string
  email?: string
  phone?: string
}

export interface PopulatedServiceRef {
  _id: string
  serviceName?: string
  serviceTime?: number
  creditCost?: number
}

export interface PopulatedSlotRef {
  _id: string
  date?: string
  startTime?: string
  endTime?: string
  isDaily?: boolean
}

export interface PopulatedDoctorRef {
  _id: string
  doctorName?: string
  email?: string
  phone?: string
}

export interface PopulatedReportRef {
  _id: string
  reportName?: string
  reportType?: string
  reportUrl?: string | null
}

export interface PopulatedClassRef {
  _id: string
  name?: string
  instructor?: string
  mode?: string
  sessionType?: string
  creditCost?: number
}

export function getUserDisplayName(
  ref: PopulatedUserRef | null | undefined,
  fallback = 'Unknown User',
): string {
  if (!ref) return fallback
  return ref.username || ref.email || ref._id || fallback
}

export function getDoctorDisplayName(
  ref: PopulatedDoctorRef | null | undefined,
  fallback = 'Unknown Doctor',
): string {
  if (!ref) return fallback
  return ref.doctorName || ref._id || fallback
}

export function getServiceDisplayName(
  ref: PopulatedServiceRef | null | undefined,
  fallback = 'Unknown Service',
): string {
  if (!ref) return fallback
  return ref.serviceName || ref._id || fallback
}

export function getBookingServiceName(
  booking:
    | {
        service?: PopulatedServiceRef | null
        classId?: PopulatedClassRef | string | null
        [key: string]: any
      }
    | null
    | undefined,
  classMap?: Map<string, string>,
  serviceMap?: Map<string, string>,
  fallback = 'Unknown Service',
): string {
  if (!booking) return fallback

  // 1. Populated classId object (Group Classes & Live Streams: In-Person / Online / Hybrid)
  if (typeof booking.classId === 'object' && booking.classId?.name) {
    return booking.classId.name
  }

  // 2. Populated service object (1-on-1 Services & Therapies)
  if (booking.service?.serviceName) {
    return booking.service.serviceName
  }

  // 3. Class ID lookup from loaded group classes map
  if (typeof booking.classId === 'string' && classMap?.has(booking.classId)) {
    return classMap.get(booking.classId)!
  }
  if (typeof booking.classId === 'object' && booking.classId?._id && classMap?.has(booking.classId._id)) {
    return classMap.get(booking.classId._id)!
  }

  // 4. Service ID lookup from loaded services/therapies map
  if (booking.service?._id && serviceMap?.has(booking.service._id)) {
    return serviceMap.get(booking.service._id)!
  }
  if (typeof booking.service === 'string' && serviceMap?.has(booking.service)) {
    return serviceMap.get(booking.service)!
  }

  // 5. Check populated sessionId object title/name
  if (typeof booking.sessionId === 'object' && (booking.sessionId?.title || booking.sessionId?.name || booking.sessionId?.sessionName)) {
    return booking.sessionId.title || booking.sessionId.name || booking.sessionId.sessionName
  }

  // 6. Direct title/name
  if (typeof booking.name === 'string' && booking.name) return booking.name
  if (typeof booking.title === 'string' && booking.title) return booking.title

  return fallback
}

export function getBookingTimeSlotLabel(
  booking:
    | {
        startTime?: string
        endTime?: string
        slot?: PopulatedSlotRef | null
        sessionId?: { startTime?: string; endTime?: string; [key: string]: any } | null
        [key: string]: any
      }
    | null
    | undefined,
  slotMap?: Map<string, any>,
  fallback = '—',
): string {
  if (!booking) return fallback

  // 1. Direct startTime and endTime on booking document
  if (booking.startTime && booking.endTime) {
    return `${booking.startTime} – ${booking.endTime}`
  }
  if (booking.startTime) return booking.startTime

  // 2. Populated slot on booking
  if (booking.slot?.startTime && booking.slot?.endTime) {
    return `${booking.slot.startTime} – ${booking.slot.endTime}`
  }
  if (booking.slot?.startTime) return booking.slot.startTime

  // 3. Populated sessionId
  if (typeof booking.sessionId === 'object' && booking.sessionId?.startTime && booking.sessionId?.endTime) {
    return `${booking.sessionId.startTime} – ${booking.sessionId.endTime}`
  }
  if (typeof booking.sessionId === 'object' && booking.sessionId?.startTime) {
    return booking.sessionId.startTime
  }

  // 4. Slot ID lookup
  if (booking.slot?._id && slotMap?.has(booking.slot._id)) {
    const val = slotMap.get(booking.slot._id)
    if (typeof val === 'string') return val
    if (val && typeof val === 'object' && val.startTime && val.endTime) {
      return `${val.startTime} – ${val.endTime}`
    }
    if (val && typeof val === 'object' && val.startTime) return val.startTime
  }

  return fallback
}

export function formatSlotRefLabel(
  ref: PopulatedSlotRef | null | undefined,
  fallback = '—',
): string {
  if (!ref) return fallback
  if (ref.startTime && ref.endTime) return `${ref.startTime} – ${ref.endTime}`
  return ref.startTime || fallback
}
