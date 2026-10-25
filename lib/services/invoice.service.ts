import { apiClient } from '@/lib/api-client'
import { normalizeMembership, type Membership } from '@/lib/services/membership.service'

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
  lead?: {
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
  /** Branch the invoice was issued at. */
  locationId?: string
  planId?: string
  /** Membership start the sale was raised for (YYYY-MM-DD). */
  startDate?: string
  durationMonths?: number
  planSnapshot?: InvoicePlanSnapshot
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
  /** The branch this invoice is issued at. Backend resolves via resolveLocationId. */
  locationId?: string
}

export interface UpdateInvoiceStatusPayload {
  paymentStatus: InvoicePaymentStatus
  paymentMethod?: InvoicePaymentMethod
  /** PAID only: the day the created membership starts (YYYY-MM-DD). Omitted = on payment. */
  membershipStartDate?: string
}

/** The New sale flow's POST /invoices body. */
export interface CreateSaleInvoicePayload extends CreateInvoicePayload {
  planId: string
  locationId: string
  /** YYYY-MM-DD */
  startDate: string
  durationMonths: number
  discountReason?: string
  /** A person with no lead or account yet; replaces leadId/userId. */
  newLead?: { name: string; phone: string; email?: string }
  paymentStatus?: 'DRAFT' | 'PENDING'
}

export interface SalePaymentPayload {
  paymentStatus: InvoicePaymentStatus
  paymentMethod?: InvoicePaymentMethod
  /** UTR / card slip / bank reference. */
  paymentReference?: string
}

function normalizeInvoice(raw: any): Invoice {
  const userRef = raw?.userId ?? {}
  const leadRef = raw?.leadId ?? {}
  return {
    id: String(raw?._id || raw?.id || ''),
    invoiceNumber: String(raw?.invoiceNumber || ''),
    userId: {
      // An unpopulated ref arrives as the bare id string.
      id: typeof userRef === 'string' ? userRef : String(userRef?._id || userRef?.id || ''),
      name: String(userRef?.username || userRef?.name || ''),
      email: String(userRef?.email || ''),
    },
    lead: (leadRef?._id || leadRef?.id)
      ? {
          id: String(leadRef?._id || leadRef?.id || ''),
          name: String(leadRef?.leadName || leadRef?.name || ''),
          email: String(leadRef?.email || ''),
        }
      : undefined,
    leadId: (leadRef?._id || leadRef?.id)
      ? String(leadRef?._id || leadRef?.id)
      : raw?.leadId
      ? String(raw.leadId)
      : undefined,
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
    locationId: refId(raw?.locationId) || undefined,
    planId: refId(raw?.planId) || undefined,
    startDate: raw?.startDate ? String(raw.startDate).slice(0, 10) : undefined,
    durationMonths: raw?.durationMonths != null ? Number(raw.durationMonths) : undefined,
    planSnapshot: raw?.planSnapshot
      ? {
          name: String(raw.planSnapshot.name || ''),
          durationInDays: Number(raw.planSnapshot.durationInDays ?? 0),
          price: Number(raw.planSnapshot.price ?? 0),
          includedCredits: Number(raw.planSnapshot.includedCredits ?? 0),
        }
      : undefined,
  }
}

function refId(value: any): string {
  if (!value) return ''
  return typeof value === 'string' ? value : String(value?._id || value?.id || '')
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

  /**
   * Raise the invoice for a New sale. The Idempotency-Key is kept for one
   * attempt, so a retried click returns the same invoice instead of a second.
   */
  createSale: async (
    payload: CreateSaleInvoicePayload,
    idempotencyKey: string
  ): Promise<{ message: string; invoice: Invoice }> => {
    const { data } = await apiClient.post('/invoices', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return {
      message: data?.message || 'Invoice created',
      invoice: normalizeInvoice(extractRawOne(data)),
    }
  },

  /** Mark a sale invoice paid (or cancel it). PAID returns the membership it created. */
  recordSalePayment: async (
    id: string,
    payload: SalePaymentPayload
  ): Promise<{ message: string; invoice: Invoice; membership?: Membership }> => {
    const { data } = await apiClient.patch(`/invoices/${id}/status`, payload)
    const rawMembership = data?.membership ?? data?.data?.membership
    return {
      message: data?.message || 'Invoice updated',
      invoice: normalizeInvoice(extractRawOne(data)),
      ...(rawMembership ? { membership: normalizeMembership(rawMembership) } : {}),
    }
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const { data } = await apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
    return data as Blob
  },
}
