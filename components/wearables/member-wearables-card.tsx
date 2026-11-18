'use client'

import { IconDeviceWatch, IconLock } from '@tabler/icons-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemberWearables } from '@/hooks/use-wearables'
import type { WearableDay, WearableSource } from '@/types/wearables'

const SOURCE_LABEL: Record<WearableSource, string> = {
  APPLE_HEALTH: 'Apple Health',
  HEALTH_CONNECT: 'Health Connect',
}

const DAYS = 14

function average(values: (number | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number')
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function shortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

/**
 * A member's watch data (via Apple Health / Health Connect), last 14 days.
 *
 * Only appears with data when the member turned on "Share with my coach" in
 * the app; otherwise it says so. The backend decides — this component never
 * gets the data in the first place unless sharing is on.
 */
export function MemberWearablesCard({ userId }: { userId: string }) {
  const { data, isLoading, isError } = useMemberWearables(userId, DAYS)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconDeviceWatch className="h-4 w-4 text-muted-foreground" />
              <span>Wearable activity</span>
            </CardTitle>
            <CardDescription className="mt-0.5 flex items-center gap-1.5">
              <IconLock className="h-3.5 w-3.5 text-amber-500" />
              <span>Shared by the member with their coach — read only</span>
            </CardDescription>
          </div>
          {data?.sharing &&
            data.connections.map((c) => (
              <Badge key={c.source} variant="outline">
                {SOURCE_LABEL[c.source]}
                {c.lastSyncedAt &&
                  ` · synced ${new Date(c.lastSyncedAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}`}
              </Badge>
            ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Wearable data isn&apos;t available for this member.
          </p>
        ) : !data?.sharing ? (
          <p className="text-sm text-muted-foreground">
            This member hasn&apos;t shared wearable data with their coach. They can
            turn it on in the FitFlix app under Profile → Connected devices.
          </p>
        ) : (
          <SharedData daily={data.daily} />
        )}
      </CardContent>
    </Card>
  )
}

function SharedData({ daily }: { daily: WearableDay[] }) {
  const withData = daily.filter((d) => d.source !== null)
  if (withData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sharing is on, but nothing has synced in the last {DAYS} days.
      </p>
    )
  }

  const steps = average(withData.map((d) => d.steps))
  const kcal = average(withData.map((d) => d.activeCaloriesKcal))
  const rhr = average(withData.map((d) => d.restingHeartRate))
  const workouts = withData.reduce((a, d) => a + (d.workoutCount ?? 0), 0)
  const latestWeight = [...withData].reverse().find((d) => d.weightKg != null)?.weightKg

  const chart = daily.map((d) => ({ date: shortDate(d.date), steps: d.steps ?? 0 }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Avg steps / day" value={steps == null ? '—' : Math.round(steps).toLocaleString('en-IN')} />
        <Stat label="Avg active kcal" value={kcal == null ? '—' : Math.round(kcal).toLocaleString('en-IN')} />
        <Stat label="Avg resting HR" value={rhr == null ? '—' : `${Math.round(rhr)} bpm`} />
        <Stat label={`Workouts (${DAYS}d)`} value={String(workouts)} />
        <Stat label="Latest weight" value={latestWeight == null ? '—' : `${latestWeight.toFixed(1)} kg`} />
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [Number(v).toLocaleString('en-IN'), 'Steps']} />
            <Bar dataKey="steps" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Sleep from the watch appears in the member&apos;s sleep log alongside nights they logged by hand.
      </p>
    </div>
  )
}
