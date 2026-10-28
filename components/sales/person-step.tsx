'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { IconAlertTriangle, IconPlus, IconSearch, IconUserPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { usePeopleLookup } from '@/hooks/use-people'
import { phoneKey, type LookupLead, type LookupMember } from '@/lib/services/people.service'
import type { Location } from '@/lib/services/location.service'
import {
  apiErrorMessage,
  formatDay,
  formatINR,
  formatShortDay,
  initials,
  lastCoveredDay,
  renewableMembership,
  toIsoDay,
  todayIso,
} from './sale-utils'

export interface NewPersonDraft {
  name: string
  phone: string
  email: string
}

interface Props {
  locations: Location[]
  onSelectMember: (member: LookupMember, renew: boolean) => void
  onSelectLead: (lead: LookupLead, linkedMember?: LookupMember) => void
  onNewPerson: (draft: NewPersonDraft) => void
  onSaveAsLead: (draft: NewPersonDraft) => void
  savingLead: boolean
}

const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  lost: 'Lost',
}

export function isValidPhone(phone: string) {
  return phone.replace(/\D/g, '').length >= 10
}

export function PersonStep({ locations, onSelectMember, onSelectLead, onNewPerson, onSaveAsLead, savingLead }: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [draft, setDraft] = useState<NewPersonDraft>({ name: '', phone: '', email: '' })

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const lookup = usePeopleLookup(debounced)
  const result = lookup.data
  const searching = debounced.length >= 3
  const locationName = (id?: string) => locations.find((l) => l._id === id)?.name || ''

  const members = result?.members ?? []
  const leads = useMemo(() => (result?.leads ?? []).filter((l) => l.status !== 'converted'), [result])
  const pendingInvoices = result?.pendingInvoices ?? []

  // A member and an open lead on one phone are the same person: selling to
  // either links the lead to the existing account instead of a second one.
  const memberByPhone = useMemo(() => {
    const map = new Map<string, LookupMember>()
    for (const m of members) if (phoneKey(m.phone)) map.set(phoneKey(m.phone), m)
    return map
  }, [members])
  const sharedPhone = leads.some((l) => phoneKey(l.phone) && memberByPhone.has(phoneKey(l.phone)))

  const openNewPerson = () => {
    const digits = query.replace(/\D/g, '')
    setDraft((d) => ({
      name: d.name || (digits.length >= 4 ? '' : query.trim()),
      phone: d.phone || (digits.length >= 4 ? query.trim() : ''),
      email: d.email,
    }))
    setShowNew(true)
  }

  const draftValid = draft.name.trim().length > 1 && isValidPhone(draft.phone)
  const total = members.length + leads.length

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Who is buying?</h1>
        <p className="text-muted-foreground">
          Start with the phone number. We check members and leads in every branch before creating anyone.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sale-person-search">Phone or name</Label>
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="sale-person-search"
            autoFocus
            inputMode="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="98480 14521 or Ananya"
            className="h-12 pl-11 text-lg"
          />
        </div>
        {result?.fallback && (
          <p className="text-xs text-muted-foreground">Searching the member and lead lists on this device; pending invoices are not shown.</p>
        )}
      </div>

      {searching && (
        <div className="flex flex-col gap-3" aria-live="polite">
          {lookup.isLoading ? (
            <>
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </>
          ) : lookup.isError ? (
            <p className="text-sm text-destructive">{apiErrorMessage(lookup.error, 'Search failed. Try again.')}</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {total === 0 ? 'No one found' : `${total} match${total === 1 ? '' : 'es'}`}
              </p>

              {members.map((m) => (
                <MemberRow
                  key={m._id}
                  member={m}
                  homeClub={locationName(m.homeLocationId)}
                  onRenew={() => onSelectMember(m, true)}
                  onSell={() => onSelectMember(m, false)}
                />
              ))}

              {leads.map((l) => (
                <div key={l._id} className="flex flex-wrap items-center gap-4 rounded-xl border p-4">
                  <Avatar name={l.name} muted />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 font-semibold">
                      {l.name}
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        Lead · {STATUS_LABEL[l.status] || l.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[l.phone, locationName(l.locationId), l.interestedIn && `interested in ${l.interestedIn}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {l.pendingInvoiceId && (
                    <Button variant="outline" asChild>
                      <Link href={`/admin/sales/new?invoiceId=${l.pendingInvoiceId}`}>Resume payment</Link>
                    </Button>
                  )}
                  <Button
                    variant={l.pendingInvoiceId ? 'ghost' : 'outline'}
                    onClick={() => onSelectLead(l, memberByPhone.get(phoneKey(l.phone)))}
                  >
                    Sell to this lead
                  </Button>
                </div>
              ))}

              {sharedPhone && (
                <div className="flex gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-100">
                  <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Same phone on a member and a lead. Selling to either links the lead to the member&apos;s account, so no
                    second account is created.
                  </span>
                </div>
              )}

              {pendingInvoices.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Awaiting payment</p>
                  {pendingInvoices
                    .filter((inv) => !leads.some((l) => l.pendingInvoiceId === inv._id))
                    .map((inv) => (
                      <div key={inv._id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
                        <span className="flex-1">
                          Invoice <b>{inv.invoiceNumber || inv._id.slice(-6)}</b> · {formatINR(inv.total)}
                          {locationName(inv.locationId) && ` · ${locationName(inv.locationId)}`}
                        </span>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/sales/new?invoiceId=${inv._id}`}>Resume payment</Link>
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showNew && (
        <fieldset className="grid gap-4 rounded-xl border p-4 sm:grid-cols-3">
          <legend className="px-1 text-sm font-semibold">New person</legend>
          <div className="space-y-1.5">
            <Label htmlFor="new-person-name">Name</Label>
            <Input id="new-person-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-person-phone">Phone</Label>
            <Input
              id="new-person-phone"
              inputMode="tel"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              aria-invalid={draft.phone !== '' && !isValidPhone(draft.phone)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-person-email">
              Email <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="new-person-email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </div>
          {draft.phone && memberByPhone.has(phoneKey(draft.phone)) && (
            <p className="text-sm text-orange-700 sm:col-span-3">This phone already belongs to a member listed above. Sell to them instead.</p>
          )}
        </fieldset>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3 border-t pt-4">
        {!showNew && (
          <Button variant="outline" className="border-dashed" onClick={openNewPerson}>
            <IconPlus className="size-4" />
            Not listed: new person
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="ghost" disabled={!draftValid || savingLead} onClick={() => onSaveAsLead(draft)}>
          {savingLead ? 'Saving…' : 'Save as lead and exit'}
        </Button>
        <Button disabled={!showNew || !draftValid} onClick={() => onNewPerson({ ...draft, name: draft.name.trim(), email: draft.email.trim() })}>
          <IconUserPlus className="size-4" />
          Continue
        </Button>
      </div>
    </div>
  )
}

function Avatar({ name, muted }: { name: string; muted?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={
        muted
          ? 'flex size-11 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground'
          : 'flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary'
      }
    >
      {initials(name)}
    </div>
  )
}

function MemberRow({
  member,
  homeClub,
  onRenew,
  onSell,
}: {
  member: LookupMember
  homeClub: string
  onRenew: () => void
  onSell: () => void
}) {
  const current = renewableMembership(member.currentMembership)
  const lapsed = member.currentMembership && !current ? member.currentMembership : null
  // Stored ends are exclusive: renew on `end`, show the day before as "till".
  const end = toIsoDay(current?.endDate)
  const upcoming = current && toIsoDay(current.startDate) > todayIso()

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border p-4">
      <Avatar name={member.username} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2 font-semibold">
          {member.username}
          <Badge variant="outline" className="border-green-300 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200">
            Member
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {[member.phone, homeClub && `Home club ${homeClub}`].filter(Boolean).join(' · ')}
          {current && (
            <>
              {' · '}
              {current.planName} ·{' '}
              <b className="text-green-700 dark:text-green-400">
                {upcoming ? `Starts ${formatDay(current.startDate)}` : current.status === 'Paused' ? 'Paused' : 'Active'} till{' '}
                {formatDay(lastCoveredDay(end))}
              </b>
            </>
          )}
          {lapsed && ` · ${lapsed.planName} ended ${formatDay(lastCoveredDay(lapsed.endDate))}`}
          {!member.currentMembership && ' · No plan'}
        </p>
      </div>
      {current ? (
        <>
          <Button variant="outline" asChild>
            <Link href="/admin/attendance">Check in instead</Link>
          </Button>
          <Button onClick={onRenew}>Renew from {formatShortDay(end)}</Button>
        </>
      ) : (
        <Button onClick={onSell}>Sell plan</Button>
      )}
    </div>
  )
}
