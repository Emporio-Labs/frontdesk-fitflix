/**
 * Shared time utilities for front desk scheduling and slot operations.
 */

export function timeToMinutes(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') return null
  const [hoursRaw, minutesRaw] = value.split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return hours * 60 + minutes
}

export function minutesToTime(minutes: number): string {
  const normalized = ((Math.floor(minutes) % 1440) + 1440) % 1440
  const hh = String(Math.floor(normalized / 60)).padStart(2, '0')
  const mm = String(normalized % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} – ${endTime}`
}

export function computeIntervals(
  startMin: number,
  endMin: number,
  slotDurationMin: number,
  bufferMin: number = 0
): Array<{ startMin: number; endMin: number; startTime: string; endTime: string }> {
  const intervals: Array<{ startMin: number; endMin: number; startTime: string; endTime: string }> = []
  if (slotDurationMin <= 0) return intervals

  for (let cursor = startMin; cursor + slotDurationMin <= endMin; cursor += slotDurationMin + bufferMin) {
    const sMin = cursor
    const eMin = cursor + slotDurationMin
    intervals.push({
      startMin: sMin,
      endMin: eMin,
      startTime: minutesToTime(sMin),
      endTime: minutesToTime(eMin),
    })
  }

  return intervals
}
