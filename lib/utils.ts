import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ChangeEvent } from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strips non-digits and leading zeros from a number input, rewriting the box
// itself (React skips the DOM rewrite when the parsed number is unchanged,
// e.g. "030" vs 30, so the stray zero would stay visible). Returns the
// cleaned string, '' when empty.
export function sanitizeIntInput(e: ChangeEvent<HTMLInputElement>): string {
  const digits = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (e.target.value !== digits) e.target.value = digits
  return digits
}

// Same, but allows one decimal point ("0.5" is kept; "030.5" becomes "30.5").
export function sanitizeDecimalInput(e: ChangeEvent<HTMLInputElement>): string {
  const cleaned = e.target.value.replace(/[^\d.]/g, '').replace(/^0+(?=\d)/, '')
  if (e.target.value !== cleaned) e.target.value = cleaned
  return cleaned
}

// Reads a non-negative integer from a number input via sanitizeIntInput.
// Returns 0 for an empty field — render with `value={x || ''}` so a cleared
// field stays visually empty.
export function intFromInput(e: ChangeEvent<HTMLInputElement>): number {
  const digits = sanitizeIntInput(e)
  return digits === '' ? 0 : Number.parseInt(digits, 10)
}

export function toUtcDateKey(value?: string | Date | null): string | null {
  if (!value) return null

  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().slice(0, 10)
}
