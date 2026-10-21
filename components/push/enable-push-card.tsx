'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  IconAlertTriangle,
  IconBell,
  IconBellOff,
  IconDeviceMobile,
  IconInfoCircle,
} from '@tabler/icons-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  useCurrentSubscription,
  useDisablePush,
  useEnablePush,
  usePushCapabilities,
  useSendTestPush,
  useUpdatePushPreferences,
} from '@/hooks/use-push-subscription'
import {
  DEFAULT_PUSH_PREFERENCES,
  type PushPreferences,
} from '@/lib/services/push.service'

function permissionLabel(p: NotificationPermission | 'unavailable'): {
  label: string
  status: 'success' | 'warning' | 'error' | 'neutral'
} {
  switch (p) {
    case 'granted':
      return { label: 'Allowed', status: 'success' }
    case 'denied':
      return { label: 'Blocked by browser', status: 'error' }
    case 'default':
      return { label: 'Not asked yet', status: 'warning' }
    default:
      return { label: 'Not available', status: 'neutral' }
  }
}

export function EnablePushCard() {
  const caps = usePushCapabilities()
  const currentSub = useCurrentSubscription()
  const enable = useEnablePush()
  const disable = useDisablePush()
  const updatePrefs = useUpdatePushPreferences()
  const sendTest = useSendTestPush()

  const [prefs, setPrefs] = useState<PushPreferences>(DEFAULT_PUSH_PREFERENCES)

  useEffect(() => {
    // Reset local prefs when the browser subscription flips on/off, so
    // toggling refreshes checkbox state.
  }, [currentSub.data])

  const isEnabled = Boolean(currentSub.data)
  const permission = permissionLabel(caps.permission)

  const iosBlocker = useMemo(() => {
    if (!caps.isIos) return null
    if (!caps.isStandalone) {
      return 'not-installed' as const
    }
    if (caps.iosVersion !== null && caps.iosVersion < 16.4) {
      return 'ios-too-old' as const
    }
    return null
  }, [caps])

  if (!caps.supported) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <IconBellOff className="h-5 w-5" />
            Push notifications
          </CardTitle>
          <CardDescription>
            This browser can&apos;t deliver push notifications from Fitflix.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <IconInfoCircle className="h-4 w-4" />
            <AlertTitle>Unsupported browser</AlertTitle>
            <AlertDescription>
              To get real-time alerts for bookings and classes, open Fitflix in a
              current version of Chrome, Edge, Firefox, or Safari.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (iosBlocker) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <IconDeviceMobile className="h-5 w-5" />
            Install to Home Screen
          </CardTitle>
          <CardDescription>
            On iPhone, alerts work only after installing this page to your home
            screen on iOS 16.4 or later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {iosBlocker === 'ios-too-old' && (
            <Alert variant="destructive">
              <IconAlertTriangle className="h-4 w-4" />
              <AlertTitle>iOS version too old</AlertTitle>
              <AlertDescription>
                You&apos;re on iOS{' '}
                <span className="font-medium">{caps.iosVersion?.toFixed(1)}</span>. Web
                push requires iOS 16.4 or later.
              </AlertDescription>
            </Alert>
          )}
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Tap the Share button in Safari&apos;s toolbar.</li>
            <li>Choose <span className="font-medium">Add to Home Screen</span>.</li>
            <li>
              Open Fitflix from the new home-screen icon and come back to this page —
              the toggle will appear.
            </li>
          </ol>
        </CardContent>
      </Card>
    )
  }

  const savePreferences = (next: PushPreferences) => {
    setPrefs(next)
    if (isEnabled) updatePrefs.mutate(next)
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <IconBell className="h-5 w-5" />
              Push notifications
            </CardTitle>
            <CardDescription>
              Get an alert on this device the moment a session is booked, cancelled or
              rescheduled — and 15 minutes before any class you teach.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Label htmlFor="push-toggle" className="text-sm">
              {isEnabled ? 'Enabled on this device' : 'Off'}
            </Label>
            <Switch
              id="push-toggle"
              checked={isEnabled}
              disabled={enable.isPending || disable.isPending}
              onCheckedChange={(v) => {
                if (v) enable.mutate(prefs)
                else disable.mutate()
              }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Browser permission:</span>
          <Badge
            variant={
              permission.status === 'success'
                ? 'default'
                : permission.status === 'error'
                ? 'destructive'
                : 'secondary'
            }
          >
            {permission.label}
          </Badge>
          {caps.isStandalone && (
            <Badge variant="secondary">Installed on this device</Badge>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Alert me about</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <PrefCheck
              label="1-on-1 bookings, cancels & reschedules"
              value={prefs.oneOnOneEvents}
              onChange={(v) => savePreferences({ ...prefs, oneOnOneEvents: v })}
            />
            <PrefCheck
              label="Nutrition consultations"
              value={prefs.consultationEvents}
              onChange={(v) => savePreferences({ ...prefs, consultationEvents: v })}
            />
            <PrefCheck
              label="15 minutes before a class I teach"
              value={prefs.classReminder}
              onChange={(v) => savePreferences({ ...prefs, classReminder: v })}
            />
          </div>
        </div>

        {isEnabled && (
          <div className="pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => sendTest.mutate()}
              disabled={sendTest.isPending}
            >
              {sendTest.isPending ? 'Sending…' : 'Send test notification'}
            </Button>
          </div>
        )}

        {caps.permission === 'denied' && (
          <Alert variant="destructive">
            <IconAlertTriangle className="h-4 w-4" />
            <AlertTitle>Notifications are blocked</AlertTitle>
            <AlertDescription>
              Open your browser settings for this site and switch notifications back
              on. Fitflix can&apos;t re-ask once the permission has been denied.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function PrefCheck({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox checked={value} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span>{label}</span>
    </label>
  )
}
