'use client'

import { useState } from 'react'
import {
  IconAlertTriangle,
  IconBuildingBank,
  IconCash,
  IconCircleCheck,
  IconCreditCard,
  IconDeviceMobile,
  IconDownload,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { Invoice, InvoicePaymentMethod } from '@/lib/services/invoice.service'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { PAYMENT_METHODS, formatDay, formatINR, invoicePersonName, type MembershipOverlap } from './sale-utils'

const METHOD_ICON: Record<string, React.ReactNode> = {
  CASH: <IconCash className="size-5" />,
  UPI: <IconDeviceMobile className="size-5" />,
  CARD: <IconCreditCard className="size-5" />,
  BANK_TRANSFER: <IconBuildingBank className="size-5" />,
}

const REFERENCE_LABEL: Partial<Record<InvoicePaymentMethod, { label: string; placeholder: string; required: boolean }>> = {
  UPI: { label: 'UPI reference (UTR)', placeholder: "12-digit UTR from the customer's app", required: true },
  CARD: { label: 'Card slip / approval code', placeholder: 'From the card machine slip', required: true },
  BANK_TRANSFER: { label: 'Bank reference', placeholder: 'Transaction reference (optional)', required: false },
}

interface Props {
  invoice: Invoice
  /** True right after this flow created the invoice (vs. resumed from a link). */
  justCreated: boolean
  isNewAccount: boolean
  branchName: string
  planName: string
  startDate: string
  confirming: boolean
  cancelling: boolean
  downloading: boolean
  error: string | null
  overlap: MembershipOverlap | null
  onConfirm: (method: InvoicePaymentMethod, reference: string) => void
  onCollectLater: () => void
  onCancelInvoice: () => void
  /** Overlap fix: cancel this invoice and raise a new one from `day`. */
  onRestartFrom: (day: string) => void
  onDownloadPdf: () => void
}

export function PaymentStep({
  invoice,
  justCreated,
  isNewAccount,
  branchName,
  planName,
  startDate,
  confirming,
  cancelling,
  downloading,
  error,
  overlap,
  onConfirm,
  onCollectLater,
  onCancelInvoice,
  onRestartFrom,
  onDownloadPdf,
}: Props) {
  const [method, setMethod] = useState<InvoicePaymentMethod>('UPI')
  const [reference, setReference] = useState('')
  const ref = REFERENCE_LABEL[method]
  const canConfirm = !ref?.required || reference.trim().length > 0
  const name = invoicePersonName(invoice)
  const busy = confirming || cancelling

  return (
    <div className="flex flex-col gap-5">
      {justCreated && (
        <div className="flex gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
          <IconCircleCheck className="mt-0.5 size-4 shrink-0" />
          <span>
            Invoice <b>{invoice.invoiceNumber}</b> created, <b>pending</b>.
            {isNewAccount && ` Account created for ${name}${branchName ? ` (home club ${branchName})` : ''}.`} Nothing is active
            until payment is recorded.
          </span>
        </div>
      )}

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="flex min-w-0 flex-col gap-5">
          <h1 className="text-2xl font-bold">Record payment</h1>

          <fieldset className="space-y-2">
            <legend className="pb-2 text-sm font-semibold">Method</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  type="button"
                  aria-pressed={method === pm.value}
                  onClick={() => setMethod(pm.value)}
                  className={cn(
                    'flex h-13 items-center justify-center gap-2 rounded-lg border px-3 py-3 transition-colors',
                    method === pm.value ? 'border-2 border-primary bg-primary/5 font-semibold text-primary' : 'hover:border-primary/50'
                  )}
                >
                  {METHOD_ICON[pm.value]}
                  {pm.label}
                </button>
              ))}
            </div>
          </fieldset>

          {ref && (
            <div className="space-y-1.5">
              <Label htmlFor="payment-reference">{ref.label}</Label>
              <Input
                id="payment-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={ref.placeholder}
                className="h-11"
                autoComplete="off"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="payment-amount">Amount received</Label>
            <Input id="payment-amount" value={formatINR(invoice.total)} readOnly className="h-11 bg-muted/40" />
            <p className="text-xs text-muted-foreground">The full invoice total. Part payments aren&apos;t supported yet.</p>
          </div>

          {overlap ? (
            <Alert variant="destructive">
              <IconAlertTriangle className="size-4" />
              <AlertTitle>{name} already has a membership on these dates</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  It runs until {formatDay(overlap.endDate)}, so this one can&apos;t start on {formatDay(startDate)}. Cancel this
                  invoice and raise it again starting {formatDay(overlap.nextStart)}.
                </p>
                {overlap.nextStart && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => onRestartFrom(overlap.nextStart)}>
                    {cancelling ? 'Cancelling…' : `Re-raise from ${formatDay(overlap.nextStart)}`}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            error && (
              <Alert variant="destructive">
                <IconAlertTriangle className="size-4" />
                <AlertTitle>Payment not recorded</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              className="h-11"
              disabled={!canConfirm || busy || !!overlap}
              onClick={() => onConfirm(method, reference.trim())}
            >
              {confirming ? 'Recording…' : 'Confirm payment · activate membership'}
            </Button>
            <Button variant="outline" className="h-11" disabled={busy} onClick={onCollectLater}>
              Collect later
            </Button>
          </div>
          <p className="text-[13px] text-muted-foreground">
            &ldquo;Collect later&rdquo; ends the flow here. The invoice stays pending under Invoices and on the lead, with a
            Resume payment button.
          </p>
        </div>

        <aside className="flex flex-col gap-3 self-start rounded-xl border bg-muted/40 p-5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice</span>
            <InvoiceStatusBadge status={invoice.paymentStatus} />
          </div>
          <Row label="Number" value={invoice.invoiceNumber || '—'} />
          <Row label="For" value={name} />
          <Row label="Branch" value={branchName || '—'} />
          <Row label="Plan" value={planName || '—'} />
          <Row label="Starts" value={formatDay(startDate)} />
          <div className="flex justify-between border-t pt-2.5 text-base font-bold">
            <span>Total</span>
            <span>{formatINR(invoice.total)}</span>
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={onDownloadPdf} disabled={downloading}>
            <IconDownload className="size-4" />
            {downloading ? 'Downloading…' : 'Download PDF'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={busy}>
                Cancel invoice
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel invoice {invoice.invoiceNumber}?</AlertDialogTitle>
                <AlertDialogDescription>
                  The sale is dropped and no membership is created. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction onClick={onCancelInvoice}>Cancel invoice</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  )
}
