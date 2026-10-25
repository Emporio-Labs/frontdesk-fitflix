'use client'

import Link from 'next/link'
import { IconDownload, IconPlus, IconUser } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Invoice } from '@/lib/services/invoice.service'
import type { Membership } from '@/lib/services/membership.service'
import { formatDay, invoicePersonName, lastCoveredDay, toIsoDay, todayIso } from './sale-utils'

interface Props {
  invoice: Invoice
  /** The membership PAID created; absent when resuming an already-paid invoice. */
  membership: Membership | null
  branchName: string
  planName: string
  startDate: string
  endDate: string
  credits: number
  downloading: boolean
  onDownloadPdf: () => void
  onStartAnother: () => void
}

export function ReadyStep({
  invoice,
  membership,
  branchName,
  planName,
  startDate,
  endDate,
  credits,
  downloading,
  onDownloadPdf,
  onStartAnother,
}: Props) {
  const name = invoicePersonName(invoice)
  const firstName = name.split(' ')[0]
  const start = toIsoDay(membership?.startDate) || startDate
  // A stored end is exclusive; `endDate` (computed here) is already the last day.
  const end = membership?.endDate ? lastCoveredDay(membership.endDate) : endDate
  const status = membership?.status ?? (start && start > todayIso() ? 'Upcoming' : 'Active')
  const upcoming = status === 'Upcoming'
  const userId = membership?.userId || invoice.userId?.id

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {firstName} is {upcoming ? 'signed up' : 'a member'}
          {branchName ? ` at ${branchName}` : ''}
        </h1>
        <p className="text-muted-foreground">
          Payment recorded, invoice {invoice.invoiceNumber} paid
          {upcoming ? `. The membership starts on ${formatDay(start)}.` : ', membership active.'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3 rounded-2xl border bg-muted/40 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-bold">{membership?.planName || planName}</span>
            <Badge
              variant="outline"
              className={
                upcoming
                  ? 'border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200'
                  : 'border-green-300 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
              }
            >
              {status}
            </Badge>
          </div>
          <dl className="flex flex-col gap-1.5 text-sm">
            <Row label="Member" value={name} />
            {branchName && <Row label="Branch" value={branchName} />}
            <Row label="Starts" value={formatDay(start)} />
            <Row label="Ends" value={formatDay(end)} />
            <Row
              label="Credits"
              value={`${membership?.creditsIncluded ?? credits}${upcoming ? ', usable from start' : ''}`}
            />
            <Row label="Invoice" value={`${invoice.invoiceNumber} · Paid`} />
          </dl>
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next, while they&apos;re at the desk</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <ActionButton
              icon={<IconDownload className="size-5" />}
              title={downloading ? 'Downloading…' : 'Download invoice PDF'}
              sub="Print it or share it with the member"
              onClick={onDownloadPdf}
              disabled={downloading}
            />
            {userId && (
              <Link
                href={`/admin/users/${userId}`}
                className="flex min-h-16 items-start gap-3 rounded-lg border p-3.5 text-left transition-colors hover:border-primary/50"
              >
                <IconUser className="mt-0.5 size-5 shrink-0" />
                <span>
                  <b className="block">Open member profile</b>
                  <span className="text-[13px] text-muted-foreground">Trainer, onboarding, history</span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 border-t pt-4">
        <div className="flex-1" />
        <Button variant="outline" className="h-11" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
        <Button className="h-11" onClick={onStartAnother}>
          <IconPlus className="size-4" />
          Start another sale
        </Button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}

function ActionButton({
  icon,
  title,
  sub,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-16 items-start gap-3 rounded-lg border p-3.5 text-left transition-colors hover:border-primary/50 disabled:opacity-60"
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>
        <b className="block">{title}</b>
        <span className="text-[13px] text-muted-foreground">{sub}</span>
      </span>
    </button>
  )
}
