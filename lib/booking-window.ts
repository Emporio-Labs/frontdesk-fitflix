// Advisory join-window gating for nutritionist consultation bookings.
//
// The backend (`POST /api/v1/zego/sessions/:id/token`) is the actual
// enforcement point — it derives the window from `bookingDate` + `startTime`/
// `endTime` server-side and rejects with `NOT_OPEN_YET` / `ENDED` /
// `HOST_NOT_STARTED`. This module only decides whether to *show* a Join Call
// button as enabled, so nobody is invited to try a call the backend will
// predictably refuse. It must never be treated as the source of truth.
//
// Timezone trap: the backend stores the booking date at UTC midnight and the
// time-of-day as an `"HH:mm"` *gym wall-clock* string (business timezone,
// currently Asia/Kolkata — see FITFLIX_BACKEND `src/utils/zego-room.ts`).
// Reconstructing with `new Date(dateStr)` + `setHours(...)` resolves in the
// *browser's* local zone, so a non-IST browser computes the wrong instant.
// Prefer an absolute ISO instant from the server whenever one is available
// and treat local reconstruction as a fallback — the same trade-off already
// made in components/live-sessions/live-sessions-panel.tsx (resolveSessionStart).

export interface BookingWindowSource {
  // Absolute instants, if the backend has already computed them for us
  // (e.g. off a minted Zego token or a denial response body).
  startsAtUtc?: string | null
  endsAtUtc?: string | null
  roomOpensAt?: string | null
  sessionEndsAt?: string | null
  windowClosesAt?: string | null
  // Date-only anchor — bookings across this codebase spell it differently.
  bookingDate?: string | null
  appointmentDate?: string | null
  date?: string | null
  // Wall-clock "HH:mm" pair.
  startTime?: string | null
  endTime?: string | null
  // Or a combined "09:00 – 10:00" / "09:00" display string as a last resort.
  timeSlot?: string | null
  appointmentStart?: string | null
}

export interface BookingWindow {
  startsAt: Date
  endsAt: Date
}

// The backend does not currently grant any host lead time or overrun grace
// for nutritionist bookings — session-access.service.ts uses the raw
// startsAt/endsAt, unlike buildJoinWindow (30 min lead / grace) for group
// classes. Keep this at 0 so the UI's gating matches the server's exactly;
// bump it the moment the backend adopts a lead/grace window for this
// booking type — that's the only change needed on this side.
export const HOST_LEAD_MINUTES = 0

function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function parseWallClock(time: string | null | undefined): { hours: number; minutes: number } | null {
  if (!time) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes }
}

function combineDateAndTime(dateValue: string | null | undefined, time: string | null | undefined): Date | null {
  if (!dateValue) return null
  const base = new Date(dateValue)
  if (Number.isNaN(base.getTime())) return null
  const parsed = parseWallClock(time)
  if (!parsed) return null
  const d = new Date(base)
  d.setHours(parsed.hours, parsed.minutes, 0, 0)
  return d
}

// "09:00 – 10:00" (or "-"/"—") -> ["09:00", "10:00" | null]; "09:00" -> ["09:00", null]
function splitTimeSlot(slot: string | null | undefined): [string | null, string | null] {
  if (!slot) return [null, null]
  const parts = slot.split(/[–\-—]/).map((p) => p.trim())
  return [parts[0] || null, parts[1] || null]
}

/**
 * Resolves the join window for a booking-shaped object. Returns null when
 * there isn't enough information to compute one — callers should treat that
 * as "unknown", not "closed": the backend still enforces the real window
 * regardless of what the UI could figure out.
 */
export function resolveBookingWindow(source: BookingWindowSource | null | undefined): BookingWindow | null {
  if (!source) return null

  const absoluteStart = parseIso(source.startsAtUtc) || parseIso(source.roomOpensAt)
  const absoluteEnd =
    parseIso(source.endsAtUtc) || parseIso(source.sessionEndsAt) || parseIso(source.windowClosesAt)

  if (absoluteStart && absoluteEnd) return { startsAt: absoluteStart, endsAt: absoluteEnd }

  const dateAnchor = source.bookingDate ?? source.appointmentDate ?? source.date ?? null
  const [slotStart, slotEnd] = splitTimeSlot(source.timeSlot)
  const startTime = source.startTime ?? slotStart ?? source.appointmentStart ?? null
  const endTime = source.endTime ?? slotEnd ?? null

  const startsAt = absoluteStart ?? combineDateAndTime(dateAnchor, startTime)
  const endsAt = absoluteEnd ?? combineDateAndTime(dateAnchor, endTime)

  if (!startsAt || !endsAt) return null
  return { startsAt, endsAt }
}

export type BookingJoinState = 'unknown' | 'too_early' | 'open' | 'ended'

export interface BookingJoinStatus {
  state: BookingJoinState
  label: string | null
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export interface BookingJoinStateOptions {
  leadMinutes?: number
  graceMinutes?: number
}

/**
 * Advisory-only join status for a booking. `unknown` (not enough data to
 * compute a window) is never treated as disallowed — some call sites in this
 * codebase only have a date, no time-of-day — the backend token endpoint
 * remains the real gate either way.
 */
export function getBookingJoinState(
  source: BookingWindowSource | null | undefined,
  now: Date = new Date(),
  options: BookingJoinStateOptions = {},
): BookingJoinStatus {
  const window = resolveBookingWindow(source)
  if (!window) return { state: 'unknown', label: null }

  const leadMinutes = options.leadMinutes ?? HOST_LEAD_MINUTES
  const graceMinutes = options.graceMinutes ?? 0

  const opensAt = new Date(window.startsAt.getTime() - leadMinutes * 60_000)
  const closesAt = new Date(window.endsAt.getTime() + graceMinutes * 60_000)

  if (now.getTime() < opensAt.getTime()) {
    return { state: 'too_early', label: `Opens ${formatClock(opensAt)}` }
  }
  if (now.getTime() >= closesAt.getTime()) {
    return { state: 'ended', label: `Ended ${formatClock(closesAt)}` }
  }
  return { state: 'open', label: null }
}
