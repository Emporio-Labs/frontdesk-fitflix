'use client'

import { IconBell, IconDeviceMobile, IconTrash } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import { EnablePushCard } from '@/components/push/enable-push-card'
import {
  useCurrentSubscription,
  useMyPushDevices,
  useRemovePushDevice,
} from '@/hooks/use-push-subscription'

function formatDate(iso?: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function NotificationsSettingsPage() {
  const currentSub = useCurrentSubscription()
  const currentEndpoint = currentSub.data?.endpoint

  const devices = useMyPushDevices()
  const removeDevice = useRemovePushDevice()

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <IconBell className="h-6 w-6" />
          Notifications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Turn on push alerts so bookings, cancellations and class reminders reach you
          the moment they happen. On iPhone, alerts work only after installing this
          page to your home screen on iOS 16.4 or later.
        </p>
      </div>

      <EnablePushCard />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <IconDeviceMobile className="h-5 w-5" />
            Devices receiving your alerts
          </CardTitle>
          <CardDescription>
            Each phone or browser you enable notifications on shows up here. Remove
            any device you no longer use to stop pushes reaching it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devices.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (devices.data || []).length === 0 ? (
            <EmptyState
              icon={<IconDeviceMobile className="h-10 w-10" />}
              title="No devices registered yet"
              description="Turn on push above to register this device."
            />
          ) : (
            <ul className="divide-y">
              {(devices.data || []).map((d) => {
                const isThisDevice = d.endpoint === currentEndpoint
                return (
                  <li
                    key={d.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {d.deviceLabel || 'Unnamed device'}
                        {isThisDevice && (
                          <span className="ml-2 text-xs text-primary">This device</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Added {formatDate(d.createdAt)}
                        {d.lastNotifiedAt ? ` · Last alert ${formatDate(d.lastNotifiedAt)}` : ''}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 self-start sm:self-auto"
                      disabled={removeDevice.isPending}
                      onClick={() => removeDevice.mutate(d.endpoint)}
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
