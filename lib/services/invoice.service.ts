import { apiClient } from '@/lib/api-client'

export type InvoicePaymentStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED'
export type InvoicePaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'NONE'

export interface InvoiceItem {
  name: string
  price: number
  quantity: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  userId: {
    id: string
    name: string
    email: string
  }
  leadId?: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentStatus: InvoicePaymentStatus
  paymentMethod: InvoicePaymentMethod
  issuedAt: string
  paidAt?: string
}

export interface InvoicePlanSnapshot {
  name: string
  durationInDays: number
  price: number
  includedCredits: number
}

export interface CreateInvoicePayload {
  userId?: string
  leadId?: string
  planSnapshot: InvoicePlanSnapshot
  items: InvoiceItem[]
  discount?: number
  tax?: number
}

export interface UpdateInvoiceStatusPayload {
  paymentStatus: InvoicePaymentStatus
  paymentMethod?: InvoicePaymentMethod
}

function normalizeInvoice(raw: any): Invoice {
  const userRef = raw?.userId ?? {}
  return {
    id: String(raw?._id || raw?.id || ''),
    invoiceNumber: String(raw?.invoiceNumber || ''),
    userId: {
      id: String(userRef?._id || userRef?.id || ''),
      name: String(userRef?.name || ''),
      email: String(userRef?.email || ''),
    },
    leadId: raw?.leadId ? String(raw.leadId) : undefined,
    items: Array.isArray(raw?.items)
      ? raw.items.map((item: any) => ({
          name: String(item?.name || ''),
          price: Number(item?.price ?? 0),
          quantity: Number(item?.quantity ?? 1),
        }))
      : [],
    subtotal: Number(raw?.subtotal ?? 0),
    tax: Number(raw?.tax ?? 0),
    discount: Number(raw?.discount ?? 0),
    total: Number(raw?.total ?? 0),
    paymentStatus: (raw?.paymentStatus as InvoicePaymentStatus) || 'DRAFT',
    paymentMethod: (raw?.paymentMethod as InvoicePaymentMethod) || 'NONE',
    issuedAt: String(raw?.issuedAt || raw?.createdAt || ''),
    paidAt: raw?.paidAt ? String(raw.paidAt) : undefined,
  }
}

function extractRawList(data: any): any[] {
  if (Array.isArray(data?.invoices)) return data.invoices
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data
  return []
}

function extractRawOne(data: any): any {
  return data?.invoice ?? data?.data?.invoice ?? data?.data ?? data
}

export const invoiceService = {
  getAll: async (): Promise<{ items: Invoice[] }> => {
    const { data } = await apiClient.get('/invoices')
    return { items: extractRawList(data).map(normalizeInvoice) }
  },

  getById: async (id: string): Promise<{ invoice: Invoice }> => {
    const { data } = await apiClient.get(`/invoices/${id}`)
    return { invoice: normalizeInvoice(extractRawOne(data)) }
  },

  create: async (payload: CreateInvoicePayload): Promise<{ message: string; invoice: Invoice }> => {
    const { data } = await apiClient.post('/invoices', payload)
    return {
      message: data?.message || 'Invoice created successfully',
      invoice: normalizeInvoice(extractRawOne(data)),
    }
  },

  updateStatus: async (
    id: string,
    payload: UpdateInvoiceStatusPayload
  ): Promise<{ message: string; invoice: Invoice }> => {
    const { data } = await apiClient.patch(`/invoices/${id}/status`, payload)
    return {
      message: data?.message || 'Invoice updated successfully',
      invoice: normalizeInvoice(extractRawOne(data)),
    }
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const { data } = await apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
    return data as Blob
  },
}
