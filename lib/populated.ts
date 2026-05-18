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

export function formatSlotRefLabel(
  ref: PopulatedSlotRef | null | undefined,
  fallback = '—',
): string {
  if (!ref) return fallback
  if (ref.startTime && ref.endTime) return `${ref.startTime} – ${ref.endTime}`
  return ref.startTime || fallback
}
