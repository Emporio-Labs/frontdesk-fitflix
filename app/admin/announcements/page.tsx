'use client'

import { useMemo, useState } from 'react'
import { IconSpeakerphone, IconSend, IconLock } from '@tabler/icons-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTable } from '@/components/skeleton-loader'
import { useLocationScope } from '@/components/location-scope-provider'
import { useCanAccess } from '@/hooks/use-auth'
import {
  useMemberNotifications,
  useSendMemberNotification,
} from '@/hooks/use-member-notifications'
import {
  NOTIFICATION_AUDIENCES,
  type NotificationAudience,
} from '@/lib/services/member-notification.service'

type ComposeForm = {
  title: string
  body: string
  /** 'all' is the UI spelling of a null (company-wide) locationId. */
  locationId: string
  audience: NotificationAudience
}

const AUDIENCE_LABEL: Record<NotificationAudience, string> = {
  all: 'All members',
  member: 'Active members',
  lapsed: 'Lapsed members',
}

function formatSentAt(value?: string) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AnnouncementsPage() {
  const { locations, selectedLocationId, isBranchRestricted, assignedBranchIds } = useLocationScope()
  const canSend = useCanAccess('member_notifications', 'create')
  const multiBranch = locations.length > 1

  const sendNotification = useSendMemberNotification()
  const { data: history = [], isLoading, isError } = useMemberNotifications()

  const [form, setForm] = useState<ComposeForm>({
    title: '',
    body: '',
    // Default to the branch the console is scoped to; 'all' when unscoped.
    locationId: selectedLocationId ?? (isBranchRestricted && assignedBranchIds.length > 0 ? assignedBranchIds[0] : 'all'),
    audience: 'all',
  })
  const [confirmOpen, setConfirmOpen] = useState(false)

  const set = <K extends keyof ComposeForm>(key: K, value: ComposeForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const locationName = (id: string | null) =>
    id ? (locations.find((l) => l._id === id)?.name ?? 'Unknown club') : 'All clubs'

  // With a single branch the picker is hidden (FX-20.4); the backend resolves
  // the club from the X-Location-Id header, so send it company-wide (null).
  const targetLocationId = useMemo(() => {
    if (isBranchRestricted && assignedBranchIds.length > 0) {
      if (form.locationId !== 'all' && assignedBranchIds.includes(form.locationId)) {
        return form.locationId
      }
      return selectedLocationId || assignedBranchIds[0]
    }
    return multiBranch && form.locationId !== 'all' ? form.locationId : null
  }, [isBranchRestricted, assignedBranchIds, selectedLocationId, multiBranch, form.locationId])

  const canSubmit = Boolean(form.title.trim() && form.body.trim()) && canSend

  const handleConfirmSend = async () => {
    try {
      await sendNotification.mutateAsync({
        title: form.title.trim(),
        body: form.body.trim(),
        locationId: targetLocationId,
        audience: form.audience,
      })
      setForm((f) => ({ ...f, title: '', body: '' }))
    } catch {
      // error toast handled in the hook
    } finally {
      setConfirmOpen(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <IconSpeakerphone className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Send a club-wide notification to members. Only the chosen club&apos;s
            members receive it; online classes and offers stay visible to everyone.
          </p>
        </div>
      </div>

      {/* Compose */}
      <Card>
        <CardHeader>
          <CardTitle>New notification</CardTitle>
          <CardDescription>
            Members see this in the app. The backend delivers only to the selected
            club and audience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="notif-title">Title</Label>
            <Input
              id="notif-title"
              value={form.title}
              maxLength={120}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Pool closed this weekend"
              disabled={!canSend}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notif-body">Message</Label>
            <Textarea
              id="notif-body"
              value={form.body}
              rows={4}
              maxLength={500}
              onChange={(e) => set('body', e.target.value)}
              placeholder="The pool is closed Sat–Sun for maintenance. All other facilities are open as usual."
              disabled={!canSend}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Branch picker — hidden with a single branch (FX-20.4). */}
            {isBranchRestricted && assignedBranchIds.length <= 1 ? (
              <div className="space-y-1.5">
                <Label>Club</Label>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                  {locations[0]?.name || 'Assigned Club'}
                </div>
              </div>
            ) : (
              multiBranch && (
                <div className="space-y-1.5">
                  <Label>Club</Label>
                  <Select
                    value={form.locationId}
                    onValueChange={(v) => set('locationId', v)}
                    disabled={!canSend}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {!isBranchRestricted && <SelectItem value="all">All clubs (company-wide)</SelectItem>}
                      {locations.map((l) => (
                        <SelectItem key={l._id} value={l._id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            )}

            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select
                value={form.audience}
                onValueChange={(v) => set('audience', v as NotificationAudience)}
                disabled={!canSend}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_AUDIENCES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {canSend ? (
              <p className="text-xs text-muted-foreground">
                Goes to <strong>{locationName(targetLocationId)}</strong> ·{' '}
                {AUDIENCE_LABEL[form.audience]}
              </p>
            ) : (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <IconLock className="h-3.5 w-3.5" /> You don&apos;t have permission
                to send notifications.
              </p>
            )}
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSubmit || sendNotification.isPending}
            >
              <IconSend className="mr-2 h-4 w-4" />
              {sendNotification.isPending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Sent</CardTitle>
          <CardDescription>Previously sent notifications for this scope.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable />
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Couldn&apos;t load sent notifications.
            </div>
          ) : history.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<IconSpeakerphone className="h-10 w-10" />}
                title="No notifications sent yet"
                description="Club-wide notifications you send will appear here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="pl-6">Title</TableHead>
                    {multiBranch && <TableHead>Club</TableHead>}
                    <TableHead>Audience</TableHead>
                    <TableHead className="hidden md:table-cell">Recipients</TableHead>
                    <TableHead className="pr-6 text-right">Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((n) => (
                    <TableRow key={n._id}>
                      <TableCell className="pl-6">
                        <div className="font-medium">{n.title}</div>
                        <div className="max-w-[420px] truncate text-xs text-muted-foreground">
                          {n.body}
                        </div>
                      </TableCell>
                      {multiBranch && (
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {locationName(n.locationId)}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline">{AUDIENCE_LABEL[n.audience] ?? n.audience}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {n.recipientCount != null ? n.recipientCount : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap pr-6 text-right text-muted-foreground">
                        {formatSentAt(n.sentAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sending a broadcast is outward-facing and can't be unsent — confirm first. */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends <strong>&ldquo;{form.title.trim() || 'Untitled'}&rdquo;</strong>{' '}
              to <strong>{locationName(targetLocationId)}</strong> (
              {AUDIENCE_LABEL[form.audience]}). It can&apos;t be unsent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendNotification.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend} disabled={sendNotification.isPending}>
              {sendNotification.isPending ? 'Sending…' : 'Send'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
