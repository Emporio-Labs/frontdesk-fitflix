'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { IconAlertTriangle } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useMembershipPlansForLocation } from '@/hooks/use-membership-plans'
import type { Location } from '@/lib/services/location.service'
import type { MembershipPlan } from '@/lib/services/membership-plan.service'
import {
  computeTotals,
  formatDay,
  formatINR,
  lastCoveredDay,
  locationOpensOn,
  membershipEndDate,
  renewableMembership,
  taxPercentFor,
  toIsoDay,
  todayIso,
  type SalePerson,
  type SalePlanState,
  type StartMode,
} from './sale-utils'

interface Props {
  person: SalePerson
  plan: SalePlanState
  onChange: (patch: Partial<SalePlanState>) => void
  locations: Location[]
  isSingleLocation: boolean
  onBack: () => void
  onContinue: (plan: MembershipPlan) => void
  onSaveAsLead: (() => void) | null
  savingLead: boolean
}

/** Why the plan step can't continue yet, or null when it can. */
export function planBlocker(
  person: SalePerson,
  plan: SalePlanState,
  selected: MembershipPlan | null,
  needsBranch: boolean
): string | null {
  if (needsBranch && !plan.locationId) return 'Pick the branch'
  if (!selected) return 'Pick a plan'
  if (!plan.startDate) return 'Pick a start date'
  if (plan.startDate < todayIso()) return 'Start date is in the past'
  const totals = computeTotals(selected.totalPrice, plan.discount, 0)
  if (totals.discount > 0 && !plan.discountReason.trim()) return 'Add a reason for the discount'
  if (homeClubMismatch(person, plan) && !plan.homeClubAck) return 'Confirm the branch differs from the home club'
  return null
}

function homeClubMismatch(person: SalePerson, plan: SalePlanState) {
  return person.kind === 'member' && !!person.homeLocationId && !!plan.locationId && person.homeLocationId !== plan.locationId
}

export function PlanStep({
  person,
  plan,
  onChange,
  locations,
  isSingleLocation,
  onBack,
  onContinue,
  onSaveAsLead,
  savingLead,
}: Props) {
  const location = locations.find((l) => l._id === plan.locationId) ?? null
  const plansQuery = useMembershipPlansForLocation(plan.locationId)
  const plans = plansQuery.data ?? []
  const selected = plans.find((p) => p.id === plan.planId) ?? null

  const today = todayIso()
  const opensOn = locationOpensOn(location)
  const current = person.kind === 'member' ? renewableMembership(person.currentMembership) : null
  // The stored end is exclusive, so the next term starts on it, gap-free.
  const afterCurrent = current ? toIsoDay(current.endDate) : ''

  // Drop a plan that isn't sold at the newly picked branch.
  useEffect(() => {
    if (plansQuery.isSuccess && plan.planId && !plans.some((p) => p.id === plan.planId)) {
      onChange({ planId: null })
    }
  }, [plansQuery.isSuccess, plans, plan.planId, onChange])

  // On picking a branch: a presale branch defaults to starting on opening
  // day, and an "opening day" start can't carry over to an open branch.
  const appliedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!location || appliedFor.current === location._id) return
    appliedFor.current = location._id
    if (opensOn && plan.startMode === 'today') onChange({ startMode: 'opening', startDate: opensOn })
    else if (!opensOn && plan.startMode === 'opening') onChange({ startMode: 'today', startDate: today })
  }, [location, opensOn, plan.startMode, today, onChange])

  const chips: { mode: StartMode; label: string; date: string }[] = [
    { mode: 'today', label: 'Today', date: today },
    ...(afterCurrent ? [{ mode: 'after' as const, label: `After current plan ends · ${formatDay(afterCurrent)}`, date: afterCurrent }] : []),
    ...(opensOn ? [{ mode: 'opening' as const, label: `On opening day · ${formatDay(opensOn)}`, date: opensOn }] : []),
  ]

  const totals = computeTotals(selected?.totalPrice ?? 0, plan.discount, taxPercentFor(location))
  const endDate = selected && plan.startDate ? membershipEndDate(plan.startDate, selected) : ''
  const overlapsCurrent = !!current && !!plan.startDate && plan.startDate < afterCurrent
  const mismatch = homeClubMismatch(person, plan)
  const homeClubName = person.kind === 'member' ? locations.find((l) => l._id === person.homeLocationId)?.name : ''
  const blocker = planBlocker(person, plan, selected, !isSingleLocation)

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="flex min-w-0 flex-col gap-6">
        {person.kind === 'lead' && person.pendingInvoiceId && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <span className="flex-1">{person.name} already has an invoice waiting for payment.</span>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/admin/sales/new?invoiceId=${person.pendingInvoiceId}`}>Resume payment</Link>
            </Button>
          </div>
        )}

        {!isSingleLocation && (
          <fieldset className="space-y-2">
            <legend className="pb-2 text-sm font-semibold">Branch the membership belongs to</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {locations.map((l) => {
                const opening = locationOpensOn(l)
                const active = plan.locationId === l._id
                return (
                  <button
                    key={l._id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChange({ locationId: l._id, homeClubAck: false })}
                    className={cn(
                      'min-h-14 rounded-lg border px-3.5 py-2 text-left transition-colors',
                      active ? 'border-2 border-primary bg-primary/5 font-semibold' : 'hover:border-primary/50'
                    )}
                  >
                    {l.name}
                    {opening && (
                      <span className="block text-xs font-medium text-orange-700 dark:text-orange-400">
                        Presale · opens {formatDay(opening)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {!plan.locationId && <p className="text-sm text-muted-foreground">Required while the header shows all branches.</p>}
          </fieldset>
        )}

        {mismatch && (
          <label className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-100">
            <Checkbox
              checked={plan.homeClubAck}
              onCheckedChange={(v) => onChange({ homeClubAck: v === true })}
              className="mt-0.5"
            />
            <span>
              {person.name}&apos;s home club is <b>{homeClubName || 'another branch'}</b>. Sell this plan at{' '}
              <b>{location?.name}</b> anyway.
            </span>
          </label>
        )}

        <fieldset className="space-y-2">
          <legend className="pb-2 text-sm font-semibold">
            Plan{location && !isSingleLocation ? ` · ${location.name} plans` : ''}
          </legend>
          {!plan.locationId ? (
            <p className="text-sm text-muted-foreground">Pick a branch to see its plans.</p>
          ) : plansQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : plansQuery.isError ? (
            <p className="text-sm text-destructive">Couldn&apos;t load plans. Refresh to try again.</p>
          ) : plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active plans for this branch. Add one under{' '}
              <Link href="/admin/membership-plans" className="underline">
                Membership Plans
              </Link>
              .
            </p>
          ) : (
            <div className="grid gap-2" role="radiogroup" aria-label="Plan">
              {plans.map((p) => {
                const active = p.id === plan.planId
                const credits = p.benefits?.credits
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange({ planId: p.id })}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors',
                      active ? 'border-2 border-primary bg-primary/5' : 'hover:border-primary/50'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 font-semibold">
                        {p.planName}
                        {p.isFounding && (
                          <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                            Founding{p.availableUntil ? ` · until ${formatDay(p.availableUntil)}` : ''}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {p.durationDays ? `${p.durationDays} days` : `${p.durationMonths} month${p.durationMonths === 1 ? '' : 's'}`}
                        {credits ? ` · ${credits} credits` : ''}
                      </p>
                    </div>
                    <span className="font-semibold">{formatINR(p.totalPrice)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="pb-2 text-sm font-semibold">Starts</legend>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <ChipButton
                key={c.mode}
                active={plan.startMode === c.mode}
                onClick={() => onChange({ startMode: c.mode, startDate: c.date })}
              >
                {c.label}
              </ChipButton>
            ))}
            <ChipButton active={plan.startMode === 'pick'} onClick={() => onChange({ startMode: 'pick' })}>
              Pick a date…
            </ChipButton>
          </div>
          {plan.startMode === 'pick' && (
            <Input
              type="date"
              aria-label="Start date"
              min={today}
              value={plan.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className="w-48"
            />
          )}
          {overlapsCurrent && (
            <p className="flex items-start gap-1.5 text-sm text-orange-700 dark:text-orange-400">
              <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Overlaps the current {current?.planName} plan, which runs till {formatDay(lastCoveredDay(current?.endDate))}.{' '}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => onChange({ startMode: 'after', startDate: afterCurrent })}
                >
                  Start {formatDay(afterCurrent)} instead
                </button>
              </span>
            </p>
          )}
        </fieldset>
      </div>

      <aside className="flex flex-col gap-3 self-start rounded-xl border bg-muted/40 p-5 text-sm lg:sticky lg:top-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
        <SummaryRow label="For" value={person.name} />
        <SummaryRow label="Branch" value={location?.name || '—'} />
        <SummaryRow label="Plan" value={selected?.planName || '—'} />
        <SummaryRow label="Runs" value={endDate ? `${formatDay(plan.startDate)} → ${formatDay(endDate)}` : '—'} />
        <div className="flex flex-col gap-2 border-t pt-3">
          <SummaryRow label="Price" value={formatINR(totals.price)} plain />
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="sale-discount" className="font-normal text-muted-foreground">
              Discount (₹)
            </Label>
            <Input
              id="sale-discount"
              type="number"
              min={0}
              max={totals.price}
              inputMode="numeric"
              value={plan.discount}
              onChange={(e) => onChange({ discount: e.target.value })}
              disabled={!selected}
              className="h-8 w-28 bg-background text-right"
            />
          </div>
          {totals.discount > 0 && (
            <Input
              aria-label="Discount reason"
              placeholder="Reason (required), e.g. corporate offer"
              value={plan.discountReason}
              onChange={(e) => onChange({ discountReason: e.target.value })}
              className="h-8 bg-background"
            />
          )}
          <SummaryRow label={`GST (${totals.taxPercent}%)`} value={formatINR(totals.tax)} plain />
          <div className="flex justify-between border-t pt-2.5 text-base font-bold">
            <span>Total</span>
            <span>{formatINR(totals.total)}</span>
          </div>
        </div>
        {plan.startDate > today && (
          <p className="rounded-lg bg-orange-50 p-2.5 text-[13px] leading-snug text-orange-900 dark:bg-orange-950 dark:text-orange-100">
            Membership will be <b>Upcoming</b> until {formatDay(plan.startDate)}. Credits unlock on the start date.
          </p>
        )}
        <Button className="mt-2 h-11" disabled={!!blocker} onClick={() => selected && onContinue(selected)}>
          Review invoice
        </Button>
        {blocker && <p className="text-center text-xs text-muted-foreground">{blocker}</p>}
        <div className="flex justify-center gap-1">
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
          {onSaveAsLead && (
            <Button variant="ghost" size="sm" onClick={onSaveAsLead} disabled={savingLead}>
              {savingLead ? 'Saving…' : 'Save as lead and exit'}
            </Button>
          )}
        </div>
      </aside>
    </div>
  )
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-10 rounded-full border px-3.5 text-sm transition-colors',
        active ? 'border-2 border-primary bg-primary/5 font-semibold' : 'hover:border-primary/50'
      )}
    >
      {children}
    </button>
  )
}

function SummaryRow({ label, value, plain }: { label: string; value: string; plain?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('text-right', !plain && 'font-semibold')}>{value}</span>
    </div>
  )
}
