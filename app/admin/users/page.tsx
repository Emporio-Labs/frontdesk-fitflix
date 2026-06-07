'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { IconPlus, IconEdit, IconTrash, IconRefresh, IconUsers, IconShieldHalf } from '@tabler/icons-react'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-users'
import { useAdmins, useCreateAdmin, useUpdateAdmin, useDeleteAdmin } from '@/hooks/use-admins'
import { useMemberships } from '@/hooks/use-memberships'
import { User, CreateUserPayload } from '@/lib/services/user.service'
import { Admin } from '@/lib/services/admin.service'
import { StatusBadge } from '@/components/status-badge'
import { toast } from 'sonner'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const GENDER_OPTIONS = ['Male', 'Female', 'Others']

type OnboardingState = 'completed' | 'in_progress' | 'not_started'

function deriveOnboardingState(user: User): OnboardingState {
  const status = user.onboardingStatus
  if (status?.onboardingCompleted || user.onboarded) return 'completed'
  if (status?.currentStep && status.currentStep !== 'HEALTH_MARKERS') return 'in_progress'
  if (status?.completedSteps && status.completedSteps.length > 0) return 'in_progress'
  if (
    status?.healthMarkersCompleted ||
    status?.healthGoalsCompleted ||
    status?.consentCompleted ||
    status?.reportsUploaded ||
    status?.sportsScientistBooked ||
    status?.nutritionistBooked
  ) {
    return 'in_progress'
  }
  return 'not_started'
}

export default function UsersPage() {
  // Member state
  const [memberSearch, setMemberSearch] = useState('')
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [memberForm, setMemberForm] = useState({
    username: '', email: '', phone: '', password: '',
    age: '', gender: 'Male', healthGoalsInput: '',
  })
  const [memberFormErrors, setMemberFormErrors] = useState<Record<string, string>>({})
  const [memberPage, setMemberPage] = useState(1)

  // Admin state
  const [adminSearch, setAdminSearch] = useState('')
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [adminForm, setAdminForm] = useState({ adminName: '', email: '', phone: '', password: '' })
  const [adminPage, setAdminPage] = useState(1)
  const itemsPerPage = 12

  const { data: users = [], isLoading: usersLoading, isError: usersError, refetch: refetchUsers } = useUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const { data: memberships = [] } = useMemberships()

  const { data: admins = [], isLoading: adminsLoading, isError: adminsError, refetch: refetchAdmins } = useAdmins()
  const createAdmin = useCreateAdmin()
  const updateAdmin = useUpdateAdmin()
  const deleteAdmin = useDeleteAdmin()

  const membershipsByUserKey = useMemo(() => {
    const mapping = new Map<string, (typeof memberships)[number]>()
    memberships.forEach((membership) => {
      const key = (membership.userId || '').trim().toLowerCase()
      if (key) {
        mapping.set(key, membership)
      }
    })
    return mapping
  }, [memberships])

  const getUserMembership = (user: User) => {
    const keys = [user._id, user.username, user.email, user.phone]
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .map((value) => value.trim().toLowerCase())
    return keys.map((key) => membershipsByUserKey.get(key)).find(Boolean)
  }

  const formatDateOnly = (value?: string) => {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value.split('T')[0] || value
    }
    return parsed.toISOString().slice(0, 10)
  }

  const formatJoinedDate = (dateVal?: string) => {
    if (!dateVal) return '—'
    const parsed = new Date(dateVal)
    if (Number.isNaN(parsed.getTime())) return dateVal.split('T')[0] || dateVal
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // --- Member helpers ---
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(memberSearch.toLowerCase())) ||
      (u.phone && u.phone.includes(memberSearch))
  )

  const totalMemberPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const activeMemberPage = Math.max(1, Math.min(memberPage, totalMemberPages || 1))
  const memberStartIndex = (activeMemberPage - 1) * itemsPerPage
  const paginatedUsers = filteredUsers.slice(memberStartIndex, memberStartIndex + itemsPerPage)

  const resetMemberForm = () => {
    setMemberForm({ username: '', email: '', phone: '', password: '', age: '', gender: 'Male', healthGoalsInput: '' })
    setMemberFormErrors({})
    setEditingUser(null)
  }

  const validateMemberForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!memberForm.username.trim()) errors.username = 'Username is required'
    if (memberForm.email && memberForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberForm.email.trim())) {
      errors.email = 'Invalid email format'
    }
    
    if (!memberForm.phone.trim()) {
      errors.phone = 'Phone is required'
    } else {
      const cleanPhone = memberForm.phone.replace(/[\s\-()]/g, '')
      const indianPhoneRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/
      if (!indianPhoneRegex.test(cleanPhone)) {
        errors.phone = 'Please enter a valid Indian mobile number (e.g. +91 98765 43210 or 9876543210)'
      }
    }

    if (!memberForm.age || Number(memberForm.age) < 1 || Number(memberForm.age) > 130) errors.age = 'Age must be between 1 and 130'
    if (!editingUser && memberForm.password) {
      if (memberForm.password.length < 8) {
        errors.password = 'Password must be at least 8 characters'
      } else if (!/[A-Za-z]/.test(memberForm.password)) {
        errors.password = 'Password must include at least one letter'
      } else if (!/\d/.test(memberForm.password)) {
        errors.password = 'Password must include at least one number'
      }
    }
    setMemberFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user)
    setMemberForm({
      username: user.username, email: user.email || '', phone: user.phone,
      password: '', age: String(user.age ?? ''), gender: user.gender,
      healthGoalsInput: user.healthGoals.join(', '),
    })
    setIsMemberDialogOpen(true)
  }

  const handleMemberSubmit = async () => {
    if (!validateMemberForm()) return
    const healthGoals = memberForm.healthGoalsInput.split(',').map(s => s.trim()).filter(Boolean)
    const cleanPhone = memberForm.phone.replace(/[\s\-()]/g, '')
    try {
      if (editingUser) {
        await updateUser.mutateAsync({
          id: editingUser._id,
          payload: { username: memberForm.username, phone: cleanPhone, age: Number(memberForm.age), gender: memberForm.gender, healthGoals },
        })
      } else {
        const payload: CreateUserPayload = {
          username: memberForm.username,
          phone: cleanPhone,
          age: Number(memberForm.age),
          gender: memberForm.gender,
          healthGoals,
        }
        if (memberForm.email.trim()) {
          payload.email = memberForm.email.trim()
        }
        if (memberForm.password.trim()) {
          payload.password = memberForm.password.trim()
        }
        await createUser.mutateAsync(payload)
      }
      setIsMemberDialogOpen(false)
      resetMemberForm()
    } catch (err: any) {
      const details = err?.response?.data?.details
      if (details && typeof details === 'object') {
        const serverErrors: Record<string, string> = {}
        for (const [field, msg] of Object.entries(details)) {
          serverErrors[field] = String(msg)
        }
        setMemberFormErrors(serverErrors)
      }
    }
  }

  // --- Admin helpers ---
  const filteredAdmins = admins.filter(
    (a) =>
      a.adminName.toLowerCase().includes(adminSearch.toLowerCase()) ||
      a.email.toLowerCase().includes(adminSearch.toLowerCase())
  )

  const totalAdminPages = Math.ceil(filteredAdmins.length / itemsPerPage)
  const activeAdminPage = Math.max(1, Math.min(adminPage, totalAdminPages || 1))
  const adminStartIndex = (activeAdminPage - 1) * itemsPerPage
  const paginatedAdmins = filteredAdmins.slice(adminStartIndex, adminStartIndex + itemsPerPage)

  const resetAdminForm = () => {
    setAdminForm({ adminName: '', email: '', phone: '', password: '' })
    setEditingAdmin(null)
  }

  const handleOpenEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin)
    setAdminForm({ adminName: admin.adminName, email: admin.email, phone: admin.phone, password: '' })
    setIsAdminDialogOpen(true)
  }

  const handleAdminSubmit = async () => {
    if (!adminForm.adminName || !adminForm.email || !adminForm.phone) return
    if (editingAdmin) {
      await updateAdmin.mutateAsync({
        id: editingAdmin._id,
        payload: { adminName: adminForm.adminName, email: adminForm.email, phone: adminForm.phone },
      })
    } else {
      if (!adminForm.password) return
      await createAdmin.mutateAsync(adminForm)
    }
    setIsAdminDialogOpen(false)
    resetAdminForm()
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">Manage members and staff admin accounts</p>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="members" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <IconUsers className="w-4 h-4 mr-2" />
            Members
            {!usersLoading && <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5 inline-flex items-center justify-center font-medium bg-muted/80">{users.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="admins" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <IconShieldHalf className="w-4 h-4 mr-2" />
            Staff / Admins
            {!adminsLoading && <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5 inline-flex items-center justify-center font-medium bg-muted/80">{admins.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ─── MEMBERS TAB ─── */}
        <TabsContent value="members" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by username or email..."
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value)
                setMemberPage(1)
              }}
              className="max-w-sm h-9 bg-background focus-visible:ring-1"
            />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchUsers()} className="h-9 px-3 text-xs">
                <IconRefresh className="w-4 h-4 mr-1.5" /> Refresh
              </Button>
              <Dialog open={isMemberDialogOpen} onOpenChange={(o) => { setIsMemberDialogOpen(o); if (!o) resetMemberForm() }}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetMemberForm(); setIsMemberDialogOpen(true) }} size="sm" className="h-9 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                    <IconPlus className="w-4 h-4 mr-1.5" /> Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingUser ? 'Edit Member' : 'Create Member'}</DialogTitle>
                    <DialogDescription>
                      {editingUser ? 'Update member details below.' : 'Fill in the details to add a new member.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">Username *</label>
                        <Input autoComplete="off" value={memberForm.username} onChange={(e) => setMemberForm({ ...memberForm, username: e.target.value })} placeholder="john_doe" />
                        {memberFormErrors.username && <p className="text-xs text-red-500 mt-1">{memberFormErrors.username}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Age *</label>
                        <Input type="number" min="1" max="130" value={memberForm.age} onChange={(e) => setMemberForm({ ...memberForm, age: e.target.value })} placeholder="28" />
                        {memberFormErrors.age && <p className="text-xs text-red-500 mt-1">{memberFormErrors.age}</p>}
                      </div>
                    </div>
                    {!editingUser && (
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input type="email" autoComplete="off" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} placeholder="john@example.com" />
                        {memberFormErrors.email && <p className="text-xs text-red-500 mt-1">{memberFormErrors.email}</p>}
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium">Phone *</label>
                      <Input autoComplete="off" value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} placeholder="+91 98765 43210" />
                      {memberFormErrors.phone && <p className="text-xs text-red-500 mt-1">{memberFormErrors.phone}</p>}
                    </div>
                    {!editingUser && (
                      <div>
                        <label className="text-sm font-medium">Password</label>
                        <Input type="password" autoComplete="new-password" value={memberForm.password} onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })} placeholder="Min 8 chars, 1 letter, 1 number" />
                        {memberFormErrors.password && <p className="text-xs text-red-500 mt-1">{memberFormErrors.password}</p>}
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium">Gender</label>
                      <Select value={memberForm.gender} onValueChange={(v) => setMemberForm({ ...memberForm, gender: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Health Goals (comma-separated)</label>
                      <Input value={memberForm.healthGoalsInput} onChange={(e) => setMemberForm({ ...memberForm, healthGoalsInput: e.target.value })} placeholder="Build muscle, Improve stamina" />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => { setIsMemberDialogOpen(false); resetMemberForm() }}>Cancel</Button>
                      <Button onClick={handleMemberSubmit} disabled={createUser.isPending || updateUser.isPending}>
                        {createUser.isPending || updateUser.isPending ? 'Saving...' : editingUser ? 'Save Changes' : 'Create Member'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card className="border-border shadow-sm bg-card overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-border/60">
              <CardTitle className="text-lg font-bold text-foreground">All Members</CardTitle>
              <CardDescription>{usersLoading ? 'Loading...' : `${filteredUsers.length} members`}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {usersError && <div className="text-center py-8 text-red-500">Failed to load members. Check credentials.</div>}
              {usersLoading ? (
                <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <>
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader className="bg-muted/30 border-b border-border/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[140px] pl-6 font-semibold">Username</TableHead>
                      <TableHead className="w-[180px] font-semibold">Email</TableHead>
                      <TableHead className="w-[60px] text-center font-semibold">Age</TableHead>
                      <TableHead className="w-[80px] font-semibold">Gender</TableHead>
                      <TableHead className="w-[200px] font-semibold">Health Goals</TableHead>
                      <TableHead className="w-[110px] font-semibold">Joined</TableHead>
                      <TableHead className="w-[125px] font-semibold">Onboarding</TableHead>
                      <TableHead className="w-[130px] font-semibold">Membership</TableHead>
                      <TableHead className="w-[100px] font-semibold">Plan Start</TableHead>
                      <TableHead className="w-[100px] font-semibold">Plan Expiry</TableHead>
                      <TableHead className="w-[150px] text-right pr-6 font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No members found. Add your first member.</TableCell></TableRow>
                    ) : (
                      paginatedUsers.map((user) => (
                        <TableRow key={user._id} className="hover:bg-muted/20 border-b border-border/40 transition-colors">
                          {(() => {
                            const membership = getUserMembership(user)
                            return (
                              <>
                                <TableCell className="pl-6 font-semibold text-foreground truncate max-w-[140px]">{user.username}</TableCell>
                                <TableCell className="text-muted-foreground truncate max-w-[180px]" title={user.email}>{user.email}</TableCell>
                                <TableCell className="text-center">{user.age}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-semibold px-2 py-0.5 text-xs rounded-full border-border/80 text-foreground bg-background whitespace-nowrap">{user.gender}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                                    {user.healthGoals.slice(0, 2).map((g) => (
                                      <Badge key={g} variant="secondary" className="text-[10px] px-1.5 py-0.5 font-medium rounded-full bg-secondary/80 text-secondary-foreground whitespace-nowrap">{g}</Badge>
                                    ))}
                                    {user.healthGoals.length > 2 && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-medium rounded-full bg-secondary/80 text-secondary-foreground whitespace-nowrap">+{user.healthGoals.length - 2}</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground whitespace-nowrap">{formatJoinedDate(user.createdAt)}</TableCell>
                                <TableCell className="py-2">
                                  <StatusBadge status={deriveOnboardingState(user)} size="sm" />
                                </TableCell>
                                <TableCell className="py-2">
                                  {membership ? (
                                    <Badge variant="secondary" className="font-semibold px-2.5 py-0.5 text-xs rounded-full bg-secondary/80 text-secondary-foreground whitespace-nowrap">{membership.planName}</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground border-dashed px-2.5 py-0.5 text-xs rounded-full bg-transparent whitespace-nowrap">Not Assigned</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground whitespace-nowrap">{formatDateOnly(membership?.startDate)}</TableCell>
                                <TableCell className="text-muted-foreground whitespace-nowrap">{formatDateOnly(membership?.endDate)}</TableCell>

                                <TableCell className="text-right py-2 pr-6">
                                  <div className="flex justify-end items-center gap-1.5">
                                    {!membership && (
                                      <Button asChild size="sm" className="h-8 px-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm">
                                        <Link href={`/admin/memberships?assignUserId=${encodeURIComponent(user._id)}`}>
                                          Assign Membership
                                        </Link>
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                      onClick={() => handleOpenEditUser(user)}
                                      title="Edit User"
                                    >
                                      <IconEdit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                      onClick={() => { if (confirm(`Delete ${user.username}?`)) deleteUser.mutate(user._id) }}
                                      disabled={deleteUser.isPending}
                                      title="Delete User"
                                    >
                                      <IconTrash className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            )
                          })()}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalMemberPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-4 px-6 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {memberStartIndex + 1} to {Math.min(memberStartIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length} members
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3"
                      onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
                      disabled={activeMemberPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: totalMemberPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={activeMemberPage === page ? 'default' : 'outline'}
                        size="sm"
                        className="w-9 h-9 p-0 font-medium"
                        onClick={() => setMemberPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3"
                      onClick={() => setMemberPage((p) => Math.min(totalMemberPages, p + 1))}
                      disabled={activeMemberPage === totalMemberPages}
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
        </TabsContent>

        <TabsContent value="admins" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by name or email..."
              value={adminSearch}
              onChange={(e) => {
                setAdminSearch(e.target.value)
                setAdminPage(1)
              }}
              className="max-w-sm h-9 bg-background focus-visible:ring-1"
            />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchAdmins()} className="h-9 px-3 text-xs">
                <IconRefresh className="w-4 h-4 mr-1.5" /> Refresh
              </Button>
              <Dialog open={isAdminDialogOpen} onOpenChange={(o) => { setIsAdminDialogOpen(o); if (!o) resetAdminForm() }}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetAdminForm(); setIsAdminDialogOpen(true) }} size="sm" className="h-9 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                    <IconPlus className="w-4 h-4 mr-1.5" /> Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingAdmin ? 'Edit Admin' : 'Create Admin'}</DialogTitle>
                    <DialogDescription>
                      {editingAdmin ? 'Update admin details below.' : 'Fill in the details to add a new admin.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-sm font-medium">Full Name *</label>
                      <Input value={adminForm.adminName} onChange={(e) => setAdminForm({ ...adminForm, adminName: e.target.value })} placeholder="Alice Manager" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email *</label>
                      <Input type="email" autoComplete="off" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} placeholder="alice@fitflix.com" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone *</label>
                      <Input autoComplete="off" value={adminForm.phone} onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })} placeholder="+1234567890" />
                    </div>
                    {!editingAdmin && (
                      <div>
                        <label className="text-sm font-medium">Password *</label>
                        <Input type="password" autoComplete="new-password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} />
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => { setIsAdminDialogOpen(false); resetAdminForm() }}>Cancel</Button>
                      <Button onClick={handleAdminSubmit} disabled={createAdmin.isPending || updateAdmin.isPending}>
                        {createAdmin.isPending || updateAdmin.isPending ? 'Saving...' : editingAdmin ? 'Save Changes' : 'Create Admin'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card className="border-border shadow-sm bg-card overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-border/60">
              <CardTitle className="text-lg font-bold text-foreground">Staff Admins</CardTitle>
              <CardDescription>{adminsLoading ? 'Loading...' : `${filteredAdmins.length} admins`}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {adminsError && <div className="text-center py-8 text-red-500">Failed to load admins.</div>}
              {adminsLoading ? (
                <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <>
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader className="bg-muted/30 border-b border-border/60">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[200px] pl-6 font-semibold">Name</TableHead>
                          <TableHead className="w-[250px] font-semibold">Email</TableHead>
                          <TableHead className="w-[150px] font-semibold">Phone</TableHead>
                          <TableHead className="w-[150px] font-semibold">Created</TableHead>
                          <TableHead className="text-right pr-6 w-[120px] font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAdmins.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No admins found</TableCell></TableRow>
                        ) : (
                          paginatedAdmins.map((admin) => (
                            <TableRow key={admin._id} className="hover:bg-muted/20 border-b border-border/40 transition-colors">
                              <TableCell className="pl-6 font-semibold text-foreground">{admin.adminName}</TableCell>
                              <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                              <TableCell>{admin.phone}</TableCell>
                              <TableCell className="text-muted-foreground whitespace-nowrap">{formatJoinedDate(admin.createdAt)}</TableCell>
                              <TableCell className="text-right py-2 pr-6">
                                <div className="flex justify-end items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    onClick={() => handleOpenEditAdmin(admin)}
                                    title="Edit Admin"
                                  >
                                    <IconEdit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    onClick={() => { if (confirm('Delete this admin?')) deleteAdmin.mutate(admin._id) }}
                                    disabled={deleteAdmin.isPending}
                                    title="Delete Admin"
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
                  {totalAdminPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-4 px-6 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {adminStartIndex + 1} to {Math.min(adminStartIndex + itemsPerPage, filteredAdmins.length)} of {filteredAdmins.length} admins
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3"
                          onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                          disabled={activeAdminPage === 1}
                        >
                          Previous
                        </Button>
                        {Array.from({ length: totalAdminPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={activeAdminPage === page ? 'default' : 'outline'}
                            size="sm"
                            className="w-9 h-9 p-0 font-medium"
                            onClick={() => setAdminPage(page)}
                          >
                            {page}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3"
                          onClick={() => setAdminPage((p) => Math.min(totalAdminPages, p + 1))}
                          disabled={activeAdminPage === totalAdminPages}
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
