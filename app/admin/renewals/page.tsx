'use client'

import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { IconAlertTriangle, IconPhone, IconRefresh, IconRepeat } from '@tabler/icons-react'
import { useRenewalReminders } from '@/hooks/use-memberships'
import type { RenewalTarget } from '@/lib/services/membership.service'

function formatDateOnly(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value.split('T')[0] || value
  return d.toISOString().slice(0, 10)
}

function renewalDayLabel(days: number) {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `in ${days} days`
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'paused':
      return 'bg-yellow-100 text-yellow-800'
    case 'expired':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function handleRenewalCall(target: RenewalTarget) {
  if (!target.phone) {
    toast.error('Phone number is missing for this member')
    return
  }
  window.location.href = `tel:${target.phone.replace(/\D/g, '')}`
}

function handleRenewalWhatsApp(target: RenewalTarget) {
  if (!target.phone) {
    toast.error('Phone number is missing for this member')
    return
  }
  const digits = target.phone.replace(/\D/g, '')
  const firstName = target.memberName.split(' ')[0] || 'there'
  const message = encodeURIComponent(
    `Hi ${firstName}, this is Fitflix. Your ${target.planName} membership expires on ${target.endDateIst}. Would you like to renew it?`
  )
  window.open(`https://wa.me/${digits}?text=${message}`, '_blank', 'noopener,noreferrer')
}

function renderRenewalCard(target: RenewalTarget) {
  return (
    <div
      key={target.membershipId}
      className={`rounded-md border p-3 ${
        target.bucket === 'overdue' ? 'border-red-200 bg-red-50' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">
            {target.memberUnknown ? (
              <span className="text-muted-foreground">{target.memberName}</span>
            ) : (
              <Link href={`/admin/users/${target.userId}`} className="hover:underline">
                {target.memberName}
              </Link>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{target.planName}</div>
          <div className="text-xs text-muted-foreground">
            {target.phone || 'No phone on file'}
          </div>
          <div
            className={`text-xs ${target.bucket === 'overdue' ? 'text-red-700' : 'text-muted-foreground'}`}
          >
            {target.bucket === 'overdue' ? 'Expired' : 'Expires'} {formatDateOnly(target.endDate)} ·{' '}
            {renewalDayLabel(target.daysUntilExpiry)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={getStatusColor(String(target.status).toLowerCase())}>
            {target.status}
          </Badge>
          {target.price > 0 && (
            <span className="text-xs text-muted-foreground">
              {target.currency} {target.price}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        {!target.memberUnknown && (
          <Button size="sm" asChild>
            <Link href={`/admin/sales/new?userId=${target.userId}&mode=renew`}>
              <IconRepeat className="mr-1 h-4 w-4" /> Renew
            </Link>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={!target.phone}
          onClick={() => handleRenewalCall(target)}
        >
          <IconPhone className="mr-1 h-4 w-4" /> Call
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!target.phone}
          onClick={() => handleRenewalWhatsApp(target)}
        >
          WhatsApp
        </Button>
        {!target.memberUnknown && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/admin/users/${target.userId}`}>View member</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

export default function RenewalsPage() {
  const { data: renewals, isLoading: renewalsLoading, refetch } = useRenewalReminders()

  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Renewals</h2>
          <p className="text-muted-foreground">Memberships expiring this month — call, then renew</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <IconRefresh className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membership Renewals</CardTitle>
          <CardDescription>
            Members whose membership expires this month ({renewals?.monthLabel}) — call them to
            renew.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-md border p-3">
              <div className="text-2xl font-bold text-red-700">{renewals?.overdue.length ?? 0}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-2xl font-bold text-amber-600">
                {renewals?.dueThisWeek.length ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Due this week</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-2xl font-bold">{renewals?.upcoming.length ?? 0}</div>
              <div className="text-xs text-muted-foreground">Later this month</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-2xl font-bold">{renewals?.total ?? 0}</div>
              <div className="text-xs text-muted-foreground">Total this month</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {renewalsLoading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ) : (renewals?.total ?? 0) === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No memberships expiring this month. Nothing to chase right now.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconAlertTriangle className="h-5 w-5 text-red-600" /> Overdue
              </CardTitle>
              <CardDescription>{renewals?.overdue.length ?? 0} expired, awaiting renewal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(renewals?.overdue.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">No overdue renewals.</p>
              )}
              {renewals?.overdue.map(renderRenewalCard)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Due This Week</CardTitle>
              <CardDescription>{renewals?.dueThisWeek.length ?? 0} expiring within 7 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(renewals?.dueThisWeek.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">Nothing due this week.</p>
              )}
              {renewals?.dueThisWeek.map(renderRenewalCard)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Later This Month</CardTitle>
              <CardDescription>{renewals?.upcoming.length ?? 0} expiring later this month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(renewals?.upcoming.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">Nothing further out this month.</p>
              )}
              {renewals?.upcoming.map(renderRenewalCard)}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
