/** "45s", "10 min", "12 min 30s" — how plan targets show a duration. */
export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r === 0 ? `${m} min` : `${m} min ${r}s`
}
