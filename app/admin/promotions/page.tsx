'use client'

import { useMemo, useState } from 'react'
import {
  IconAlertTriangle,
  IconEdit,
  IconExternalLink,
  IconSpeakerphone,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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
import { useLocationScope } from '@/components/location-scope-provider'
import { SkeletonTable } from '@/components/skeleton-loader'
import {
  useCreatePromotion,
  useDeletePromotion,
  usePromotions,
  useUpdatePromotion,
} from '@/hooks/use-promotions'
import type {
  CreatePromotionPayload,
  Promotion,
  PromotionLinkType,
} from '@/lib/services/promotion.service'

/**
 * Whether a promotion is actually on screen right now.
 *
 * `isActive` alone doesn't answer that — a switched-on promotion whose window
 * hasn't opened is invisible to members, and the most common support question
 * is "why isn't my promo showing". Deriving the real state makes that legible
 * without cross-referencing two dates by eye.
 */
type PromotionState = 'live' | 'scheduled' | 'expired' | 'off'

const derivePromotionState = (
  promotion: Promotion,
  now = new Date()
): PromotionState => {
  if (!promotion.isActive) return 'off'
  const from = new Date(promotion.activeFrom)
  const to = new Date(promotion.activeTo)
  if (!Number.isNaN(from.getTime()) && now < from) return 'scheduled'
  if (!Number.isNaN(to.getTime()) && now > to) return 'expired'
  return 'live'
}

const STATE_LABEL: Record<PromotionState, string> = {
  live: 'Live',
  scheduled: 'Scheduled',
  expired: 'Expired',
  off: 'Off',
}

const STATE_VARIANT: Record<
  PromotionState,
  'default' | 'secondary' | 'outline'
> = {
  live: 'default',
  scheduled: 'outline',
  expired: 'secondary',
  off: 'secondary',
}

const LINK_TYPES: { value: PromotionLinkType; label: string }[] = [
  { value: 'class', label: 'Class or event' },
  { value: 'therapy', label: 'Recovery' },
  { value: 'plan', label: 'Membership plan' },
  { value: 'url', label: 'External URL' },
]

/** `datetime-local` needs `YYYY-MM-DDTHH:mm` in local time, not an ISO string. */
const toLocalInput = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

const formatWindow = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const emptyForm = {
  title: '',
  imageUrl: '',
  subtext: '',
  tag: '',
  // 'both' is the UI spelling of a null mode.
  mode: 'both' as 'both' | 'online' | 'offline',
  linkType: 'url' as PromotionLinkType,
  targetId: '',
  url: '',
  activeFrom: '',
  activeTo: '',
  priority: '0',
  isActive: true,
  // 'all' is the UI spelling of a null locationId.
  locationId: 'all',
}

type FormState = typeof emptyForm

export default function PromotionsPage() {
  const { locations, selectedLocation } = useLocationScope()
  // Staff view: the whole list, including promos that are off or out of window.
  const { data: promotions, isLoading } = usePromotions(true)
  const createPromotion = useCreatePromotion()
  const updatePromotion = useUpdatePromotion()
  const deletePromotion = useDeletePromotion()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Promotion | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const openCreate = () => {
    setEditing(null)
    setError(null)
    setForm({
      ...emptyForm,
      // Default a new promo to the branch being viewed, so a scoped admin
      // doesn't accidentally publish company-wide.
      locationId: selectedLocation?._id ?? 'all',
    })
    setFormOpen(true)
  }

  const openEdit = (promotion: Promotion) => {
    setEditing(promotion)
    setError(null)
    setForm({
      title: promotion.title,
      imageUrl: promotion.imageUrl,
      subtext: promotion.subtext,
      tag: promotion.tag,
      mode: promotion.mode ?? 'both',
      linkType: promotion.link.type,
      targetId: promotion.link.targetId ?? '',
      url: promotion.link.url ?? '',
      activeFrom: toLocalInput(promotion.activeFrom),
      activeTo: toLocalInput(promotion.activeTo),
      priority: String(promotion.priority),
      isActive: promotion.isActive,
      locationId: promotion.locationId ?? 'all',
    })
    setFormOpen(true)
  }

  /**
   * Mirrors the backend's zod rules so a mistake is caught before a round trip.
   * The server re-validates regardless — this is for the admin's benefit, not
   * a substitute.
   */
  const validate = (): string | null => {
    if (!form.title.trim()) return 'A title is required'
    if (!form.imageUrl.trim()) return 'An image URL is required'
    if (form.linkType === 'url') {
      if (!form.url.trim()) return 'An external URL is required for a URL link'
    } else if (!form.targetId.trim()) {
      return `A target id is required for a ${form.linkType} link`
    }
    if (!form.activeFrom || !form.activeTo) return 'Both window dates are required'
    if (new Date(form.activeTo) <= new Date(form.activeFrom)) {
      return 'The window must end after it starts'
    }
    return null
  }

  const submit = async () => {
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError(null)

    const payload: CreatePromotionPayload = {
      locationId: form.locationId === 'all' ? null : form.locationId,
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      subtext: form.subtext.trim(),
      tag: form.tag.trim(),
      mode: form.mode === 'both' ? null : form.mode,
      link:
        form.linkType === 'url'
          ? { type: 'url', url: form.url.trim() }
          : { type: form.linkType, targetId: form.targetId.trim() },
      activeFrom: new Date(form.activeFrom).toISOString(),
      activeTo: new Date(form.activeTo).toISOString(),
      priority: Number(form.priority) || 0,
      isActive: form.isActive,
    }

    try {
      if (editing) {
        await updatePromotion.mutateAsync({ id: editing._id, payload })
      } else {
        await createPromotion.mutateAsync(payload)
      }
      setFormOpen(false)
    } catch {
      // The hook already surfaced the server message as a toast.
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deletePromotion.mutateAsync(deleting._id)
    } finally {
      setDeleting(null)
    }
  }

  const rows = useMemo(() => {
    const list = promotions ?? []
    // Match the carousel's own ordering so what an admin sees top-to-bottom is
    // the order members will scroll through.
    return [...list].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return new Date(b.activeFrom).getTime() - new Date(a.activeFrom).getTime()
    })
  }, [promotions])

  const liveCount = useMemo(
    () => rows.filter((p) => derivePromotionState(p) === 'live').length,
    [rows]
  )

  const locationName = (id: string | null) =>
    id ? (locations.find((l) => l._id === id)?.name ?? 'Unknown branch') : 'All branches'

  const isSaving = createPromotion.isPending || updatePromotion.isPending

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Promotions</h2>
          <p className="text-sm text-muted-foreground">
            The carousel on the member home screen. Each slide points at a
            class, a recovery service, a plan, or an external page.
          </p>
        </div>
        <Button onClick={openCreate}>
          <IconPlus className="size-4" />
          New promotion
        </Button>
      </div>

      {rows.length > 5 && liveCount > 5 && (
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 py-4 text-sm text-muted-foreground">
            <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              {liveCount} promotions are live. The carousel shows the top five
              by priority and then a &ldquo;browse all&rdquo; card, so the rest
              won&apos;t appear on the home screen.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedLocation
              ? `Promotions — ${selectedLocation.name}`
              : 'All promotions'}
          </CardTitle>
          <CardDescription>
            Company-wide promotions appear at every branch alongside that
            branch&apos;s own. Higher priority shows first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<IconSpeakerphone className="size-10" />}
              title="No promotions yet"
              description="Create one to fill the carousel slot on the member home screen. With none, the section collapses entirely."
              action={<Button onClick={openCreate}>New promotion</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promotion</TableHead>
                    <TableHead>Links to</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead className="text-right">Priority</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((promotion) => {
                    const state = derivePromotionState(promotion)
                    return (
                      <TableRow key={promotion._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={promotion.imageUrl}
                              alt=""
                              className="size-10 shrink-0 rounded object-cover bg-muted"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">
                                  {promotion.title}
                                </span>
                                {promotion.tag && (
                                  <Badge variant="outline" className="shrink-0">
                                    {promotion.tag}
                                  </Badge>
                                )}
                              </div>
                              {promotion.subtext && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {promotion.subtext}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {promotion.link.type === 'url' ? (
                            <a
                              href={promotion.link.url ?? '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
                            >
                              URL
                              <IconExternalLink className="size-3" />
                            </a>
                          ) : (
                            <div className="text-sm">
                              <span className="capitalize">
                                {promotion.link.type}
                              </span>
                              <code className="ml-1 rounded bg-muted px-1 py-0.5 text-xs">
                                {(promotion.link.targetId ?? '').slice(0, 8)}…
                              </code>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {promotion.mode === null
                            ? 'Both'
                            : promotion.mode === 'online'
                              ? 'Online'
                              : 'In-gym'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {locationName(promotion.locationId)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatWindow(promotion.activeFrom)} –{' '}
                          {formatWindow(promotion.activeTo)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {promotion.priority}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATE_VARIANT[state]}>
                            {STATE_LABEL[state]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(promotion)}
                            >
                              <IconEdit className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleting(promotion)}
                            >
                              <IconTrash className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit promotion' : 'New promotion'}
            </DialogTitle>
            <DialogDescription>
              A promotion points at something that already exists. It never
              carries its own booking or pricing.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Summer strength batch"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={form.imageUrl}
                onChange={(e) => set('imageUrl', e.target.value)}
                placeholder="https://cdn.fitflix.in/promos/summer.jpg"
              />
              {form.imageUrl.trim() !== '' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt=""
                  className="mt-1 h-28 w-full rounded-md border object-cover bg-muted"
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subtext">Subtext</Label>
              <Textarea
                id="subtext"
                rows={2}
                value={form.subtext}
                onChange={(e) => set('subtext', e.target.value)}
                placeholder="Six weeks, three mornings a week."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tag">Tag</Label>
                <Input
                  id="tag"
                  value={form.tag}
                  onChange={(e) => set('tag', e.target.value)}
                  placeholder="New"
                />
              </div>
              <div className="grid gap-2">
                <Label>Audience</Label>
                <Select
                  value={form.mode}
                  onValueChange={(v) => set('mode', v as FormState['mode'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">In-gym</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The promotion&apos;s own audience — not inherited from what it
                  links to.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Links to</Label>
                <Select
                  value={form.linkType}
                  onValueChange={(v) => set('linkType', v as PromotionLinkType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINK_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                {form.linkType === 'url' ? (
                  <>
                    <Label htmlFor="url">Destination URL</Label>
                    <Input
                      id="url"
                      value={form.url}
                      onChange={(e) => set('url', e.target.value)}
                      placeholder="https://fitflix.in/offers/summer"
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="targetId">Target id</Label>
                    <Input
                      id="targetId"
                      value={form.targetId}
                      onChange={(e) => set('targetId', e.target.value)}
                      placeholder={
                        form.linkType === 'class'
                          ? '3f8a1c92-5b7e-4c21-9d44-0e6a71b2c8d5'
                          : '65f1a2b3c4d5e6f7a8b9c0d1'
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {form.linkType === 'class'
                        ? 'A class id is a UUID.'
                        : 'An object id.'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="activeFrom">Starts</Label>
                <Input
                  id="activeFrom"
                  type="datetime-local"
                  value={form.activeFrom}
                  onChange={(e) => set('activeFrom', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="activeTo">Ends</Label>
                <Input
                  id="activeTo"
                  type="datetime-local"
                  value={form.activeTo}
                  onChange={(e) => set('activeTo', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) => set('priority', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Higher shows first.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Branch</Label>
                <Select
                  value={form.locationId}
                  onValueChange={(v) => set('locationId', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Switching off hides the promotion without deleting it.
                </p>
              </div>
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => set('isActive', v)}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={isSaving}>
              {isSaving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.title} will be removed permanently. To take it off the
              carousel but keep it, switch it to inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletePromotion.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
