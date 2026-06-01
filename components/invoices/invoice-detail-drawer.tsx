'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { IconDownload, IconCheck } from '@tabler/icons-react'
import { Invoice } from '@/lib/services/invoice.service'
import { invoiceService } from '@/lib/services/invoice.service'
import { useInvoice } from '@/hooks/use-invoices'
import { InvoiceStatusBadge } from './invoice-status-badge'
import { MarkPaidDialog } from './mark-paid-dialog'
import { toast } from 'sonner'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceDetailDrawer({ invoice, open, onOpenChange }: Props) {
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Subscribe to the live cache entry so the drawer reflects mutations
  // (e.g. Mark as Paid) without requiring the parent page to update its state.
  // Falls back to the prop when the cache entry isn't yet populated.
  const { data: liveInvoice } = useInvoice(invoice?.id ?? '')
  const displayInvoice = liveInvoice ?? invoice

  const canMarkPaid =
    displayInvoice?.paymentStatus === 'DRAFT' || displayInvoice?.paymentStatus === 'PENDING'

  const handleDownload = async () => {
    if (!displayInvoice || isDownloading) return
    setIsDownloading(true)
    try {
      const blob = await invoiceService.downloadPdf(displayInvoice.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${displayInvoice.invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download invoice PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!displayInvoice) return null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Invoice {displayInvoice.invoiceNumber}
              <InvoiceStatusBadge status={displayInvoice.paymentStatus} />
            </SheetTitle>
            <SheetDescription>
              Issued {formatDate(displayInvoice.issuedAt)}
              {displayInvoice.paidAt && ` · Paid ${formatDate(displayInvoice.paidAt)}`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Member */}
            <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Member</p>
              <p className="text-sm font-semibold">{displayInvoice.userId?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{displayInvoice.userId?.email ?? '—'}</p>
            </div>

            {/* Payment Method */}
            {displayInvoice.paymentMethod !== 'NONE' && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Payment via</span>
                <span className="font-medium">{displayInvoice.paymentMethod.replace('_', ' ')}</span>
              </div>
            )}

            {/* Items */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Items</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayInvoice.items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{item.name}</TableCell>
                      <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">{formatINR(item.price * item.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatINR(displayInvoice.subtotal)}</span>
              </div>
              {displayInvoice.discount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="text-red-600">− {formatINR(displayInvoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatINR(displayInvoice.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>Total</span>
                <span>{formatINR(displayInvoice.total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {canMarkPaid && (
                <Button
                  className="flex-1"
                  onClick={() => setMarkPaidOpen(true)}
                >
                  <IconCheck className="w-4 h-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                <IconDownload className="w-4 h-4 mr-2" />
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </Button>
            </div>

            {displayInvoice.paymentStatus === 'PAID' && (
              <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3">
                <IconCheck className="w-4 h-4 text-green-700 shrink-0" />
                <p className="text-sm text-green-700 font-medium">Payment received · Membership activated</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <MarkPaidDialog
        invoice={displayInvoice}
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
      />
    </>
  )
}

export function InvoiceDetailDrawerSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
