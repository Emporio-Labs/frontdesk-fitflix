import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  invoiceService,
  CreateSaleInvoicePayload,
  SalePaymentPayload,
} from '@/lib/services/invoice.service'
import { queryKeys } from '@/lib/query-keys'

// New sale mutations. No toasts here: the stepper renders errors inline
// (a 409 MEMBERSHIP_OVERLAP needs an action, not a toast).

function invalidateSale(qc: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.invoices.all() }),
    qc.invalidateQueries({ queryKey: queryKeys.leads.all() }),
    qc.invalidateQueries({ queryKey: queryKeys.users.all() }),
    qc.invalidateQueries({ queryKey: queryKeys.memberships.all() }),
    qc.invalidateQueries({ queryKey: ['people'] }),
    qc.invalidateQueries({ queryKey: queryKeys.dashboard.metrics() }),
  ])
}

export function useCreateSaleInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: { payload: CreateSaleInvoicePayload; idempotencyKey: string }) =>
      invoiceService.createSale(payload, idempotencyKey),
    onSuccess: () => invalidateSale(qc),
  })
}

export function useRecordSalePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SalePaymentPayload }) =>
      invoiceService.recordSalePayment(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.invoices.detail(data.invoice.id) })
      return invalidateSale(qc)
    },
  })
}
