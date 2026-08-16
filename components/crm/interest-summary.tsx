'use client'

import { useMemo } from 'react'
import { IconActivity } from '@tabler/icons-react'
import { useInterestSummary } from '@/hooks/use-activity'
import { useGroupClasses } from '@/hooks/use-group-classes'
import { useMembershipPlans } from '@/hooks/use-membership-plans'
import { useTherapies } from '@/hooks/use-therapies'

/**
 * What this person has been doing in the app, shown to whoever is about to
 * ring them.
 *
 * The point is to replace "hi, are you interested in a membership?" with "I
 * saw you were looking at cryotherapy" — so it leads with the services they
 * viewed, not with a count of events.
 *
 * Renders nothing at all unless there is something to say. A lead with no
 * linked app account, no consent, or no activity yet is the common case, and
 * an empty panel taking up space above the phone number would train people to
 * scroll past the whole area.
 */

const relativeTime = (iso: string | null): string => {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/** 'therapy' -> 'Recovery', so the label matches what staff call it. */
const typeLabel = (type: string): string => {
  switch (type) {
    case 'therapy':
      return 'Recovery'
    case 'class':
      return 'Class'
    case 'plan':
      return 'Plan'
    default:
      return type || 'Item'
  }
}

export function InterestSummary({ userId }: { userId?: string | null }) {
  const { data, isLoading } = useInterestSummary(userId)

  // The summary carries type + id only, so the names come from the catalogues
  // the admin already has cached. Worth the lookup: "Cryotherapy ×3" is a
  // thing to open a call with, "Recovery ×3" is not.
  const { data: therapies } = useTherapies()
  const { data: classes } = useGroupClasses()
  const { data: plans } = useMembershipPlans()

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of therapies ?? []) map.set(`therapy:${t.id}`, t.name)
    for (const c of classes ?? []) map.set(`class:${c.id}`, c.name)
    for (const p of plans ?? []) map.set(`plan:${p.id}`, p.planName)
    return map
  }, [therapies, classes, plans])

  // Silent while loading: this sits above the fields someone came here to
  // read, and a skeleton that resolves to nothing is worse than nothing.
  if (!userId || isLoading || !data) return null
  if (data.eventCount === 0) return null

  const signals: string[] = []
  if (data.planViews > 0) {
    signals.push(`Viewed plans ${data.planViews}×`)
  }
  if (data.consultTaps > 0) {
    signals.push(`Tapped "talk to us" ${data.consultTaps}×`)
  }
  if (data.mtmJoins > 0) {
    signals.push(`Joined the live session ${data.mtmJoins}×`)
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div className="flex items-center gap-1.5">
        <IconActivity className="h-4 w-4 shrink-0 text-blue-700" />
        <p className="text-sm font-semibold text-blue-900">In the app</p>
        {data.lastActiveAt && (
          <span className="ml-auto text-xs text-blue-700">
            active {relativeTime(data.lastActiveAt)}
          </span>
        )}
      </div>

      {data.topInterests.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {data.topInterests.map((item) => {
            const key = `${item.type}:${item.id}`
            // Fall back to the category when the catalogue has not loaded, or
            // when the thing was deleted after it was viewed.
            const label = nameById.get(key) ?? typeLabel(item.type)
            return (
              <span
                key={key}
                className="rounded-full bg-white px-2 py-0.5 text-xs text-blue-900 ring-1 ring-blue-200"
              >
                {label}
                {item.count > 1 && ` ×${item.count}`}
              </span>
            )
          })}
        </div>
      )}

      {signals.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {signals.map((signal) => (
            <li key={signal} className="text-xs text-blue-800">
              {signal}
            </li>
          ))}
        </ul>
      )}

      {/* Named so nobody mistakes this for a full picture: it is only what the
          person agreed to share, and only within the retention window. */}
      <p className="mt-2 text-[11px] text-blue-700/80">
        Shared with consent · last 180 days
      </p>
    </div>
  )
}
