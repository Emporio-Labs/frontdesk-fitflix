'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { IconPlus, IconTrash, IconEye, IconRefresh, IconEdit } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Membership, MembershipStatus } from '@/lib/services/membership.service'
import { useMembershipPlans } from '@/hooks/use-membership-plans'
import { useUsers } from '@/hooks/use-users'
import {
  useMemberships,
  useCreateMembership,
  useUpdateMembership,
  useDeleteMembership,
} from '@/hooks/use-memberships'

function MembershipsPageContent() {
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null)
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [hasHandledAssignParam, setHasHandledAssignParam] = useState(false)
  const [formData, setFormData] = useState({
    userId: '',
    planId: '',
    discountPercent: 0 as number | '',
    status: 'Active' as MembershipStatus,
    startDate: '',
    endDate: '',
    notes: '',
  })

  const { data: memberships = [], isLoading, isError, refetch } = useMemberships()
  const { data: users = [] } = useUsers()
  const { data: membershipPlans = [] } = useMembershipPlans()
  const createMembership = useCreateMembership()
  const updateMembership = useUpdateMembership()
  const deleteMembership = useDeleteMembership()

  const assignUserId = searchParams.get('assignUserId') || ''

  const selectedPlan = useMemo(
    () => membershipPlans.find((plan) => plan.id === formData.planId),
    [membershipPlans, formData.planId]
  )

  const selectedPlanCredits = useMemo(
    () => Number(selectedPlan?.benefits?.credits ?? 0),
    [selectedPlan]
  )

  const selectedPlanBasePrice = useMemo(
    () => Number(selectedPlan?.totalPrice ?? 0),
    [selectedPlan]
  )

  const normalizedDiscountPercent = useMemo(() => {
    const raw = Number(formData.discountPercent)
    if (!Number.isFinite(raw)) {
      return 0
    }
    return Math.min(100, Math.max(0, raw))
  }, [formData.discountPercent])

  const discountedPrice = useMemo(() => {
    if (!selectedPlan) {
      return 0
    }
    const discounted = selectedPlanBasePrice * (1 - normalizedDiscountPercent / 100)
    return Number(Math.max(0, discounted).toFixed(2))
  }, [selectedPlan, selectedPlanBasePrice, normalizedDiscountPercent])

  const selectedUser = useMemo(
    () =>
      users.find(
        (user) => user._id === formData.userId || user.username === formData.userId || user.email === formData.userId
      ),
    [users, formData.userId]
  )

  const getMembershipUsername = (membership: Membership) => {
    const membershipUserId = membership.userId.toLowerCase()
    const match = users.find(
      (user) =>
        user._id.toLowerCase() === membershipUserId ||
        user.username.toLowerCase() === membershipUserId ||
        user.email.toLowerCase() === membershipUserId
    )
    return match?.username || 'Unknown User'
  }

  const getMembershipUserEmail = (membership: Membership) => {
    const membershipUserId = membership.userId.toLowerCase()
    const match = users.find(
      (user) =>
        user._id.toLowerCase() === membershipUserId ||
        user.username.toLowerCase() === membershipUserId ||
        user.email.toLowerCase() === membershipUserId
    )
    return match?.email || '-'
  }

  const formatDateOnly = (value?: string) => {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value.split('T')[0] || value
    }
    return parsed.toISOString().slice(0, 10)
  }

  useEffect(() => {
    if (!assignUserId || hasHandledAssignParam || users.length === 0) {
      return
    }

    const matchedUser = users.find(
      (user) =>
        user._id === assignUserId ||
        user.username.toLowerCase() === assignUserId.toLowerCase() ||
        user.email.toLowerCase() === assignUserId.toLowerCase()
    )

    if (!matchedUser) {
      toast.error('Selected member was not found')
      setHasHandledAssignParam(true)
      return
    }

    const userKeys = [matchedUser._id, matchedUser.username, matchedUser.email]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)

    const alreadyAssigned = memberships.some((membership) =>
      userKeys.includes((membership.userId || '').trim().toLowerCase())
    )

    if (alreadyAssigned) {
      toast.info(`${matchedUser.username} already has a membership assigned`)
      setHasHandledAssignParam(true)
      return
    }

    setEditingMembership(null)
    resetForm()
    setFormData((prev) => ({ ...prev, userId: matchedUser._id }))
    setIsAddDialogOpen(true)
    setHasHandledAssignParam(true)
  }, [assignUserId, hasHandledAssignParam, users, memberships])

  useEffect(() => {
    if (!selectedPlan || !formData.startDate) {
      return
    }

    const start = new Date(`${formData.startDate}T00:00:00`)
    if (Number.isNaN(start.getTime())) {
      return
    }

    const end = new Date(start)
    end.setMonth(end.getMonth() + selectedPlan.durationMonths)
    const endDate = end.toISOString().slice(0, 10)

    if (formData.endDate !== endDate) {
      setFormData((prev) => ({ ...prev, endDate }))
    }
  }, [selectedPlan, formData.startDate, formData.endDate])

  const filteredMemberships = memberships.filter(m =>
    m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.notes.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSaveMembership = async () => {
    if (!formData.userId.trim() || !formData.startDate || !formData.endDate) {
      toast.error('Username/email must be auto-filled from Assign Membership, plus start and end date are required')
      return
    }

    if (!selectedPlan) {
      toast.error('Please select a membership plan')
      return
    }

    const payload = {
      userId: formData.userId.trim(),
      planId: selectedPlan.id,
      planName: selectedPlan.planName,
      creditsIncluded: selectedPlanCredits,
      price: discountedPrice,
      currency: selectedPlan.currency,
      status: formData.status,
      startDate: formData.startDate,
      endDate: formData.endDate,
      features: selectedPlan.features,
      notes: formData.notes,
    }

    if (editingMembership) {
      await updateMembership.mutateAsync({ id: editingMembership.id, payload })
    } else {
      await createMembership.mutateAsync(payload)
    }

    resetForm()
    setEditingMembership(null)
    setIsAddDialogOpen(false)
  }

  const handleEditMembership = (membership: Membership) => {
    const matchingUser = users.find((user) => {
      const membershipUserId = membership.userId.toLowerCase()
      return (
        user._id.toLowerCase() === membershipUserId ||
        user.username.toLowerCase() === membershipUserId ||
        user.email.toLowerCase() === membershipUserId
      )
    })

    const matchingPlan =
      membershipPlans.find((plan) => plan.id === membership.planId) ||
      membershipPlans.find((plan) => plan.planName === membership.planName)

    const derivedDiscountPercent = (() => {
      if (!matchingPlan || matchingPlan.totalPrice <= 0) {
        return 0
      }
      const pct = ((matchingPlan.totalPrice - membership.price) / matchingPlan.totalPrice) * 100
      if (!Number.isFinite(pct)) {
        return 0
      }
      return Number(Math.min(100, Math.max(0, pct)).toFixed(2))
    })()

    setEditingMembership(membership)
    setFormData({
      userId: matchingUser?._id || membership.userId,
      planId: matchingPlan?.id || '',
      discountPercent: derivedDiscountPercent,
      status: membership.status,
      startDate: membership.startDate,
      endDate: membership.endDate,
      notes: membership.notes,
    })
    setIsAddDialogOpen(true)
  }

  const handleDeleteMembership = (id: string) => {
    deleteMembership.mutate(id)
  }

  const resetForm = () => {
    setFormData({
      userId: '',
      planId: '',
      discountPercent: 0,
      status: 'Active',
      startDate: '',
      endDate: '',
      notes: '',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800'
      case 'Paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'Cancelled':
        return 'bg-red-100 text-red-800'
      case 'Expired':
        return 'bg-gray-200 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Memberships</h2>
          <p className="text-muted-foreground">Manage member subscriptions and plans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingMembership(null)
                  resetForm()
                }}
              >
                <IconPlus className="w-4 h-4 mr-2" />
                Add Membership
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMembership ? 'Edit Membership' : 'Create New Membership'}</DialogTitle>
                <DialogDescription>
                  {editingMembership ? 'Update membership details' : 'Add a new membership plan for a member'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Username</label>
                    <Input
                      value={selectedUser?.username || ''}
                      readOnly
                      placeholder="Auto-filled from Assign Membership"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={selectedUser?.email || ''}
                      readOnly
                      placeholder="Auto-filled from Assign Membership"
                    />
                  </div>
                </div>
                {!selectedUser && (
                  <p className="text-xs text-muted-foreground">
                    Open this dialog from Users page using Assign Membership to auto-fill member details.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Membership Plan</label>
                    <select
                      value={formData.planId}
                      onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                      className="w-full rounded-md border px-3 py-2"
                    >
                      <option value="">Select a plan</option>
                      {membershipPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.planName} - {plan.durationMonths} month{plan.durationMonths > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Selected Plan Details</p>
                    {selectedPlan ? (
                      <div className="mt-1 space-y-1 text-muted-foreground">
                        <p>Original Price: {selectedPlan.currency} {selectedPlanBasePrice.toFixed(2)}</p>
                        <p>Credits: {selectedPlanCredits}</p>
                        <p>Features: {selectedPlan.features.join(', ') || '-'}</p>
                      </div>
                    ) : (
                      <p className="mt-1 text-muted-foreground">Select a plan to auto-populate details</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Discount (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.discountPercent}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '') {
                          setFormData({ ...formData, discountPercent: '' })
                          return
                        }
                        const parsed = Number.parseFloat(value)
                        if (Number.isNaN(parsed)) {
                          return
                        }
                        setFormData({
                          ...formData,
                          discountPercent: Number(Math.min(100, Math.max(0, parsed)).toFixed(2)),
                        })
                      }}
                      onBlur={() => {
                        if (formData.discountPercent === '') {
                          setFormData({ ...formData, discountPercent: 0 })
                        }
                      }}
                    />
                  </div>
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    {selectedPlan ? (
                      <>
                        <p>Final Price: {selectedPlan.currency} {discountedPrice.toFixed(2)}</p>
                        <p>Applied Discount: {normalizedDiscountPercent}%</p>
                        <p>Credits: {selectedPlanCredits}</p>
                      </>
                    ) : (
                      <p>Select a plan to apply discount</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as MembershipStatus })}
                      className="w-full rounded-md border px-3 py-2"
                    >
                      <option value="Active">Active</option>
                      <option value="Paused">Paused</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    {selectedPlan ? (
                      <>
                        <p>Plan ID: {selectedPlan.id}</p>
                        <p>Duration: {selectedPlan.durationMonths} months</p>
                      </>
                    ) : (
                      <p>Plan ID will be attached once selected</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      readOnly
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    className="w-full px-3 py-2 border rounded-md h-20 resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false)
                      setEditingMembership(null)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveMembership}
                    disabled={createMembership.isPending || updateMembership.isPending}
                  >
                    {editingMembership
                      ? updateMembership.isPending
                        ? 'Saving...'
                        : 'Save Changes'
                      : createMembership.isPending
                        ? 'Adding...'
                        : 'Add Membership'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <Input
            placeholder="Search memberships..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
      </Card>

      {/* Memberships Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Memberships</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading memberships...' : `Total: ${filteredMemberships.length} memberships`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError && (
            <div className="text-center py-8 text-red-500">
              Failed to load memberships. Please check API connectivity.
            </div>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Credits Included</TableHead>
                    <TableHead>Credits Remaining</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMemberships.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        No memberships found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMemberships.map((membership) => (
                      <TableRow key={membership.id}>
                        <TableCell className="font-medium">{getMembershipUsername(membership)}</TableCell>
                        <TableCell>{membership.planName}</TableCell>
                        <TableCell>{membership.creditsIncluded}</TableCell>
                        <TableCell>{membership.creditsRemaining}</TableCell>
                        <TableCell>${membership.price.toFixed(2)}</TableCell>
                        <TableCell>{membership.currency}</TableCell>
                        <TableCell>{formatDateOnly(membership.startDate)}</TableCell>
                        <TableCell>{formatDateOnly(membership.endDate)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(membership.status)}>{membership.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditMembership(membership)}
                            >
                              <IconEdit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedMembership(membership)
                                setIsDetailsOpen(true)
                              }}
                            >
                              <IconEye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteMembership(membership.id)}
                              disabled={deleteMembership.isPending}
                            >
                              <IconTrash className="w-4 h-4" />
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

      {/* Details Dialog */}
      {selectedMembership && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Membership Details</DialogTitle>
              <DialogDescription>
                {getMembershipUsername(selectedMembership)} - {selectedMembership.planName}
              </DialogDescription>
            </DialogHeader>
            <Card>
              <CardHeader>
                <CardTitle>Plan Card Preview</CardTitle>
                <CardDescription>How this assigned membership appears</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold">{selectedMembership.planName}</p>
                  <Badge variant={selectedMembership.status === 'Active' ? 'default' : 'secondary'}>
                    {selectedMembership.status}
                  </Badge>
                </div>
                <p className="text-2xl font-bold">
                  {selectedMembership.currency.toUpperCase()} {Number(selectedMembership.price || 0).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getMembershipUsername(selectedMembership)} ({getMembershipUserEmail(selectedMembership)})
                </p>
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {selectedMembership.features.length === 0 && <li>No features added yet</li>}
                  {selectedMembership.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
                  <p>Start date: {formatDateOnly(selectedMembership.startDate)}</p>
                  <p>End date: {formatDateOnly(selectedMembership.endDate)}</p>
                  <p>Credits included: {selectedMembership.creditsIncluded}</p>
                  <p>Credits remaining: {selectedMembership.creditsRemaining}</p>
                  <p>Plan ID: {selectedMembership.planId || '-'}</p>
                  <p>Membership ID: {selectedMembership.id}</p>
                  <p>Member ref: {selectedMembership.userId || '-'}</p>
                  <p>Notes: {selectedMembership.notes || '-'}</p>
                </div>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function MembershipsPageFallback() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default function MembershipsPage() {
  return (
    <Suspense fallback={<MembershipsPageFallback />}>
      <MembershipsPageContent />
    </Suspense>
  )
}
