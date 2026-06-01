'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { IconCash, IconCreditCard, IconBuildingBank, IconDeviceMobile } from '@tabler/icons-react'
import { Invoice, InvoicePaymentMethod } from '@/lib/services/invoice.service'
import { useUpdateInvoiceStatus } from '@/hooks/use-invoices'

const PAYMENT_METHODS: { value: InvoicePaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'CASH',          label: 'Cash',          icon: <IconCash className="w-5 h-5" /> },
  { value: 'UPI',           label: 'UPI',            icon: <IconDeviceMobile className="w-5 h-5" /> },
  { value: 'CARD',          label: 'Card',           icon: <IconCreditCard className="w-5 h-5" /> },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer',  icon: <IconBuildingBank className="w-5 h-5" /> },
]

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

interface Props {
  invoice: Invoice
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MarkPaidDialog({ invoice, open, onOpenChange }: Props) {
  const [method, setMethod] = useState<InvoicePaymentMethod>('CASH')
  const updateStatus = useUpdateInvoiceStatus()

  const handleConfirm = async () => {
    try {
      await updateStatus.mutateAsync({
        id: invoice.id,
        payload: { paymentStatus: 'PAID', paymentMethod: method },
      })
      onOpenChange(false)
    } catch {
      // onError in the hook surfaces the toast; keep the dialog open so the user can retry
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Invoice {invoice.invoiceNumber} · {formatINR(invoice.total)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm font-medium">Select payment method</p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                type="button"
                onClick={() => setMethod(pm.value)}
                className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  method === pm.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {pm.icon}
                {pm.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={updateStatus.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={updateStatus.isPending}
              onClick={handleConfirm}
            >
              {updateStatus.isPending ? 'Recording...' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
