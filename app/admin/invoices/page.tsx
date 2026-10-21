'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  IconReceipt,
  IconCurrencyRupee,
  IconClock,
  IconCircleCheck,
  IconRefresh,
  IconPlus,
} from '@tabler/icons-react'
import { useInvoices } from '@/hooks/use-invoices'
import { Invoice, InvoicePaymentStatus } from '@/lib/services/invoice.service'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { InvoiceDetailDrawer } from '@/components/invoices/invoice-detail-drawer'

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

type StatusFilter = 'awaiting' | 'paid' | 'closed' | 'all'

const STATUS_FILTERS: Record<StatusFilter, { label: string; statuses?: InvoicePaymentStatus[] }> = {
  awaiting: { label: 'Awaiting payment', statuses: ['DRAFT', 'PENDING'] },
  paid: { label: 'Paid', statuses: ['PAID'] },
  closed: { label: 'Failed / cancelled / refunded', statuses: ['FAILED', 'CANCELLED', 'REFUNDED'] },
  all: { label: 'All invoices' },
}

const isAwaitingPayment = (invoice: Invoice) =>
  invoice.paymentStatus === 'DRAFT' || invoice.paymentStatus === 'PENDING'

export default function InvoicesPage() {
  const [search, setSearch] = useState('')
  // The desk's job here is collecting money, so open on what's still unpaid.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('awaiting')
  // ?invoiceId=… (e.g. from a member's membership card) opens that invoice.
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: invoices = [], isLoading, isError, refetch } = useInvoices()

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('invoiceId')
    if (id) {
      setLinkedInvoiceId(id)
      setStatusFilter('all')
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const statuses = STATUS_FILTERS[statusFilter].statuses
    const byStatus = statuses ? invoices.filter((inv) => statuses.includes(inv.paymentStatus)) : invoices
    if (!q) return byStatus
    return byStatus.filter(
      (inv) => {
        const memberName = inv.userId?.name || inv.lead?.name || ''
        const memberEmail = inv.userId?.email || inv.lead?.email || ''
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          memberName.toLowerCase().includes(q) ||
          memberEmail.toLowerCase().includes(q)
        )
      }
    )
  }, [invoices, search, statusFilter])

  const metrics = useMemo(() => {
    const total = invoices.length
    const paid = invoices.filter((i) => i.paymentStatus === 'PAID').length
    const pending = invoices.filter((i) => i.paymentStatus === 'PENDING' || i.paymentStatus === 'DRAFT').length
    const revenue = invoices
      .filter((i) => i.paymentStatus === 'PAID')
      .reduce((sum, i) => sum + i.total, 0)
    return { total, paid, pending, revenue }
  }, [invoices])

  const handleRowClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setDrawerOpen(true)
  }

  useEffect(() => {
    if (!linkedInvoiceId || invoices.length === 0) return
    const match = invoices.find((inv) => inv.id === linkedInvoiceId)
    if (match) handleRowClick(match)
    setLinkedInvoiceId(null)
  }, [linkedInvoiceId, invoices])

  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Track payments and membership activations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/admin/sales/new">
              <IconPlus className="w-4 h-4 mr-2" />
              New invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Invoices"
          value={isLoading ? null : metrics.total}
          icon={<IconReceipt className="w-4 h-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Paid"
          value={isLoading ? null : metrics.paid}
          icon={<IconCircleCheck className="w-4 h-4 text-green-600" />}
          valueClass="text-green-700"
        />
        <MetricCard
          title="Pending / Draft"
          value={isLoading ? null : metrics.pending}
          icon={<IconClock className="w-4 h-4 text-yellow-600" />}
          valueClass="text-yellow-700"
        />
        <MetricCard
          title="Revenue Collected"
          value={isLoading ? null : metrics.revenue}
          format="currency"
          icon={<IconCurrencyRupee className="w-4 h-4 text-blue-600" />}
          valueClass="text-blue-700"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{STATUS_FILTERS[statusFilter].label}</CardTitle>
              <CardDescription>Click a row to view details or download PDF</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-56" aria-label="Filter by payment status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {STATUS_FILTERS[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="w-full sm:w-64"
                placeholder="Search by invoice # or member..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {isError && (
            <p className="text-sm text-red-600 py-4">Failed to load invoices. Check backend connection.</p>
          )}
          {!isLoading && !isError && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        {search
                          ? 'No invoices match your search.'
                          : statusFilter === 'awaiting'
                            ? 'Nothing awaiting payment.'
                            : 'No invoices here yet. Start one with New sale.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(invoice)}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const name = invoice.userId?.name || invoice.lead?.name
                          const email = invoice.userId?.email || invoice.lead?.email
                          const isLead = !invoice.userId?.name && !!invoice.lead?.name
                          return (
                            <>
                              <div className="text-sm font-medium flex items-center gap-1">
                                {name || '—'}
                                {isLead && (
                                  <span className="text-xs text-muted-foreground">(Lead)</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{email ?? ''}</div>
                            </>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="font-semibold">{formatINR(invoice.total)}</TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.paymentStatus} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invoice.paymentMethod === 'NONE' ? '—' : invoice.paymentMethod.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(invoice.issuedAt)}</TableCell>
                      <TableCell className="text-sm">{formatDate(invoice.paidAt)}</TableCell>
                      <TableCell className="text-right">
                        {isAwaitingPayment(invoice) && (
                          <Button size="sm" variant="outline" asChild onClick={(e) => e.stopPropagation()}>
                            <Link href={`/admin/sales/new?invoiceId=${encodeURIComponent(invoice.id)}`}>
                              Record payment
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceDetailDrawer
        invoice={selectedInvoice}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) setSelectedInvoice(null)
        }}
      />
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number | null
  icon: React.ReactNode
  format?: 'number' | 'currency'
  valueClass?: string
}

function MetricCard({ title, value, icon, format = 'number', valueClass }: MetricCardProps) {
  const display =
    value === null
      ? null
      : format === 'currency'
        ? formatINR(value)
        : String(value)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {display === null ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={`text-2xl font-bold ${valueClass ?? ''}`}>{display}</div>
        )}
      </CardContent>
    </Card>
  )
}
