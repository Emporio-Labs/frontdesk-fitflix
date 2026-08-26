'use client'

import { IconActivity, IconClock } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/skeleton-loader'
import { useUserBcaMetrics } from '@/hooks/use-users'

function BcaStat({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined || value === '' ? '—' : String(value)
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{display}</p>
    </div>
  )
}

function formatScanDate(value?: string) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function round(value: number | null | undefined, digits = 1): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  return value.toFixed(digits)
}

/**
 * Staff-facing view of a member's ActiveX body-composition scans. Reads the
 * same `bca_metrics` collection the member app's dashboard already renders
 * (via GET /users/:id/bca-metrics, added alongside this component) — the
 * front desk previously had no visibility into scan results at all, only
 * the `activeXTestCompleted` completion boolean on the onboarding card.
 */
export function MemberBcaMetrics({ userId }: { userId: string }) {
  const { data: history, isLoading, isError } = useUserBcaMetrics(userId)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconActivity className="h-4 w-4 text-muted-foreground" />
              Body Composition (Active X)
            </CardTitle>
            <CardDescription>
              Scan results synced from the ActiveX device — either the member syncing in the
              app, or the scan station pushing results directly.
            </CardDescription>
          </div>
          {history && history.length > 0 && (
            <Badge variant="outline">{history.length} scan{history.length === 1 ? '' : 's'}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-red-500">Failed to load body composition data.</p>
        ) : !history || history.length === 0 ? (
          <EmptyState
            icon={<IconActivity className="h-8 w-8" />}
            title="No scans yet"
            description="Nothing on file yet — the member needs to complete an Active X scan, either at the centre or by syncing from the app."
          />
        ) : (
          (() => {
            const latest = history[0]
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconClock className="h-3.5 w-3.5" />
                  Latest scan: {formatScanDate(latest.recordedAt)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <BcaStat label="Weight" value={round(latest.vitals?.weight_kg) ? `${round(latest.vitals.weight_kg)} kg` : null} />
                  <BcaStat label="BMI" value={round(latest.vitals?.bmi)} />
                  <BcaStat label="Body Fat" value={round(latest.bodyComposition?.body_fat_percent) ? `${round(latest.bodyComposition.body_fat_percent)}%` : null} />
                  <BcaStat label="Skeletal Muscle" value={round(latest.bodyComposition?.skeletal_muscle_mass_kg) ? `${round(latest.bodyComposition.skeletal_muscle_mass_kg)} kg` : null} />
                  <BcaStat label="Visceral Fat" value={round(latest.bodyComposition?.visceral_fat, 0)} />
                  <BcaStat label="Metabolic Age" value={round(latest.bodyComposition?.body_age, 0)} />
                  <BcaStat label="BMR" value={round(latest.bodyComposition?.basal_metabolic_rate_cal, 0) ? `${round(latest.bodyComposition.basal_metabolic_rate_cal, 0)} cal` : null} />
                  <BcaStat label="Body Water" value={round(latest.bodyComposition?.total_body_water_L) ? `${round(latest.bodyComposition.total_body_water_L)} L` : null} />
                  <BcaStat label="Ideal Weight" value={round(latest.idealBodyWeight_kg) ? `${round(latest.idealBodyWeight_kg)} kg` : null} />
                </div>
                {history.length > 1 && (
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    {history.length - 1} earlier scan{history.length - 1 === 1 ? '' : 's'} on file, oldest{' '}
                    {formatScanDate(history[history.length - 1]?.recordedAt)}.
                  </p>
                )}
              </div>
            )
          })()
        )}
      </CardContent>
    </Card>
  )
}
