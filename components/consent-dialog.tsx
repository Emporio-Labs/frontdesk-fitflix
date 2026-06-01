'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import { IconFileCheck } from '@tabler/icons-react'
import type { ConsentData } from '@/lib/services/onboarding.service'

interface ConsentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: ConsentData
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

function looksLikeDateKey(key: string): boolean {
  return /(?:Date|At)$/.test(key)
}

function tryFormatDate(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return DATE_FORMATTER.format(d)
}

function looksLikeUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function Field({
  label,
  value,
  isDate,
  isUrl,
}: {
  label: string
  value: unknown
  isDate?: boolean
  isUrl?: boolean
}) {
  if (isEmptyValue(value)) return null

  let display: React.ReactNode
  if (isDate) {
    display = tryFormatDate(value) ?? formatValue(value)
  } else if (isUrl && looksLikeUrl(value)) {
    display = (
      <a
        href={value}
        target="_blank"
        rel="noreferrer noopener"
        className="text-blue-600 dark:text-blue-400 hover:underline break-all"
      >
        {value}
      </a>
    )
  } else {
    display = formatValue(value)
  }

  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium mt-0.5 break-words">{display}</div>
    </div>
  )
}

const ACCEPTANCE_KEYS = [
  'accepted',
  'consentGiven',
  'consentDate',
  'signedAt',
  'acceptedAt',
] as const
const VERSION_KEYS = ['version', 'consentVersion'] as const
const SIGNATURE_KEYS = ['signature', 'signatureUrl'] as const
const AUDIT_KEYS = ['ipAddress', 'ip', 'userAgent'] as const

const LABELS: Record<string, string> = {
  accepted: 'Accepted',
  consentGiven: 'Consent Given',
  consentDate: 'Consent Date',
  signedAt: 'Signed At',
  acceptedAt: 'Accepted At',
  version: 'Version',
  consentVersion: 'Consent Version',
  signature: 'Signature',
  signatureUrl: 'Signature URL',
  ipAddress: 'IP Address',
  ip: 'IP',
  userAgent: 'User Agent',
}

const KNOWN_KEYS = new Set<string>([
  ...ACCEPTANCE_KEYS,
  ...VERSION_KEYS,
  ...SIGNATURE_KEYS,
  ...AUDIT_KEYS,
])

export function ConsentDialog({ open, onOpenChange, data }: ConsentDialogProps) {
  const accepted = !!(data?.accepted || data?.consentGiven)
  const hasAnyValue =
    data && Object.entries(data).some(([, value]) => !isEmptyValue(value))

  const extraEntries = data
    ? Object.entries(data).filter(
        ([key, value]) => !KNOWN_KEYS.has(key) && !isEmptyValue(value),
      )
    : []

  const renderSection = (title: string, keys: readonly string[]) => {
    if (!data) return null
    const visibleKeys = keys.filter((k) => !isEmptyValue((data as Record<string, unknown>)[k]))
    if (visibleKeys.length === 0) return null
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleKeys.map((key) => (
            <Field
              key={key}
              label={LABELS[key] || humanizeKey(key)}
              value={(data as Record<string, unknown>)[key]}
              isDate={looksLikeDateKey(key)}
              isUrl={key === 'signatureUrl'}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Consent Form</DialogTitle>
          <DialogDescription>
            Recorded consent for this member. Read-only view.
          </DialogDescription>
        </DialogHeader>

        {hasAnyValue ? (
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm text-muted-foreground">Consent Status</span>
              <StatusBadge status={accepted ? 'completed' : 'pending'} size="sm" />
            </div>

            {renderSection('Acceptance', ACCEPTANCE_KEYS)}
            {renderSection('Version', VERSION_KEYS)}
            {renderSection('Signature', SIGNATURE_KEYS)}
            {renderSection('Audit', AUDIT_KEYS)}

            {extraEntries.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Other</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {extraEntries.map(([key, value]) => (
                    <Field
                      key={key}
                      label={humanizeKey(key)}
                      value={value}
                      isDate={looksLikeDateKey(key)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={<IconFileCheck className="h-10 w-10" />}
            title="No consent recorded"
            description="This member has not signed the consent form yet."
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
