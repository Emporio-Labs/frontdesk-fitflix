import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toUtcDateKey(value?: string | Date | null): string | null {
  if (!value) return null

  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().slice(0, 10)
}

/** `yyyy-MM-dd` for the viewer's *local* calendar day.
 *
 * `new Date().toISOString().slice(0, 10)` is the UTC day, which is the previous
 * day for any timezone ahead of UTC between midnight and the offset (00:00–05:30
 * in IST). Nutrition logs are bucketed by the member's local calendar day, so
 * day-scoped nutrition queries must use this, not toISOString(). */
export function getTodayDateKey(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
