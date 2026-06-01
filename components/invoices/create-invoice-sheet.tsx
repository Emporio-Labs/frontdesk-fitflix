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
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { IconFileInvoice, IconCheck } from '@tabler/icons-react'
import { Lead } from '@/lib/services/lead.service'
import { MembershipPlan } from '@/lib/services/membership-plan.service'
import { useMembershipPlans } from '@/hooks/use-membership-plans'
import { useCreateInvoice } from '@/hooks/use-invoices'

const TAX_RATE = 0.18

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

interface Props {
  lead: Lead
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateInvoiceSheet({ lead, open, onOpenChange, onSuccess }: Props) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [discount, setDiscount] = useState<string>('0')

  const { data: plans = [], isLoading: plansLoading } = useMembershipPlans()
  const createInvoice = useCreateInvoice()

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null

  const subtotal = selectedPlan?.totalPrice ?? 0
  const discountAmount = Math.min(Math.max(Number(discount) || 0, 0), subtotal)
  const taxableAmount = subtotal - discountAmount
  const taxAmount = Math.round(taxableAmount * TAX_RATE)
  const total = taxableAmount + taxAmount

  const handleGenerate = async () => {
    if (!selectedPlan) return

    await createInvoice.mutateAsync({
      leadId: lead.id,
      membershipPlanId: selectedPlan.id,
      items: [
        {
          name: selectedPlan.planName,
          price: selectedPlan.totalPrice,
          quantity: 1,
        },
      ],
      discount: discountAmount,
      tax: taxAmount,
    })

    setSelectedPlanId('')
    setDiscount('0')
    onOpenChange(false)
    onSuccess?.()
  }

  const handleClose = () => {
    setSelectedPlanId('')
    setDiscount('0')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <IconFileInvoice className="w-5 h-5" />
            Create Invoice
          </SheetTitle>
          <SheetDescription>
            Generate an invoice for this lead. Payment and membership activation happen after marking the invoice as paid.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Lead Info */}
          <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
            <p className="text-sm font-semibold">{lead.name}</p>
            <p className="text-xs text-muted-foreground">{lead.email}</p>
            {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
            <div className="pt-1">
              <Badge variant="outline" className="text-xs capitalize">{lead.status}</Badge>
              {lead.interestedIn && (
                <span className="ml-2 text-xs text-muted-foreground">Interested in: {lead.interestedIn}</span>
              )}
            </div>
          </div>

          {/* Membership Plan Selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Select Membership Plan</p>
            {plansLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No membership plans available. Create one in Membership Plans first.</p>
            ) : (
              <div className="grid gap-2">
                {plans.filter((p) => p.status === 'Active').map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlanId === plan.id}
                    onSelect={() => setSelectedPlanId(plan.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Manual Discount (₹)</label>
            <Input
              type="number"
              min="0"
              max={subtotal}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
              disabled={!selectedPlan}
            />
          </div>

          {/* Total Breakdown */}
          {selectedPlan && (
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="text-red-600">− {formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>GST (18%)</span>
                <span>{formatINR(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>Total</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={createInvoice.isPending}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedPlan || createInvoice.isPending}
              onClick={handleGenerate}
            >
              {createInvoice.isPending ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface PlanCardProps {
  plan: MembershipPlan
  selected: boolean
  onSelect: () => void
}

function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all border-2 ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
      onClick={onSelect}
    >
      <CardContent className="flex items-center justify-between py-3 px-4">
        <div>
          <p className="text-sm font-medium">{plan.planName}</p>
          <p className="text-xs text-muted-foreground">{plan.durationMonths} month{plan.durationMonths !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(plan.totalPrice)}
          </span>
          {selected && <IconCheck className="w-4 h-4 text-primary" />}
        </div>
      </CardContent>
    </Card>
  )
}
