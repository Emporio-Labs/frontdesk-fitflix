'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { IconFileInvoice } from '@tabler/icons-react'
import { useLocationScope } from '@/components/location-scope-provider'
import { useLead, useCreateLead } from '@/hooks/use-leads'
import { useUser } from '@/hooks/use-users'
import { useMemberships } from '@/hooks/use-memberships'
import { useInvoice } from '@/hooks/use-invoices'
import { useCreateSaleInvoice, useRecordSalePayment } from '@/hooks/use-sales'
import { invoiceService, type CreateSaleInvoicePayload, type Invoice, type InvoicePaymentMethod } from '@/lib/services/invoice.service'
import { leadService } from '@/lib/services/lead.service'
import type { MembershipPlan } from '@/lib/services/membership-plan.service'
import type { Membership } from '@/lib/services/membership.service'
import type { LookupLead, LookupMember, LookupMembership } from '@/lib/services/people.service'
import { saveBlob, fileSlug } from '@/lib/download'
import { SaleStepsBar } from '@/components/sales/sale-steps-bar'
import { PersonStep, type NewPersonDraft } from '@/components/sales/person-step'
import { PlanStep } from '@/components/sales/plan-step'
import { InvoiceStep } from '@/components/sales/invoice-step'
import { PaymentStep } from '@/components/sales/payment-step'
import { ReadyStep } from '@/components/sales/ready-step'
import {
  PAYMENT_METHODS,
  addDays,
  apiErrorMessage,
  computeTotals,
  daysInclusive,
  membershipEndDate,
  membershipOverlap,
  newIdempotencyKey,
  renewableMembership,
  taxPercentFor,
  toIsoDay,
  todayIso,
  type MembershipOverlap,
  type SalePerson,
  type SalePlanState,
  type SaleStep,
} from '@/components/sales/sale-utils'

// New sale: one guided flow from finding the person to an active membership.
// URL contract (other pages link here):
//   (none)                   blank, starts at Person
//   ?leadId=<id>             lead prefilled, opens at Plan
//   ?userId=<id>             member prefilled, opens at Plan
//   ?userId=<id>&mode=renew  + their current plan/branch, starts the day after it ends
//   ?invoiceId=<id>          resume an unpaid invoice at Payment

export default function NewSalePage() {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <NewSaleRoute />
    </Suspense>
  )
}

function NewSaleRoute() {
  const params = useSearchParams()
  const router = useRouter()
  const [nonce, setNonce] = useState(0)

  const restart = useCallback(() => {
    router.replace('/admin/sales/new')
    setNonce((n) => n + 1)
  }, [router])

  return (
    <NewSaleFlow
      key={`${params.toString()}#${nonce}`}
      leadId={params.get('leadId') ?? ''}
      userId={params.get('userId') ?? ''}
      renew={params.get('mode') === 'renew'}
      invoiceId={params.get('invoiceId') ?? ''}
      onRestart={restart}
    />
  )
}

const KIND_LABEL: Record<SalePerson['kind'], string> = { member: 'member', lead: 'lead', new: 'new' }

function blankPlan(locationId: string | null): SalePlanState {
  return {
    locationId,
    planId: null,
    startMode: 'today',
    startDate: todayIso(),
    discount: '0',
    discountReason: '',
    homeClubAck: false,
  }
}

function renewPlan(locationId: string | null, current: LookupMembership): SalePlanState {
  return {
    ...blankPlan(current.locationId || locationId),
    planId: current.planId || null,
    startMode: 'after',
    startDate: addDays(toIsoDay(current.endDate), 1),
  }
}

/** After an invoice exists the account is resolved: carry it, so a re-raise can't create a second lead. */
function personFromInvoice(invoice: Invoice, prev: SalePerson | null): SalePerson {
  const userId = invoice.userId?.id || ''
  const name = invoice.userId?.name || invoice.lead?.name || prev?.name || ''
  const phone = prev?.phone || ''
  const email = invoice.userId?.email || invoice.lead?.email || prev?.email || ''
  if (invoice.leadId) {
    return {
      kind: 'lead',
      leadId: invoice.leadId,
      name,
      phone,
      email,
      locationId: invoice.locationId || '',
      interestedIn: '',
      ...(userId ? { userId } : {}),
    }
  }
  return {
    kind: 'member',
    userId,
    name,
    phone,
    email,
    homeLocationId: prev?.kind === 'member' ? prev.homeLocationId : '',
    currentMembership: prev?.kind === 'member' ? prev.currentMembership : null,
  }
}

function toLookupMembership(m: Membership): LookupMembership {
  return {
    _id: m.id,
    planId: m.planId ?? '',
    planName: m.planName,
    status: m.status,
    startDate: m.startDate,
    endDate: m.endDate,
    locationId: m.locationId ?? '',
  }
}

interface FlowProps {
  leadId: string
  userId: string
  renew: boolean
  invoiceId: string
  onRestart: () => void
}

function NewSaleFlow({ leadId, userId, renew, invoiceId, onRestart }: FlowProps) {
  const router = useRouter()
  const scope = useLocationScope()
  const locations = scope.locations

  const [step, setStep] = useState<SaleStep>(1)
  const [person, setPerson] = useState<SalePerson | null>(null)
  const [plan, setPlan] = useState<SalePlanState>(() => blankPlan(scope.selectedLocationId))
  const [chosenPlan, setChosenPlan] = useState<MembershipPlan | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [justCreated, setJustCreated] = useState(false)
  const [paidWith, setPaidWith] = useState<InvoicePaymentMethod | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createOverlap, setCreateOverlap] = useState<MembershipOverlap | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [payOverlap, setPayOverlap] = useState<MembershipOverlap | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [initialized, setInitialized] = useState(!leadId && !userId && !invoiceId)
  const [resumeProblem, setResumeProblem] = useState<string | null>(null)
  // One key per invoice attempt: retrying "Create invoice" after a timeout
  // returns the invoice the first click made instead of a duplicate.
  const idempotencyKey = useRef<string>(newIdempotencyKey())

  const createLead = useCreateLead()
  const createInvoice = useCreateSaleInvoice()
  const recordPayment = useRecordSalePayment()

  const patchPlan = useCallback((patch: Partial<SalePlanState>) => setPlan((p) => ({ ...p, ...patch })), [])

  const headerLocationId = scope.selectedLocationId
  const knownLocation = useCallback(
    (...ids: (string | null | undefined)[]) => {
      for (const id of ids) {
        if (id && (locations.length === 0 || locations.some((l) => l._id === id))) return id
      }
      return null
    },
    [locations]
  )

  // With one branch there is nothing to pick.
  useEffect(() => {
    if (scope.isSingleLocation && locations[0] && !plan.locationId) patchPlan({ locationId: locations[0]._id })
  }, [scope.isSingleLocation, locations, plan.locationId, patchPlan])

  // ── URL prefill ────────────────────────────────────────────────────────
  const leadQuery = useLead(initialized ? '' : leadId)
  const userQuery = useUser(initialized ? '' : userId)
  const membershipsQuery = useMemberships()
  const invoiceQuery = useInvoice(initialized ? '' : invoiceId)

  useEffect(() => {
    if (initialized || !leadId) return
    if (leadQuery.isError) {
      toast.error('That lead could not be loaded. Search for the person instead.')
      setInitialized(true)
      return
    }
    const lead = leadQuery.data
    if (!lead) return
    setPerson({
      kind: 'lead',
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      locationId: lead.locationId,
      interestedIn: lead.interestedIn,
      ...(lead.convertedUserId ? { userId: lead.convertedUserId } : {}),
      ...(lead.pendingInvoiceId ? { pendingInvoiceId: lead.pendingInvoiceId } : {}),
    })
    setPlan(blankPlan(knownLocation(lead.locationId, headerLocationId)))
    setStep(2)
    setInitialized(true)
  }, [initialized, leadId, leadQuery.data, leadQuery.isError, knownLocation, headerLocationId])

  useEffect(() => {
    if (initialized || !userId || invoiceId) return
    if (userQuery.isError) {
      toast.error('That member could not be loaded. Search for them instead.')
      setInitialized(true)
      return
    }
    const user = userQuery.data
    if (!user || membershipsQuery.isLoading) return
    const current =
      (membershipsQuery.data ?? [])
        .filter((m) => m.userId === (user.id || user._id))
        .map(toLookupMembership)
        .filter((m) => renewableMembership(m))
        .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0] ?? null
    setPerson({
      kind: 'member',
      userId: user.id || user._id,
      name: user.username,
      phone: user.phone,
      email: user.email,
      homeLocationId: user.homeClubId ?? '',
      currentMembership: current,
    })
    setPlan(
      renew && current
        ? renewPlan(knownLocation(current.locationId, user.homeClubId, headerLocationId), current)
        : blankPlan(knownLocation(user.homeClubId, headerLocationId))
    )
    setStep(2)
    setInitialized(true)
  }, [initialized, userId, invoiceId, renew, userQuery.data, userQuery.isError, membershipsQuery.isLoading, membershipsQuery.data, knownLocation, headerLocationId])

  useEffect(() => {
    if (initialized || !invoiceId) return
    if (invoiceQuery.isError) {
      setResumeProblem('This invoice could not be loaded.')
      setInitialized(true)
      return
    }
    const inv = invoiceQuery.data
    if (!inv) return
    setInvoice(inv)
    setPerson(personFromInvoice(inv, null))
    setPlan({
      ...blankPlan(inv.locationId || null),
      planId: inv.planId || null,
      startMode: 'pick',
      startDate: inv.startDate || todayIso(),
    })
    if (inv.paymentStatus === 'PAID') setStep(5)
    else if (inv.paymentStatus === 'PENDING' || inv.paymentStatus === 'DRAFT') setStep(4)
    else setResumeProblem(`Invoice ${inv.invoiceNumber} is ${inv.paymentStatus.toLowerCase()} and can't take a payment.`)
    setInitialized(true)
  }, [initialized, invoiceId, invoiceQuery.data, invoiceQuery.isError])

  // ── Derived ────────────────────────────────────────────────────────────
  const location = locations.find((l) => l._id === (invoice?.locationId || plan.locationId)) ?? null
  const branchName = location?.name ?? ''
  const totals = computeTotals(chosenPlan?.totalPrice ?? 0, plan.discount, taxPercentFor(location))
  const startDate = invoice?.startDate || plan.startDate
  const endDate = chosenPlan && plan.startDate ? membershipEndDate(plan.startDate, chosenPlan) : ''
  const planName = chosenPlan?.planName || invoice?.planSnapshot?.name || invoice?.items[0]?.name || ''

  const doneLabels = useMemo<Partial<Record<SaleStep, string>>>(() => {
    const methodLabel = PAYMENT_METHODS.find((m) => m.value === paidWith)?.label
    return {
      1: person ? `${person.name} (${KIND_LABEL[person.kind]})` : undefined,
      2: planName ? [planName, branchName].filter(Boolean).join(' · ') : undefined,
      3: invoice ? `Invoice ${invoice.invoiceNumber || 'raised'}` : 'Invoice raised',
      4: methodLabel ? `Paid by ${methodLabel}` : 'Paid',
    }
  }, [person, planName, branchName, invoice, paidWith])

  // ── Step 1 / 2 handlers ────────────────────────────────────────────────
  const selectMember = (m: LookupMember, isRenewal: boolean) => {
    const current = renewableMembership(m.currentMembership)
    setPerson({
      kind: 'member',
      userId: m._id,
      name: m.username,
      phone: m.phone,
      email: m.email,
      homeLocationId: m.homeLocationId,
      currentMembership: m.currentMembership,
    })
    setPlan(
      isRenewal && current
        ? renewPlan(knownLocation(current.locationId, m.homeLocationId, headerLocationId), current)
        : blankPlan(knownLocation(m.homeLocationId, headerLocationId))
    )
    setStep(2)
  }

  const selectLead = (l: LookupLead, linkedMember?: LookupMember) => {
    setPerson({
      kind: 'lead',
      leadId: l._id,
      name: l.name,
      phone: l.phone,
      email: l.email,
      locationId: l.locationId,
      interestedIn: l.interestedIn,
      ...(linkedMember ? { userId: linkedMember._id } : {}),
      ...(l.pendingInvoiceId ? { pendingInvoiceId: l.pendingInvoiceId } : {}),
    })
    setPlan(blankPlan(knownLocation(l.locationId, linkedMember?.homeLocationId, headerLocationId)))
    setStep(2)
  }

  const selectNewPerson = (draft: NewPersonDraft) => {
    setPerson({ kind: 'new', ...draft })
    setPlan(blankPlan(knownLocation(headerLocationId)))
    setStep(2)
  }

  const saveAsLead = async (draft: NewPersonDraft, locationId: string | null, interestedIn?: string) => {
    try {
      await createLead.mutateAsync({
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        ...(draft.email.trim() ? { email: draft.email.trim() } : {}),
        ...(locationId ? { locationId } : {}),
        ...(interestedIn ? { interestedIn } : {}),
        status: 'new',
      })
      router.push('/admin/leads')
    } catch {
      // useCreateLead surfaces the toast
    }
  }

  const goToInvoice = (selected: MembershipPlan) => {
    setChosenPlan(selected)
    setCreateError(null)
    setCreateOverlap(null)
    idempotencyKey.current = newIdempotencyKey()
    setStep(3)
  }

  // ── Step 3: create the invoice ─────────────────────────────────────────
  const buildPayload = (who: SalePerson): CreateSaleInvoicePayload | null => {
    if (!chosenPlan || !plan.locationId) return null
    const end = membershipEndDate(plan.startDate, chosenPlan)
    return {
      ...(who.kind === 'member'
        ? { userId: who.userId }
        : who.kind === 'lead'
          ? { leadId: who.leadId, ...(who.userId ? { userId: who.userId } : {}) }
          : { newLead: { name: who.name, phone: who.phone, ...(who.email ? { email: who.email } : {}) } }),
      planId: chosenPlan.id,
      locationId: plan.locationId,
      startDate: plan.startDate,
      durationMonths: chosenPlan.durationMonths,
      planSnapshot: {
        name: chosenPlan.planName,
        durationInDays: daysInclusive(plan.startDate, end),
        price: chosenPlan.totalPrice,
        includedCredits: Number(chosenPlan.benefits?.credits ?? 0),
      },
      items: [{ name: chosenPlan.planName, price: chosenPlan.totalPrice, quantity: 1 }],
      discount: totals.discount,
      tax: totals.tax,
      ...(totals.discount > 0 ? { discountReason: plan.discountReason.trim() } : {}),
      paymentStatus: 'PENDING',
    }
  }

  const handleCreateInvoice = async () => {
    if (!person) return
    setCreateError(null)
    setCreateOverlap(null)
    let who = person
    let payload = buildPayload(who)
    if (!payload) return
    try {
      let res
      try {
        res = await createInvoice.mutateAsync({ payload, idempotencyKey: idempotencyKey.current })
      } catch (err: any) {
        // Fallback for a backend without `newLead`: it answers 400 asking for
        // leadId/userId. Save the lead first, then raise the invoice for it.
        const msg = apiErrorMessage(err, '')
        if (who.kind !== 'new' || err?.response?.status !== 400 || !/lead ?id|user ?id/i.test(msg)) throw err
        const { lead } = await leadService.create({
          name: who.name,
          phone: who.phone,
          ...(who.email ? { email: who.email } : {}),
          ...(plan.locationId ? { locationId: plan.locationId } : {}),
          interestedIn: chosenPlan?.planName,
        })
        who = { kind: 'lead', leadId: lead.id, name: lead.name || who.name, phone: who.phone, email: who.email, locationId: plan.locationId || '', interestedIn: '' }
        setPerson(who)
        payload = buildPayload(who)!
        idempotencyKey.current = newIdempotencyKey()
        res = await createInvoice.mutateAsync({ payload, idempotencyKey: idempotencyKey.current })
      }
      setInvoice(res.invoice)
      setPerson(personFromInvoice(res.invoice, who))
      setJustCreated(true)
      setPayError(null)
      setPayOverlap(null)
      setStep(4)
    } catch (err) {
      const overlap = membershipOverlap(err)
      if (overlap) setCreateOverlap(overlap)
      else setCreateError(apiErrorMessage(err, 'Failed to create the invoice'))
    }
  }

  const applyNextStart = (day: string) => {
    patchPlan({ startMode: 'pick', startDate: day })
    setCreateOverlap(null)
    idempotencyKey.current = newIdempotencyKey()
  }

  // ── Step 4: payment ────────────────────────────────────────────────────
  const handleConfirmPayment = async (method: InvoicePaymentMethod, reference: string) => {
    if (!invoice) return
    setPayError(null)
    setPayOverlap(null)
    try {
      const res = await recordPayment.mutateAsync({
        id: invoice.id,
        payload: { paymentStatus: 'PAID', paymentMethod: method, ...(reference ? { paymentReference: reference } : {}) },
      })
      setInvoice(res.invoice.id ? res.invoice : { ...invoice, paymentStatus: 'PAID' })
      setMembership(res.membership ?? null)
      setPaidWith(method)
      setStep(5)
      toast.success('Payment recorded')
    } catch (err) {
      const overlap = membershipOverlap(err)
      if (overlap) setPayOverlap(overlap)
      else setPayError(apiErrorMessage(err, 'Failed to record the payment'))
    }
  }

  const cancelInvoice = async () => {
    if (!invoice) return false
    setCancelling(true)
    try {
      await recordPayment.mutateAsync({ id: invoice.id, payload: { paymentStatus: 'CANCELLED' } })
      return true
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to cancel the invoice'))
      return false
    } finally {
      setCancelling(false)
    }
  }

  const handleCancelInvoice = async () => {
    if (await cancelInvoice()) {
      toast.success(`Invoice ${invoice?.invoiceNumber} cancelled`)
      onRestart()
    }
  }

  // The clash is only known at payment: drop this invoice and go back to
  // Plan with the first free day, so staff re-check before re-raising.
  const handleRestartFrom = async (day: string) => {
    if (!invoice || !(await cancelInvoice())) return
    setPerson(personFromInvoice(invoice, person))
    setInvoice(null)
    setJustCreated(false)
    setPayOverlap(null)
    patchPlan({ startMode: 'pick', startDate: day, locationId: plan.locationId || invoice.locationId || null, planId: plan.planId || invoice.planId || null })
    toast.message(`Invoice ${invoice.invoiceNumber} cancelled. Review the plan starting ${day} and raise it again.`)
    setStep(2)
  }

  const handleCollectLater = () => {
    toast.success(`Invoice ${invoice?.invoiceNumber} saved as pending. Resume it from Invoices or the lead.`)
    router.push('/dashboard')
  }

  const handleDownloadPdf = async () => {
    if (!invoice) return
    setDownloading(true)
    try {
      const blob = await invoiceService.downloadPdf(invoice.id)
      saveBlob(blob, `${fileSlug(invoice.invoiceNumber || 'invoice')}.pdf`)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to download the invoice PDF'))
    } finally {
      setDownloading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  if (!initialized) return <FlowSkeleton />

  if (resumeProblem) {
    return (
      <div className="p-4 md:p-8">
        <EmptyState
          icon={<IconFileInvoice className="size-10" />}
          title="Nothing to resume"
          description={resumeProblem}
          action={
            <Button asChild>
              <Link href="/admin/sales/new">Start a new sale</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:px-10 md:py-7">
      <SaleStepsBar
        step={step}
        doneLabels={doneLabels}
        canGoTo={(s) => !invoice && s < step && s <= 2}
        onGoTo={setStep}
      />

      {step === 1 && (
        <PersonStep
          locations={locations}
          onSelectMember={selectMember}
          onSelectLead={selectLead}
          onNewPerson={selectNewPerson}
          onSaveAsLead={(draft) => saveAsLead(draft, headerLocationId)}
          savingLead={createLead.isPending}
        />
      )}

      {step === 2 && person && (
        <PlanStep
          person={person}
          plan={plan}
          onChange={patchPlan}
          locations={locations}
          isSingleLocation={scope.isSingleLocation}
          onBack={() => setStep(1)}
          onContinue={goToInvoice}
          onSaveAsLead={
            person.kind === 'new'
              ? () => saveAsLead(person, plan.locationId, chosenPlan?.planName)
              : person.kind === 'lead'
                ? () => {
                    toast.success(`${person.name} stays in Leads`)
                    router.push('/admin/leads')
                  }
                : null
          }
          savingLead={createLead.isPending}
        />
      )}

      {step === 3 && person && chosenPlan && (
        <InvoiceStep
          person={person}
          branchName={branchName}
          plan={chosenPlan}
          startDate={plan.startDate}
          endDate={endDate}
          totals={totals}
          discountReason={plan.discountReason}
          creating={createInvoice.isPending || createLead.isPending}
          error={createError}
          overlap={createOverlap}
          onUseNextStart={applyNextStart}
          onBack={() => setStep(2)}
          onCreate={handleCreateInvoice}
        />
      )}

      {step === 4 && invoice && (
        <PaymentStep
          invoice={invoice}
          justCreated={justCreated}
          isNewAccount={justCreated && (person?.kind === 'new' || (person?.kind === 'lead' && !person.userId))}
          branchName={branchName}
          planName={planName}
          startDate={startDate}
          confirming={recordPayment.isPending && !cancelling}
          cancelling={cancelling}
          downloading={downloading}
          error={payError}
          overlap={payOverlap}
          onConfirm={handleConfirmPayment}
          onCollectLater={handleCollectLater}
          onCancelInvoice={handleCancelInvoice}
          onRestartFrom={handleRestartFrom}
          onDownloadPdf={handleDownloadPdf}
        />
      )}

      {step === 5 && invoice && (
        <ReadyStep
          invoice={invoice}
          membership={membership}
          branchName={branchName}
          planName={planName}
          startDate={startDate}
          endDate={endDate || (startDate && invoice.planSnapshot?.durationInDays ? addDays(startDate, invoice.planSnapshot.durationInDays - 1) : '')}
          credits={chosenPlan ? Number(chosenPlan.benefits?.credits ?? 0) : invoice.planSnapshot?.includedCredits ?? 0}
          downloading={downloading}
          onDownloadPdf={handleDownloadPdf}
          onStartAnother={onRestart}
        />
      )}
    </div>
  )
}

function FlowSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:px-10 md:py-7">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
