import { Badge } from '@/components/ui/badge'
import { InvoicePaymentStatus } from '@/lib/services/invoice.service'

const statusConfig: Record<InvoicePaymentStatus, { label: string; className: string }> = {
  DRAFT:     { label: 'Draft',     className: 'bg-gray-100 text-gray-700 border-gray-300' },
  PENDING:   { label: 'Pending',   className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  PAID:      { label: 'Paid',      className: 'bg-green-100 text-green-800 border-green-300' },
  FAILED:    { label: 'Failed',    className: 'bg-red-100 text-red-800 border-red-300' },
  CANCELLED: { label: 'Cancelled', className: 'bg-orange-100 text-orange-800 border-orange-300' },
  REFUNDED:  { label: 'Refunded',  className: 'bg-purple-100 text-purple-800 border-purple-300' },
}

interface Props {
  status: InvoicePaymentStatus
}

export function InvoiceStatusBadge({ status }: Props) {
  const config = statusConfig[status] ?? statusConfig.DRAFT
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
