'use client'

import { IconAlertTriangle, IconFileInvoice } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { MembershipPlan } from '@/lib/services/membership-plan.service'
import { formatDay, formatINR, type MembershipOverlap, type SalePerson, type SaleTotals } from './sale-utils'

interface Props {
  person: SalePerson
  branchName: string
  plan: MembershipPlan
  startDate: string
  endDate: string
  totals: SaleTotals
  discountReason: string
  creating: boolean
  error: string | null
  overlap: MembershipOverlap | null
  onUseNextStart: (day: string) => void
  onBack: () => void
  onCreate: () => void
}

const PERSON_KIND: Record<SalePerson['kind'], string> = {
  member: 'Existing member',
  lead: 'Lead · account created with the invoice',
  new: 'New person · lead and account created with the invoice',
}

export function InvoiceStep({
  person,
  branchName,
  plan,
  startDate,
  endDate,
  totals,
  discountReason,
  creating,
  error,
  overlap,
  onUseNextStart,
  onBack,
  onCreate,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Review the invoice</h1>
        <p className="text-muted-foreground">
          Creating the invoice saves the sale as pending. Nothing is active until payment is recorded.
        </p>
      </div>

      <div className="rounded-xl border">
        <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2">
          <Item label="Customer" value={person.name} sub={[person.phone, person.kind === 'lead' && person.userId ? 'Lead · linked to the existing member account' : PERSON_KIND[person.kind]].filter(Boolean).join(' · ')} />
          <Item label="Branch" value={branchName || '—'} />
          <Item label="Plan" value={plan.planName} />
          <Item label="Runs" value={`${formatDay(startDate)} → ${formatDay(endDate)}`} />
        </dl>
        <div className="space-y-2 border-t p-5 text-sm">
          <Line label={plan.planName} value={formatINR(totals.price)} />
          {totals.discount > 0 && (
            <Line label={`Discount${discountReason ? ` · ${discountReason}` : ''}`} value={`− ${formatINR(totals.discount)}`} />
          )}
          <Line label={`GST (${totals.taxPercent}%)`} value={formatINR(totals.tax)} />
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatINR(totals.total)}</span>
          </div>
        </div>
      </div>

      {overlap ? (
        <Alert variant="destructive">
          <IconAlertTriangle className="size-4" />
          <AlertTitle>{person.name} already has a membership on these dates</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              It runs until {formatDay(overlap.endDate)}. Start this plan on {formatDay(overlap.nextStart)} instead so the
              two don&apos;t overlap.
            </p>
            {overlap.nextStart && (
              <Button size="sm" variant="outline" onClick={() => onUseNextStart(overlap.nextStart)}>
                Start {formatDay(overlap.nextStart)}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        error && (
          <Alert variant="destructive">
            <IconAlertTriangle className="size-4" />
            <AlertTitle>Couldn&apos;t create the invoice</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )
      )}

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button variant="ghost" onClick={onBack} disabled={creating}>
          Back
        </Button>
        <div className="flex-1" />
        <Button className="h-11" onClick={onCreate} disabled={creating || !!overlap}>
          <IconFileInvoice className="size-4" />
          {creating ? 'Creating…' : `Create invoice · ${formatINR(totals.total)}`}
        </Button>
      </div>
    </div>
  )
}

function Item({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
