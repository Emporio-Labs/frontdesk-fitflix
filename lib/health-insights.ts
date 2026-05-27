export type Numeric = number | string | undefined | null

export function toNumberSafe(v: Numeric): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function computeBmi(height: Numeric, weight: Numeric): number | null {
  const h = toNumberSafe(height)
  const w = toNumberSafe(weight)
  if (h === null || w === null) return null
  const meters = h / 100
  return Number((w / (meters * meters)).toFixed(1))
}

export function getBmiCategory(bmi: number | null): string | null {
  if (bmi === null) return null
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Overweight'
  return 'Obese'
}

export function computeWaterIntakeLiters(weight: Numeric): number | null {
  const w = toNumberSafe(weight)
  if (w === null) return null
  return Number((w * 0.035).toFixed(1))
}

export function computeProteinGoalGrams(weight: Numeric): number | null {
  const w = toNumberSafe(weight)
  if (w === null) return null
  return Math.round(w * 1.6)
}

export function getSleepQuality(hours: Numeric): string | null {
  const h = toNumberSafe(hours)
  if (h === null) return null
  if (h < 5) return 'Poor'
  if (h < 7) return 'Low'
  if (h <= 9) return 'Healthy'
  return 'Excessive'
}

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

export function formatHealthMarkerTimestamp(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return TIMESTAMP_FORMATTER.format(d)
}
