'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from '@tabler/icons-react'
import { useInvoices } from '@/hooks/use-invoices'
import { Invoice } from '@/lib/services/invoice.service'
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

export default function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: invoices = [], isLoading, isError, refetch } = useInvoices()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return invoices
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.userId?.name?.toLowerCase().includes(q) ||
        inv.userId?.email?.toLowerCase().includes(q)
    )
  }, [invoices, search])

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

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Track payments and membership activations</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <IconRefresh className="w-4 h-4 mr-2" />
          Refresh
        </Button>
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>Click a row to view details, mark as paid, or download PDF</CardDescription>
            </div>
            <Input
              className="w-64"
              placeholder="Search by invoice # or member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        {search ? 'No invoices match your search.' : 'No invoices yet. Generate one from a lead.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((invoice) => (
                    <TableRow
                      key={invoice._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(invoice)}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{invoice.userId?.name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{invoice.userId?.email ?? ''}</div>
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
