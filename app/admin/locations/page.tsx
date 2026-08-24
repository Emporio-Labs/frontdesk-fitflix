'use client'

import { useState } from 'react'
import {
  IconBuildingStore,
  IconCopy,
  IconEdit,
  IconMapPin,
  IconPlus,
  IconSettings,
} from '@tabler/icons-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTable } from '@/components/skeleton-loader'
import {
  useCopyLocationSettings,
  useCreateLocation,
  useDeactivateLocation,
  useLocationSettings,
  useLocations,
  useUpdateLocation,
  useUpdateLocationSettings,
} from '@/hooks/use-locations'
import type { Location, LocationSettings } from '@/lib/services/location.service'

const emptyForm = {
  name: '',
  code: '',
  line1: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  timezone: 'Asia/Kolkata',
}

type FormState = typeof emptyForm

export default function LocationsPage() {
  const { data: locations, isLoading } = useLocations(true)
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()
  const deactivateLocation = useDeactivateLocation()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [settingsFor, setSettingsFor] = useState<Location | null>(null)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (location: Location) => {
    setEditing(location)
    setForm({
      name: location.name,
      code: location.code,
      line1: location.address?.line1 ?? '',
      city: location.address?.city ?? '',
      state: location.address?.state ?? '',
      pincode: location.address?.pincode ?? '',
      phone: location.phone ?? '',
      email: location.email ?? '',
      timezone: location.timezone ?? 'Asia/Kolkata',
    })
    setFormOpen(true)
  }

  const submit = async () => {
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toLowerCase(),
      address: {
        line1: form.line1.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      },
      phone: form.phone.trim(),
      email: form.email.trim(),
      timezone: form.timezone,
    }

    if (editing) {
      await updateLocation.mutateAsync({ id: editing._id, payload })
    } else {
      await createLocation.mutateAsync(payload)
    }
    setFormOpen(false)
  }

  const activeCount = (locations ?? []).filter((l) => l.isActive).length

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Locations</h2>
          <p className="text-sm text-muted-foreground">
            Branches, their operating policy, and per-location settings.
          </p>
        </div>
        <Button onClick={openCreate}>
          <IconPlus className="size-4" />
          Add branch
        </Button>
      </div>

      {activeCount === 1 && (
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 py-4 text-sm text-muted-foreground">
            <IconBuildingStore className="mt-0.5 size-4 shrink-0" />
            <p>
              One active branch. The API resolves it automatically, so staff and
              member apps don&apos;t need to choose one. Add a second branch and
              the selector in the header becomes active everywhere.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All branches</CardTitle>
          <CardDescription>
            Deactivating keeps history intact — branches are referenced by
            bookings, visits and memberships.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : !locations || locations.length === 0 ? (
            <EmptyState
              icon={<IconMapPin className="size-10" />}
              title="No branches yet"
              description="Create your first branch, or run the seed script to set up Sainikpuri."
              action={<Button onClick={openCreate}>Add branch</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location._id}>
                      <TableCell className="font-medium">
                        {location.name}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {location.code}
                        </code>
                      </TableCell>
                      <TableCell>{location.address?.city || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {location.timezone}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={location.isActive ? 'default' : 'secondary'}
                        >
                          {location.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSettingsFor(location)}
                          >
                            <IconSettings className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(location)}
                          >
                            <IconEdit className="size-4" />
                          </Button>
                          {location.isActive && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                deactivateLocation.mutate(location._id)
                              }
                              disabled={deactivateLocation.isPending}
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit branch' : 'Add branch'}</DialogTitle>
            <DialogDescription>
              New branches start from the default settings block; you can tune
              or copy settings afterwards.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Fitflix Sainikpuri"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="sainikpuri"
                disabled={!!editing}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, digits and hyphens. Used in URLs and reports,
                so it can&apos;t be changed later.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="line1">Address</Label>
              <Input
                id="line1"
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={form.pincode}
                  onChange={(e) =>
                    setForm({ ...form, pincode: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={form.timezone}
                onValueChange={(value) => setForm({ ...form, timezone: value })}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                  <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                  <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="America/New_York">
                    America/New_York
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Drives every day-boundary calculation for this branch —
                cancellation windows and which slots count as already past.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={
                !form.name.trim() ||
                !form.code.trim() ||
                createLocation.isPending ||
                updateLocation.isPending
              }
            >
              {editing ? 'Save changes' : 'Create branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LocationSettingsDialog
        location={settingsFor}
        allLocations={locations ?? []}
        onClose={() => setSettingsFor(null)}
      />
    </div>
  )
}

function LocationSettingsDialog({
  location,
  allLocations,
  onClose,
}: {
  location: Location | null
  allLocations: Location[]
  onClose: () => void
}) {
  const { data, isLoading, isError, error } = useLocationSettings(
    location?._id ?? ''
  )
  const updateSettings = useUpdateLocationSettings()
  const copySettings = useCopyLocationSettings()
  const [draft, setDraft] = useState<Partial<LocationSettings> | null>(null)
  const [copyFrom, setCopyFrom] = useState<string>('')

  const settings = draft ?? data?.settings ?? null

  const field = (key: keyof LocationSettings, value: number) =>
    setDraft({ ...(settings ?? {}), [key]: value })

  const otherLocations = allLocations.filter((l) => l._id !== location?._id)

  return (
    <Dialog
      open={!!location}
      onOpenChange={(open) => {
        if (!open) {
          setDraft(null)
          setCopyFrom('')
          onClose()
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{location?.name} — settings</DialogTitle>
          <DialogDescription>
            These apply to this branch only. Company-wide changes mean editing
            each branch, or copying from one that&apos;s already right.
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          // Never leave the dialog spinning on a failure — an endless skeleton
          // reads as "still loading" and hides the actual problem.
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">
              Couldn&apos;t load settings for this branch.
            </p>
            <p className="mt-1 text-muted-foreground">
              {(error as any)?.response?.data?.message ??
                (error as any)?.message ??
                'Unknown error'}
            </p>
          </div>
        ) : isLoading || !settings ? (
          <SkeletonTable />
        ) : (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Tax rate %"
                value={settings.taxRatePercent ?? 18}
                onChange={(v) => field('taxRatePercent', v)}
              />
              <NumberField
                label="Booking window (days)"
                value={settings.bookingWindowDays ?? 30}
                onChange={(v) => field('bookingWindowDays', v)}
              />
              <NumberField
                label="Cancellation window (hours)"
                value={settings.cancellationWindowHours ?? 24}
                onChange={(v) => field('cancellationWindowHours', v)}
                hint="Cancel earlier than this to get the session credited back."
              />
              <NumberField
                label="Max freeze days per term"
                value={settings.pauseMaxDaysPerTerm ?? 30}
                onChange={(v) => field('pauseMaxDaysPerTerm', v)}
                hint="Frozen days are added back to the expiry on resume."
              />
              <NumberField
                label="Slot duration (min)"
                value={settings.slotDurationMinutes ?? 45}
                onChange={(v) => field('slotDurationMinutes', v)}
              />
              <NumberField
                label="Buffer between slots (min)"
                value={settings.bufferMinutes ?? 15}
                onChange={(v) => field('bufferMinutes', v)}
              />
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Grace grant limits</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <NumberField
                  label="Max / grant"
                  value={settings.graceGrantLimits?.frontdeskMaxPerGrant ?? 5}
                  onChange={(v) =>
                    setDraft({
                      ...(settings ?? {}),
                      graceGrantLimits: {
                        ...(settings.graceGrantLimits ?? {
                          frontdeskMaxPerMonth: 20,
                          defaultExpiryDays: 30,
                        }),
                        frontdeskMaxPerGrant: v,
                      } as LocationSettings['graceGrantLimits'],
                    })
                  }
                />
                <NumberField
                  label="Max / month"
                  value={settings.graceGrantLimits?.frontdeskMaxPerMonth ?? 20}
                  onChange={(v) =>
                    setDraft({
                      ...(settings ?? {}),
                      graceGrantLimits: {
                        ...(settings.graceGrantLimits ?? {
                          frontdeskMaxPerGrant: 5,
                          defaultExpiryDays: 30,
                        }),
                        frontdeskMaxPerMonth: v,
                      } as LocationSettings['graceGrantLimits'],
                    })
                  }
                />
                <NumberField
                  label="Expiry (days)"
                  value={settings.graceGrantLimits?.defaultExpiryDays ?? 30}
                  onChange={(v) =>
                    setDraft({
                      ...(settings ?? {}),
                      graceGrantLimits: {
                        ...(settings.graceGrantLimits ?? {
                          frontdeskMaxPerGrant: 5,
                          frontdeskMaxPerMonth: 20,
                        }),
                        defaultExpiryDays: v,
                      } as LocationSettings['graceGrantLimits'],
                    })
                  }
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Caps apply to the front desk only; admins are uncapped.
              </p>
            </div>

            {otherLocations.length > 0 && (
              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">Copy from another branch</p>
                <div className="flex gap-2">
                  <Select value={copyFrom} onValueChange={setCopyFrom}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherLocations.map((l) => (
                        <SelectItem key={l._id} value={l._id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    disabled={!copyFrom || copySettings.isPending}
                    onClick={async () => {
                      if (!location) return
                      await copySettings.mutateAsync({
                        id: location._id,
                        sourceId: copyFrom,
                      })
                      setDraft(null)
                    }}
                  >
                    <IconCopy className="size-4" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!draft || isError || updateSettings.isPending}
            onClick={async () => {
              if (!location || !draft) return
              await updateSettings.mutateAsync({
                id: location._id,
                payload: draft,
              })
              setDraft(null)
              onClose()
            }}
          >
            Save settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  hint?: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
