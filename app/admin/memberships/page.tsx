'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
import {
  IconPlus,
  IconTrash,
  IconEye,
  IconRefresh,
  IconEdit,
  IconPlayerPause,
  IconPlayerPlay,
  IconSearch,
  IconX,
  IconInfoCircle,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Membership, MembershipStatus } from '@/lib/services/membership.service'
import { useMembershipPlans } from '@/hooks/use-membership-plans'
import { useUsers } from '@/hooks/use-users'
import {
  useMemberships,
  usePauseMembership,
  useResumeMembership,
  useCreateMembership,
  useUpdateMembership,
  useDeleteMembership,
} from '@/hooks/use-memberships'
import { useLocationScope } from '@/components/location-scope-provider'
import { MemberMigrationDialog } from '@/components/memberships/member-migration-dialog'

function formatDateToInput(value?: string) {
  if (!value) return ''
  return value.split('T')[0] || ''
}

function formatDateOnly(value?: string) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value.split('T')[0] || value
  }
  return parsed.toISOString().slice(0, 10)
}

function formatPrice(amount: number | string, currency?: string) {
  const parsed = Number(amount || 0)
  const isUSD = currency?.toUpperCase() === 'USD'
  const symbol = isUSD ? '$' : '₹'
  return `${symbol}${parsed.toFixed(2)}`
}

function MembershipsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MembershipStatus>('all')
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null)
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [resumingMembership, setResumingMembership] = useState<Membership | null>(null)
  const [resumeDateInput, setResumeDateInput] = useState('')
  const [hasHandledAssignParam, setHasHandledAssignParam] = useState(false)
  const [isLockedMember, setIsLockedMember] = useState(false)
  const [formData, setFormData] = useState({
    userId: '',
    planId: '',
    discountPercent: 0 as number | '',
    status: 'Active' as MembershipStatus,
    startDate: '',
    endDate: '',
    notes: '',
    resumedAt: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  const { data: memberships = [], isLoading, isError, refetch } = useMemberships()
  const pauseMembership = usePauseMembership()
  const resumeMembership = useResumeMembership()
  const { data: users = [] } = useUsers()
  const { data: membershipPlans = [] } = useMembershipPlans()
  const createMembership = useCreateMembership()
  const updateMembership = useUpdateMembership()
  const deleteMembership = useDeleteMembership()
  const { selectedLocationId } = useLocationScope()

  const assignUserId = searchParams.get('assignUserId') || ''

  const todayStr = useMemo(() => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  const isStartDateDisabled = useMemo(() => {
    if (!editingMembership) return false
    const startDateStr = formatDateToInput(editingMembership.startDate)
    if (!startDateStr) return false
    return startDateStr < todayStr
  }, [editingMembership, todayStr])

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

  const selectedUser = useMemo(() => {
    const key = formData.userId.trim()
    if (!key) return undefined
    return (
      users.find((user) => user._id === key) ??
      users.find((user) => (user.username && user.username === key) || (user.email && user.email === key))
    )
  }, [users, formData.userId])

  const findMembershipUser = (membership: Membership) => {
    const membershipUserId = membership.userId.trim().toLowerCase()
    if (!membershipUserId) return undefined
    return users.find(
      (user) =>
        user._id.toLowerCase() === membershipUserId ||
        (user.username && user.username.toLowerCase() === membershipUserId) ||
        (user.email && user.email.toLowerCase() === membershipUserId)
    )
  }

  const getMembershipUsername = (membership: Membership) => findMembershipUser(membership)?.username || 'Unknown User'

  const getMembershipUserEmail = (membership: Membership) => findMembershipUser(membership)?.email || '-'



  useEffect(() => {
    if (!assignUserId || hasHandledAssignParam || users.length === 0) {
      return
    }

    const matchedUser = users.find(
      (user) =>
        user._id === assignUserId ||
        (user.username && user.username.toLowerCase() === assignUserId.toLowerCase()) ||
        (user.email && user.email.toLowerCase() === assignUserId.toLowerCase())
    )

    if (!matchedUser) {
      toast.error('Selected member was not found')
      setHasHandledAssignParam(true)
      return
    }

    const userKeys = [matchedUser._id, matchedUser.username, matchedUser.email]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)

    // Expired/cancelled memberships don't block re-assignment — only an active
    // or paused one represents a membership currently in force.
    const alreadyAssigned = memberships.some(
      (membership) =>
        (membership.status === 'Active' || membership.status === 'Paused') &&
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
    setIsLockedMember(true)
    setIsAddDialogOpen(true)
    setHasHandledAssignParam(true)
  }, [assignUserId, hasHandledAssignParam, users, memberships])

  useEffect(() => {
    if (!selectedPlan || !formData.startDate) {
      return
    }

    const cleanStartStr = formData.startDate.split('T')[0]
    const start = new Date(`${cleanStartStr}T00:00:00`)
    if (Number.isNaN(start.getTime())) {
      return
    }

    const end = new Date(start)
    if (selectedPlan.durationDays && selectedPlan.durationDays > 0) {
      // Day-based plan: add exact days
      end.setDate(end.getDate() + selectedPlan.durationDays)
    } else {
      // Month-based plan
      end.setMonth(end.getMonth() + selectedPlan.durationMonths)
    }
    const endDate = end.toISOString().slice(0, 10)

    if (formData.endDate !== endDate) {
      setFormData((prev) => ({ ...prev, endDate }))
    }
  }, [selectedPlan, formData.startDate, formData.endDate])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: memberships.length,
      Active: 0,
      Paused: 0,
      Expired: 0,
      Cancelled: 0,
    }
    for (const m of memberships) {
      if (counts[m.status] !== undefined) {
        counts[m.status] += 1
      }
    }
    return counts
  }, [memberships])

  const filteredMemberships = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return memberships.filter((m) => {
      // 1. Status Filter Guard
      if (statusFilter !== 'all' && m.status !== statusFilter) {
        return false
      }

      // 2. Search Query Guard
      if (!query) {
        return true
      }

      const matchedUser = findMembershipUser(m)
      const username = matchedUser?.username?.toLowerCase() || ''
      const email = matchedUser?.email?.toLowerCase() || ''
      const phone = matchedUser?.phone || ''

      return (
        m.id.toLowerCase().includes(query) ||
        m.userId.toLowerCase().includes(query) ||
        m.planName.toLowerCase().includes(query) ||
        m.notes.toLowerCase().includes(query) ||
        username.includes(query) ||
        email.includes(query) ||
        phone.includes(query)
      )
    })
  }, [memberships, statusFilter, searchTerm, users])

  const sortedMemberships = useMemo(() => {
    return [...filteredMemberships].sort((a, b) => {
      // 1. Sort by creation date (if available) descending
      if (a.createdAt && b.createdAt) {
        const timeA = new Date(a.createdAt).getTime()
        const timeB = new Date(b.createdAt).getTime()
        if (timeA !== timeB) return timeB - timeA
      }
      
      // 2. Fallback to MongoDB ObjectId (encoded timestamp) comparison descending
      if (a.id && b.id && a.id.length === 24 && b.id.length === 24) {
        if (a.id !== b.id) return b.id.localeCompare(a.id)
      }
      
      // 3. Fallback to startDate descending
      const startA = new Date(a.startDate).getTime() || 0
      const startB = new Date(b.startDate).getTime() || 0
      return startB - startA
    })
  }, [filteredMemberships])

  const totalPages = Math.ceil(sortedMemberships.length / itemsPerPage)
  const activePage = Math.max(1, Math.min(currentPage, totalPages || 1))
  const startIndex = (activePage - 1) * itemsPerPage
  const paginatedMemberships = sortedMemberships.slice(startIndex, startIndex + itemsPerPage)

  const handleSaveMembership = async () => {
    if (!formData.userId.trim()) {
      toast.error('Select a member before saving')
      return
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error('Start and end date are required')
      return
    }

    if (!selectedPlan) {
      toast.error('Please select a membership plan')
      return
    }

    const payload: Record<string, unknown> = {
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

    if (editingMembership?.status === 'Paused' && formData.status === 'Active') {
      payload.resumedAt = formData.resumedAt || todayStr
    }

    const createdUserId = formData.userId
    if (editingMembership) {
      await updateMembership.mutateAsync({ id: editingMembership.id, payload })
    } else {
      // Stamp new memberships at the branch selected in the header. On edit we
      // deliberately don't send it, so an admin viewing a different branch can
      // still fix a note without moving the membership between branches.
      await createMembership.mutateAsync({
        ...payload,
        locationId: selectedLocationId ?? undefined,
      } as any)
    }

    resetForm()
    setEditingMembership(null)
    setIsAddDialogOpen(false)

    if (!editingMembership && createdUserId) {
      toast.success('Membership created. Continue with onboarding at check-in.')
      router.push(`/admin/users/${createdUserId}`)
    }
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
      startDate: formatDateToInput(membership.startDate),
      endDate: formatDateToInput(membership.endDate),
      notes: membership.notes,
      resumedAt: todayStr,
    })
    setIsLockedMember(true)
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
      resumedAt: '',
    })
    setIsLockedMember(false)
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
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Memberships</h2>
          <p className="text-muted-foreground">Manage member subscriptions and plans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <MemberMigrationDialog onSuccess={() => refetch()} />
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
                    {isLockedMember ? (
                      <Input
                        value={selectedUser?.username || ''}
                        readOnly
                        placeholder="Auto-filled from Assign Membership"
                      />
                    ) : (
                      <select
                        value={formData.userId}
                        onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                        className="w-full rounded-md border px-3 py-2"
                      >
                        <option value="">Select a member</option>
                        {users.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.username}
                            {user.email ? ` — ${user.email}` : user.phone ? ` — ${user.phone}` : ' — no email'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email (optional)</label>
                    <Input
                      value={selectedUser?.email || ''}
                      readOnly
                      placeholder={selectedUser ? 'No email on record' : 'Auto-filled once a member is selected'}
                    />
                  </div>
                </div>
                {!selectedUser && (
                  <p className="text-xs text-muted-foreground">
                    {isLockedMember
                      ? 'Open this dialog from Users page using Assign Membership to auto-fill member details.'
                      : 'Select a member above to continue — email is optional and not required to assign a membership.'}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Membership Plan</label>
                    <select
                      value={formData.planId}
                      onChange={(e) => {
                        if (e.target.value === 'CREATE_NEW') {
                          router.push('/admin/membership-plans')
                        } else {
                          setFormData({ ...formData, planId: e.target.value })
                        }
                      }}
                      className="w-full rounded-md border px-3 py-2"
                    >
                      <option value="">Select a plan</option>
                      <option value="CREATE_NEW" className="font-semibold text-primary">
                        + Create New Plan
                      </option>
                      {membershipPlans
                        .filter((plan) => plan.status === 'Active' || plan.id === formData.planId)
                        .map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.planName} -{' '}
                            {plan.durationDays && plan.durationDays > 0
                              ? `${plan.durationDays} day${plan.durationDays !== 1 ? 's' : ''}`
                              : `${plan.durationMonths} month${plan.durationMonths !== 1 ? 's' : ''}`
                            }
                            {plan.status === 'Inactive' ? ' (Inactive)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Selected Plan Details</p>
                    {selectedPlan ? (
                      <div className="mt-1 space-y-1 text-muted-foreground">
                        <p>Original Price: {formatPrice(selectedPlanBasePrice, selectedPlan.currency)}</p>
                        <p>Credits: {selectedPlanCredits}</p>
                        <p>
                          Duration:{' '}
                          {selectedPlan.durationDays && selectedPlan.durationDays > 0
                            ? `${selectedPlan.durationDays} day${selectedPlan.durationDays !== 1 ? 's' : ''}`
                            : `${selectedPlan.durationMonths} month${selectedPlan.durationMonths !== 1 ? 's' : ''}`
                          }
                        </p>
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
                        <p>Final Price: {formatPrice(discountedPrice, selectedPlan.currency)}</p>
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
                        <p>
                          Duration:{' '}
                          {selectedPlan.durationDays && selectedPlan.durationDays > 0
                            ? `${selectedPlan.durationDays} day${selectedPlan.durationDays !== 1 ? 's' : ''}`
                            : `${selectedPlan.durationMonths} month${selectedPlan.durationMonths !== 1 ? 's' : ''}`
                          }
                        </p>
                      </>
                    ) : (
                      <p>Plan ID will be attached once selected</p>
                    )}
                  </div>
                </div>
                {editingMembership?.status === 'Paused' && formData.status === 'Active' && (
                  <div className="rounded-lg border bg-muted/30 p-3.5 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <IconInfoCircle className="w-4 h-4 text-primary shrink-0" />
                      <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Member Returned On (Effective Resume Date)
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      If the member actually returned to the gym earlier (e.g. last week), select that date. Frozen days up to that date will be credited back to push the expiry date forward, and days since will count as active gym use.
                    </p>
                    <div className="max-w-xs">
                      <Input
                        type="date"
                        className="bg-background font-medium"
                        value={formData.resumedAt}
                        max={todayStr}
                        onChange={(e) => setFormData({ ...formData, resumedAt: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      disabled={isStartDateDisabled}
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

      {/* Filters and Search Bar */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Status Tabs / Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'Active', 'Paused', 'Expired', 'Cancelled'] as const).map((status) => {
              const isSelected = statusFilter === status
              const count = statusCounts[status] ?? 0
              return (
                <Button
                  key={status}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-8 text-xs font-medium rounded-full px-3 transition-colors',
                    isSelected
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  )}
                  onClick={() => {
                    setStatusFilter(status)
                    setCurrentPage(1)
                  }}
                >
                  <span>{status === 'all' ? 'All' : status}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'ml-1.5 px-1.5 py-0 text-[10px] rounded-full',
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {count}
                  </Badge>
                </Button>
              )
            })}
          </div>

          {/* Search Input & Reset Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="Search by member, phone, plan, or notes..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9 pr-8"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setCurrentPage(1)
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Clear search"
                >
                  <IconX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {(statusFilter !== 'all' || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all')
                  setSearchTerm('')
                  setCurrentPage(1)
                }}
                className="text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto"
              >
                Reset filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Memberships Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === 'all' ? 'All Memberships' : `${statusFilter} Memberships`}
          </CardTitle>
          <CardDescription>
            {isLoading
              ? 'Loading memberships...'
              : `Showing ${sortedMemberships.length} ${statusFilter === 'all' ? '' : statusFilter.toLowerCase() + ' '}membership${sortedMemberships.length === 1 ? '' : 's'}`}
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
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Plan Name</TableHead>
                      <TableHead className="hidden lg:table-cell">Credits Included</TableHead>
                      <TableHead className="hidden md:table-cell">Credits Remaining</TableHead>
                      <TableHead className="hidden lg:table-cell">Price</TableHead>
                      <TableHead className="hidden lg:table-cell">Currency</TableHead>
                      <TableHead className="hidden lg:table-cell">Start Date</TableHead>
                      <TableHead className="hidden md:table-cell">End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedMemberships.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          {statusFilter !== 'all'
                            ? `No ${statusFilter.toLowerCase()} memberships found`
                            : 'No memberships found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedMemberships.map((membership) => (
                        <TableRow key={membership.id}>
                          <TableCell className="font-medium">{getMembershipUsername(membership)}</TableCell>
                          <TableCell>{membership.planName}</TableCell>
                          <TableCell className="hidden lg:table-cell">{membership.creditsIncluded}</TableCell>
                          <TableCell className="hidden md:table-cell">{membership.creditsRemaining}</TableCell>
                          <TableCell className="hidden lg:table-cell">{formatPrice(membership.price, membership.currency)}</TableCell>
                          <TableCell className="hidden lg:table-cell">{membership.currency}</TableCell>
                          <TableCell className="hidden lg:table-cell">{formatDateOnly(membership.startDate)}</TableCell>
                          <TableCell className="hidden md:table-cell">{formatDateOnly(membership.endDate)}</TableCell>
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
                              {membership.status === 'Active' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title="Freeze — frozen days are credited back to the expiry on resume"
                                  onClick={() =>
                                    pauseMembership.mutate({ id: membership.id })
                                  }
                                  disabled={pauseMembership.isPending}
                                >
                                  <IconPlayerPause className="w-4 h-4" />
                                </Button>
                              )}
                              {membership.status === 'Paused' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title="Resume and credit the frozen days back"
                                  onClick={() => {
                                    setResumingMembership(membership)
                                    setResumeDateInput(todayStr)
                                  }}
                                  disabled={resumeMembership.isPending}
                                >
                                  <IconPlayerPlay className="w-4 h-4" />
                                </Button>
                              )}
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
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedMemberships.length)} of {sortedMemberships.length} memberships
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={activePage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={activePage === page ? 'default' : 'outline'}
                        size="sm"
                        className="w-9 h-9 p-0 font-medium"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={activePage === totalPages}
                    >
                      Next page
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Resume Confirmation Dialog */}
      {resumingMembership && (
        <Dialog
          open={!!resumingMembership}
          onOpenChange={(open) => {
            if (!open) {
              setResumingMembership(null)
              setResumeDateInput('')
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <IconPlayerPlay className="w-5 h-5 text-primary" />
                Resume Membership
              </DialogTitle>
              <DialogDescription>
                Re-activate membership for <strong className="text-foreground">{getMembershipUsername(resumingMembership)}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Membership Summary Card */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold text-sm text-foreground">{resumingMembership.planName}</span>
                  <Badge className={getStatusColor(resumingMembership.status)}>{resumingMembership.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-0.5">
                  <div>
                    <span className="block font-medium text-foreground">Current Expiry</span>
                    {formatDateOnly(resumingMembership.endDate)}
                  </div>
                  <div>
                    <span className="block font-medium text-foreground">Credits Remaining</span>
                    {resumingMembership.creditsRemaining} / {resumingMembership.creditsIncluded}
                  </div>
                </div>
              </div>

              {/* Effective Resume Date Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center justify-between">
                  <span>Member Returned On</span>
                  <span className="text-xs text-muted-foreground font-normal">Effective Date</span>
                </label>
                <Input
                  type="date"
                  className="font-medium bg-background"
                  value={resumeDateInput}
                  max={todayStr}
                  onChange={(e) => setResumeDateInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Defaults to today. If the member returned earlier (e.g. last week), select that date so their freeze credit is calculated accurately.
                </p>
              </div>

              {/* Informative Explanation Banner */}
              <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
                <IconInfoCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-medium text-foreground">How this works:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>The freeze ends on the chosen date.</li>
                    <li>Frozen days up to that date are credited back to extend the expiry date.</li>
                    <li>Any days between the return date and today count as active workout days already used.</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResumingMembership(null)
                    setResumeDateInput('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!resumingMembership) return
                    await resumeMembership.mutateAsync({
                      id: resumingMembership.id,
                      resumedAt: resumeDateInput || todayStr,
                    })
                    setResumingMembership(null)
                    setResumeDateInput('')
                  }}
                  disabled={resumeMembership.isPending}
                >
                  {resumeMembership.isPending ? 'Resuming...' : 'Confirm & Resume'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
                  {formatPrice(selectedMembership.price, selectedMembership.currency)}
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
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
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


