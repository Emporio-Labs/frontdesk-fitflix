import { apiClient } from '@/lib/api-client'

export type InvoicePaymentStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED'
export type InvoicePaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'NONE'

export interface InvoiceItem {
  name: string
  price: number
  quantity: number
}

export interface Invoice {
  _id: string
  invoiceNumber: string
  userId: {
    _id: string
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

export interface CreateInvoicePayload {
  userId?: string
  leadId?: string
  membershipPlanId?: string
  items: InvoiceItem[]
  discount?: number
  tax?: number
}

export interface UpdateInvoiceStatusPayload {
  paymentStatus: InvoicePaymentStatus
  paymentMethod?: InvoicePaymentMethod
}

function extractList(data: any): Invoice[] {
  if (Array.isArray(data?.invoices)) return data.invoices
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data
  return []
}

function extractOne(data: any): Invoice {
  return data?.invoice ?? data?.data?.invoice ?? data?.data ?? data
}

export const invoiceService = {
  getAll: async (): Promise<{ items: Invoice[] }> => {
    const { data } = await apiClient.get('/invoices')
    return { items: extractList(data) }
  },

  getById: async (id: string): Promise<{ invoice: Invoice }> => {
    const { data } = await apiClient.get(`/invoices/${id}`)
    return { invoice: extractOne(data) }
  },

  create: async (payload: CreateInvoicePayload): Promise<{ message: string; invoice: Invoice }> => {
    const { data } = await apiClient.post('/invoices', payload)
    return {
      message: data?.message || 'Invoice created successfully',
      invoice: extractOne(data),
    }
  },

  updateStatus: async (
    id: string,
    payload: UpdateInvoiceStatusPayload
  ): Promise<{ message: string; invoice: Invoice }> => {
    const { data } = await apiClient.patch(`/invoices/${id}/status`, payload)
    return {
      message: data?.message || 'Invoice updated successfully',
      invoice: extractOne(data),
    }
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const { data } = await apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
    return data as Blob
  },
}
