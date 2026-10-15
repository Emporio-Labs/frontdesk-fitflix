import type { MemberAssignment } from '@/lib/services/trainer-workout.service'

const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** scheduledDate is stored as UTC midnight of the calendar day. */
export const scheduledIso = (value: string) => value.slice(0, 10)

export const formatScheduledDay = (value: string) =>
  new Date(`${scheduledIso(value)}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

/** The backend matches both "active" and legacy "Active". */
export const isActiveAssignment = (a?: MemberAssignment | null): a is MemberAssignment =>
  a?.status?.toLowerCase() === 'active'

export function summarizeAssignment(assignment: MemberAssignment) {
  const progress = assignment.dayProgress ?? []
  const nameOf = (dayNumber: number) =>
    assignment.userDays?.find((d) => d.dayNumber === dayNumber)?.name ?? `Day ${dayNumber}`
  const today = localIso(new Date())
  const todayEntry = progress.find((d) => scheduledIso(d.scheduledDate) === today)
  const next = progress.find((d) => d.status === 'pending')
  return {
    total: progress.length,
    completed: progress.filter((d) => d.status === 'completed').length,
    missed: progress.filter((d) => d.status === 'missed').length,
    today: todayEntry ? { ...todayEntry, name: nameOf(todayEntry.dayNumber) } : null,
    next: next ? { ...next, name: nameOf(next.dayNumber) } : null,
    end: progress.length ? progress[progress.length - 1].scheduledDate : null,
  }
}
