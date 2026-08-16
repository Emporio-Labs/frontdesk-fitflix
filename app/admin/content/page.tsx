'use client'

import { useMemo, useState } from 'react'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
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
import {
  useContentOverrides,
  useCreateContentOverride,
  useDeleteContentOverride,
  useUpdateContentOverride,
} from '@/hooks/use-content'
import type {
  ContentOverride,
  ContentPlatform,
} from '@/lib/services/content.service'

/**
 * App copy, editable without a store release.
 *
 * The mental model this screen has to convey, because it is the opposite of
 * what "content management" usually means: the app already contains every
 * string it needs. A row here only says "say this instead". So an empty table
 * is healthy, deleting a row restores the app's own wording rather than
 * blanking anything, and a key nothing in the app reads is simply ignored.
 *
 * Keys are defined by the app team. Inventing one here does nothing until the
 * app reads it, which is why the field is free text with a format hint rather
 * than a dropdown of things we would have to keep in sync.
 */

const KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/

const emptyForm = {
  key: '',
  value: '',
  // 'all' is the UI spelling of a null platform.
  platform: 'all' as 'all' | ContentPlatform,
  note: '',
  isActive: true,
}

type FormState = typeof emptyForm

export default function ContentPage() {
  const { data: overrides, isLoading } = useContentOverrides()
  const createOverride = useCreateContentOverride()
  const updateOverride = useUpdateContentOverride()
  const deleteOverride = useDeleteContentOverride()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ContentOverride | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ContentOverride | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Grouped by the first dotted segment, so an editor scanning for "the
  // visitor home" finds those rows together rather than alphabetically
  // interleaved with the landing page's.
  const grouped = useMemo(() => {
    const groups = new Map<string, ContentOverride[]>()
    for (const row of overrides ?? []) {
      const surface = row.key.split('.')[0] || 'other'
      const list = groups.get(surface) ?? []
      list.push(row)
      groups.set(surface, list)
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.key.localeCompare(b.key))
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [overrides])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setFormOpen(true)
  }

  const openEdit = (row: ContentOverride) => {
    setEditing(row)
    setError(null)
    setForm({
      key: row.key,
      value: row.value,
      platform: row.platform ?? 'all',
      note: row.note,
      isActive: row.isActive,
    })
    setFormOpen(true)
  }

  /**
   * Mirrors the backend's zod rules so a typo is caught before a round trip.
   * The server re-validates regardless — this is for the editor's benefit.
   */
  const validate = (): string | null => {
    const key = form.key.trim()
    if (!key) return 'A key is required'
    if (!KEY_PATTERN.test(key)) {
      return 'Keys are lowercase dotted segments, e.g. visitor.hero.title'
    }
    if (form.value.length > 2000) return 'That text is too long (2000 max)'
    return null
  }

  const submit = async () => {
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError(null)

    const payload = {
      key: form.key.trim(),
      // Not trimmed: leading or trailing space in copy is occasionally
      // deliberate, and an empty string is a legitimate override.
      value: form.value,
      platform: form.platform === 'all' ? null : form.platform,
      note: form.note.trim(),
      isActive: form.isActive,
    }

    try {
      if (editing) {
        await updateOverride.mutateAsync({ id: editing._id, payload })
      } else {
        await createOverride.mutateAsync(payload)
      }
      setFormOpen(false)
    } catch {
      // The hooks already toast; keep the dialog open so the text is not lost.
    }
  }

  const saving = createOverride.isPending || updateOverride.isPending

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">App copy</h2>
          <p className="text-muted-foreground">
            Change wording in the app without waiting for a store release
          </p>
        </div>
        <Button onClick={openCreate}>
          <IconPlus className="mr-1 size-4" /> New override
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How this works</CardTitle>
          <CardDescription>
            The app already contains every line it shows. A row here replaces
            one of them. Removing a row puts the app&apos;s own wording back —
            it does not leave a blank. Changes reach phones within about a
            minute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No overrides yet — the app is showing the copy it shipped with.
            </p>
          ) : (
            <div className="space-y-8">
              {grouped.map(([surface, rows]) => (
                <div key={surface}>
                  <h3 className="mb-2 text-sm font-semibold capitalize">
                    {surface}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Shows instead</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row._id}>
                          <TableCell className="align-top">
                            <code className="rounded bg-muted px-1 py-0.5 text-xs">
                              {row.key}
                            </code>
                            {row.note && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {row.note}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="max-w-md align-top text-sm">
                            {row.value === '' ? (
                              <span className="text-muted-foreground italic">
                                (blank)
                              </span>
                            ) : (
                              row.value
                            )}
                          </TableCell>
                          <TableCell className="align-top text-sm text-muted-foreground">
                            {row.platform === null
                              ? 'All'
                              : row.platform === 'ios'
                                ? 'iOS'
                                : 'Android'}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge
                              variant={row.isActive ? 'default' : 'secondary'}
                            >
                              {row.isActive ? 'Live' : 'Off'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right align-top">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(row)}
                            >
                              <IconPencil className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleting(row)}
                            >
                              <IconTrash className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit override' : 'New override'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Changing this updates what the app shows within about a minute.'
                : 'Replace one line of app copy. The key has to match one the app reads.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={form.key}
                onChange={(e) => set('key', e.target.value)}
                placeholder="visitor.hero.title"
                // Editing the key of an existing row would orphan it rather
                // than rename anything, so it is fixed once created.
                disabled={!!editing}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase, dotted, named after the screen — the app team owns
                these. A key the app does not read is simply ignored.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="value">Shows instead</Label>
              <Textarea
                id="value"
                rows={3}
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
                placeholder="One club, built around your biology."
                maxLength={2000}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Platform</Label>
                <Select
                  value={form.platform}
                  onValueChange={(v) => set('platform', v as FormState['platform'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="ios">iOS only</SelectItem>
                    <SelectItem value="android">Android only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  A platform-specific row wins over an &quot;All&quot; row with
                  the same key.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="note">Note</Label>
                <Input
                  id="note"
                  value={form.note}
                  onChange={(e) => set('note', e.target.value)}
                  placeholder="Diwali campaign"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  For staff only. Never shown in the app.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => set('isActive', v)}
              />
              <Label htmlFor="isActive">
                Live — switch off to keep the text without using it
              </Label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this override?</AlertDialogTitle>
            <AlertDialogDescription>
              The app goes back to its built-in wording for{' '}
              <code>{deleting?.key}</code>. Nothing is left blank. To keep the
              text for later, switch it off instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting) await deleteOverride.mutateAsync(deleting._id)
                setDeleting(null)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
