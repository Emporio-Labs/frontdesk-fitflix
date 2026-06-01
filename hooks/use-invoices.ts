import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  invoiceService,
  CreateInvoicePayload,
  UpdateInvoiceStatusPayload,
} from '@/lib/services/invoice.service'
import { queryKeys } from '@/lib/query-keys'

export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices.all(),
    queryFn: () => invoiceService.getAll(),
    select: (data) => data.items,
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => invoiceService.getById(id),
    select: (data) => data.invoice,
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) => invoiceService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all() })
      qc.invalidateQueries({ queryKey: queryKeys.leads.all() })
      toast.success(data.message || 'Invoice created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create invoice')
    },
  })
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateInvoiceStatusPayload }) =>
      invoiceService.updateStatus(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all() })
      qc.invalidateQueries({ queryKey: queryKeys.invoices.detail(data.invoice._id) })
      qc.invalidateQueries({ queryKey: queryKeys.leads.all() })
      qc.invalidateQueries({ queryKey: [...queryKeys.leads.all(), 'analytics'] })
      if (data.invoice.paymentStatus === 'PAID') {
        toast.success('Payment recorded — membership activated')
      } else {
        toast.success(data.message || 'Invoice status updated')
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update invoice status')
    },
  })
}
