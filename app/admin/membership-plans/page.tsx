'use client'

import { useMemo, useState } from 'react'
import { IconEdit, IconEye, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
  MembershipPlan,
  MembershipPlanStatus,
} from '@/lib/services/membership-plan.service'
import {
  useCreateMembershipPlan,
  useDeleteMembershipPlan,
  useMembershipPlans,
  useUpdateMembershipPlan,
} from '@/hooks/use-membership-plans'

type FormState = {
  planName: string
  durationMonths: number | ''
  totalPrice: number | ''
  currency: string
  status: MembershipPlanStatus
  featureInput: string
  features: string[]
  credits: number | ''
  pauseDays: number | ''
  trainerSessions: number | ''
  transferSessions: number | ''
  transferWindowDays: number | ''
}

function defaultFormState(): FormState {
  return {
    planName: '',
    durationMonths: 1,
    totalPrice: 0,
    currency: 'INR',
    status: 'Active',
    featureInput: '',
    features: [],
    credits: 0,
    pauseDays: 0,
    trainerSessions: 0,
    transferSessions: 0,
    transferWindowDays: 0,
  }
}

export default function MembershipPlansPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null)
  const [viewingPlan, setViewingPlan] = useState<MembershipPlan | null>(null)
  const [form, setForm] = useState<FormState>(defaultFormState)

  const { data: plans = [], isLoading, isError, refetch } = useMembershipPlans()
  const createPlan = useCreateMembershipPlan()
  const updatePlan = useUpdateMembershipPlan()
  const deletePlan = useDeleteMembershipPlan()

  const filteredPlans = useMemo(
    () =>
      plans.filter((plan) => {
        const query = searchTerm.trim().toLowerCase()
        if (!query) {
          return true
        }
        return (
          plan.planName.toLowerCase().includes(query) ||
          String(plan.durationMonths).includes(query) ||
          plan.status.toLowerCase().includes(query)
        )
      }),
    [plans, searchTerm]
  )

  const gymId = process.env.NEXT_PUBLIC_GYM_ID || 'default-gym'
  const resolvedPlanName = form.planName.trim()

  const resetForm = () => {
    setForm(defaultFormState())
    setEditingPlan(null)
  }

  const openCreate = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan)
    const normalizedCurrency = String(plan.currency || '').toUpperCase()
    setForm({
      planName: plan.planName,
      durationMonths: plan.durationMonths,
      totalPrice: plan.totalPrice,
      currency: normalizedCurrency === 'USD' ? 'USD' : 'INR',
      status: plan.status,
      featureInput: '',
      features: plan.features,
      credits: Number(plan.benefits?.credits ?? 0),
      pauseDays: Number(plan.benefits?.pauseDays ?? 0),
      trainerSessions: Number(plan.benefits?.trainerSessions ?? 0),
      transferSessions: Number(plan.benefits?.transferSessions ?? 0),
      transferWindowDays: Number(plan.benefits?.transferWindowDays ?? 0),
    })
    setIsDialogOpen(true)
  }

  const openView = (plan: MembershipPlan) => {
    setViewingPlan(plan)
    setIsViewDialogOpen(true)
  }

  const addFeature = () => {
    const value = form.featureInput.trim()
    if (!value) {
      return
    }
    if (form.features.includes(value)) {
      setForm({ ...form, featureInput: '' })
      return
    }
    setForm({ ...form, features: [...form.features, value], featureInput: '' })
  }

  const removeFeature = (feature: string) => {
    setForm({ ...form, features: form.features.filter((item) => item !== feature) })
  }

  const onSave = async () => {
    const durationMonths = Number(form.durationMonths)
    const totalPrice = Number(form.totalPrice)

    if (!resolvedPlanName) {
      return
    }
    if (!Number.isFinite(durationMonths) || durationMonths <= 0 || durationMonths > 12) {
      return
    }
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return
    }

    const payload = {
      gymId,
      planName: resolvedPlanName,
      durationMonths,
      totalPrice,
      currency: form.currency.trim().toUpperCase() || 'INR',
      status: form.status,
      features: form.features,
      benefits: {
        credits: Number(form.credits) || 0,
        pauseDays: Number(form.pauseDays) || 0,
        trainerSessions: Number(form.trainerSessions) || 0,
        transferSessions: Number(form.transferSessions) || 0,
        transferWindowDays: Number(form.transferWindowDays) || 0,
      },
    }

    if (editingPlan) {
      await updatePlan.mutateAsync({ id: editingPlan.id, payload })
    } else {
      await createPlan.mutateAsync(payload)
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const onToggleStatus = async (plan: MembershipPlan, checked: boolean) => {
    await updatePlan.mutateAsync({
      id: plan.id,
      payload: { status: checked ? 'Active' : 'Inactive' },
    })
  }

  const onDelete = async (planId: string) => {
    await deletePlan.mutateAsync(planId)
  }

  const isSaving = createPlan.isPending || updatePlan.isPending

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Membership Plans</h2>
          <p className="text-muted-foreground">Manage reusable gym membership plans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <IconRefresh className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <IconPlus className="mr-2 h-4 w-4" /> Create New Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}</DialogTitle>
                <DialogDescription>
                  Define plan details and benefits. Assign Membership will consume these plan records.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-1">
                <div>
                  <label className="text-sm font-medium">Plan Name</label>
                  <Input
                    value={form.planName}
                    onChange={(e) => setForm({ ...form, planName: e.target.value })}
                    placeholder="Elite Prime Bengaluru"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Duration (months)</label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={form.durationMonths}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '') {
                        setForm({ ...form, durationMonths: '' })
                        return
                      }
                      const parsed = Number.parseInt(value, 10)
                      if (Number.isNaN(parsed)) {
                        return
                      }
                      setForm({ ...form, durationMonths: Math.min(12, Math.max(1, parsed)) })
                    }}
                    onBlur={() => {
                      if (form.durationMonths === '') {
                        setForm({ ...form, durationMonths: 1 })
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Total Price</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.totalPrice}
                    onChange={(e) => {
                      const value = e.target.value
                      setForm({ ...form, totalPrice: value === '' ? '' : Number.parseFloat(value) })
                    }}
                    onBlur={() => {
                      if (form.totalPrice === '') {
                        setForm({ ...form, totalPrice: 0 })
                      }
                    }}
                    placeholder="Enter total price"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as MembershipPlanStatus })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Plan Features Builder</label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={form.featureInput}
                    onChange={(e) => setForm({ ...form, featureInput: e.target.value })}
                    placeholder="Add a feature"
                  />
                  <Button type="button" variant="outline" onClick={addFeature}>
                    Add
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.features.map((feature) => (
                    <Badge
                      key={feature}
                      className="cursor-pointer"
                      variant="secondary"
                      onClick={() => removeFeature(feature)}
                    >
                      {feature} x
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Plan Benefits</label>
                <div className="mt-2 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Pause Days</label>
                    <Input
                      type="number"
                      min={0}
                      value={form.pauseDays}
                      onChange={(e) => {
                        const value = e.target.value
                        setForm({ ...form, pauseDays: value === '' ? '' : Number.parseInt(value, 10) })
                      }}
                      onBlur={() => {
                        if (form.pauseDays === '') {
                          setForm({ ...form, pauseDays: 0 })
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Trainer Sessions</label>
                    <Input
                      type="number"
                      min={0}
                      value={form.trainerSessions}
                      onChange={(e) => {
                        const value = e.target.value
                        setForm({ ...form, trainerSessions: value === '' ? '' : Number.parseInt(value, 10) })
                      }}
                      onBlur={() => {
                        if (form.trainerSessions === '') {
                          setForm({ ...form, trainerSessions: 0 })
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Transfer Sessions</label>
                    <Input
                      type="number"
                      min={0}
                      value={form.transferSessions}
                      onChange={(e) => {
                        const value = e.target.value
                        setForm({ ...form, transferSessions: value === '' ? '' : Number.parseInt(value, 10) })
                      }}
                      onBlur={() => {
                        if (form.transferSessions === '') {
                          setForm({ ...form, transferSessions: 0 })
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Credits</label>
                    <Input
                      type="number"
                      min={0}
                      value={form.credits}
                      onChange={(e) => {
                        const value = e.target.value
                        setForm({ ...form, credits: value === '' ? '' : Number.parseInt(value, 10) })
                      }}
                      onBlur={() => {
                        if (form.credits === '') {
                          setForm({ ...form, credits: 0 })
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Transfer Window (days)</label>
                    <Input
                      type="number"
                      min={0}
                      value={form.transferWindowDays}
                      onChange={(e) => {
                        const value = e.target.value
                        setForm({ ...form, transferWindowDays: value === '' ? '' : Number.parseInt(value, 10) })
                      }}
                      onBlur={() => {
                        if (form.transferWindowDays === '') {
                          setForm({ ...form, transferWindowDays: 0 })
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Plan Card Preview</CardTitle>
                  <CardDescription>How this plan can appear to users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">{resolvedPlanName || 'Plan Name'}</p>
                    <Badge variant={form.status === 'Active' ? 'default' : 'secondary'}>{form.status}</Badge>
                  </div>
                  <p className="text-2xl font-bold">
                    {form.currency.toUpperCase()} {Number(form.totalPrice || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">{form.durationMonths} month plan</p>
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {form.features.length === 0 && <li>No features added yet</li>}
                    {form.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
                    <p>Credits: {Number(form.credits || 0)}</p>
                    <p>Pause days: {form.pauseDays}</p>
                    <p>Trainer sessions: {form.trainerSessions}</p>
                    <p>Transfer sessions: {form.transferSessions}</p>
                    <p>Transfer window: {form.transferWindowDays} days</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={onSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Plan Details</DialogTitle>
                <DialogDescription>
                  {viewingPlan ? `${viewingPlan.planName} (${viewingPlan.id})` : 'Plan details'}
                </DialogDescription>
              </DialogHeader>
              {viewingPlan && (
                <Card>
                  <CardHeader>
                    <CardTitle>Plan Card Preview</CardTitle>
                    <CardDescription>How this plan can appear to users</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold">{viewingPlan.planName}</p>
                      <Badge variant={viewingPlan.status === 'Active' ? 'default' : 'secondary'}>
                        {viewingPlan.status}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold">
                      {viewingPlan.currency.toUpperCase()} {Number(viewingPlan.totalPrice || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">{viewingPlan.durationMonths} month plan</p>
                    <ul className="list-disc space-y-1 pl-4 text-sm">
                      {viewingPlan.features.length === 0 && <li>No features added yet</li>}
                      {viewingPlan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
                      <p>Credits: {Number(viewingPlan.benefits?.credits ?? 0)}</p>
                      <p>Pause days: {Number(viewingPlan.benefits?.pauseDays ?? 0)}</p>
                      <p>Trainer sessions: {Number(viewingPlan.benefits?.trainerSessions ?? 0)}</p>
                      <p>Transfer sessions: {Number(viewingPlan.benefits?.transferSessions ?? 0)}</p>
                      <p>Transfer window: {Number(viewingPlan.benefits?.transferWindowDays ?? 0)} days</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search plans by name, duration, status"
            className="max-w-sm"
          />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plans List</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading plans...' : `Total: ${filteredPlans.length} plans`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError && <p className="py-8 text-center text-red-500">Failed to load membership plans</p>}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No plans found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>{plan.planName}</TableCell>
                        <TableCell>{plan.durationMonths} months</TableCell>
                        <TableCell>
                          {plan.currency} {plan.totalPrice.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={plan.status === 'Active' ? 'default' : 'secondary'}>{plan.status}</Badge>
                            <Switch
                              checked={plan.status === 'Active'}
                              onCheckedChange={(checked) => onToggleStatus(plan, checked)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openView(plan)}>
                              <IconEye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
                              <IconEdit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onDelete(plan.id)}>
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
