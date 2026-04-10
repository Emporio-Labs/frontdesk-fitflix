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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
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
import { User } from '@/lib/services/user.service'
import { Admin } from '@/lib/services/admin.service'

const GENDER_OPTIONS = ['Male', 'Female', 'Other']

export default function UsersPage() {
  // Member state
  const [memberSearch, setMemberSearch] = useState('')
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [memberForm, setMemberForm] = useState({
    username: '', email: '', phone: '', password: '',
    age: '', gender: 'Male', healthGoalsInput: '',
  })

  // Admin state
  const [adminSearch, setAdminSearch] = useState('')
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [adminForm, setAdminForm] = useState({ adminName: '', email: '', phone: '', password: '' })

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
    const keys = [user._id, user.username, user.email].map((value) => value.trim().toLowerCase())
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

  // --- Member helpers ---
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(memberSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const resetMemberForm = () => {
    setMemberForm({ username: '', email: '', phone: '', password: '', age: '', gender: 'Male', healthGoalsInput: '' })
    setEditingUser(null)
  }

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user)
    setMemberForm({
      username: user.username, email: user.email, phone: user.phone,
      password: '', age: user.age, gender: user.gender,
      healthGoalsInput: user.healthGoals.join(', '),
    })
    setIsMemberDialogOpen(true)
  }

  const handleMemberSubmit = async () => {
    const healthGoals = memberForm.healthGoalsInput.split(',').map(s => s.trim()).filter(Boolean)
    if (editingUser) {
      await updateUser.mutateAsync({
        id: editingUser._id,
        payload: { username: memberForm.username, phone: memberForm.phone, age: memberForm.age, gender: memberForm.gender, healthGoals },
      })
    } else {
      if (!memberForm.username || !memberForm.email || !memberForm.password || !memberForm.age) return
      await createUser.mutateAsync({
        username: memberForm.username, email: memberForm.email, phone: memberForm.phone,
        password: memberForm.password, age: memberForm.age, gender: memberForm.gender, healthGoals,
      })
    }
    setIsMemberDialogOpen(false)
    resetMemberForm()
  }

  // --- Admin helpers ---
  const filteredAdmins = admins.filter(
    (a) =>
      a.adminName.toLowerCase().includes(adminSearch.toLowerCase()) ||
      a.email.toLowerCase().includes(adminSearch.toLowerCase())
  )

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
    if (!adminForm.adminName || !adminForm.email) return
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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">Manage members and staff admin accounts</p>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <IconUsers className="w-4 h-4 mr-2" />
            Members
            {!usersLoading && <Badge variant="secondary" className="ml-2 text-xs">{users.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="admins">
            <IconShieldHalf className="w-4 h-4 mr-2" />
            Staff / Admins
            {!adminsLoading && <Badge variant="secondary" className="ml-2 text-xs">{admins.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ─── MEMBERS TAB ─── */}
        <TabsContent value="members" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by username or email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="max-w-sm"
            />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
                <IconRefresh className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <Dialog open={isMemberDialogOpen} onOpenChange={(o) => { setIsMemberDialogOpen(o); if (!o) resetMemberForm() }}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetMemberForm(); setIsMemberDialogOpen(true) }}>
                    <IconPlus className="w-4 h-4 mr-2" /> Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingUser ? 'Edit Member' : 'Create Member'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">Username *</label>
                        <Input value={memberForm.username} onChange={(e) => setMemberForm({ ...memberForm, username: e.target.value })} placeholder="john_doe" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Age *</label>
                        <Input type="number" min="1" max="120" value={memberForm.age} onChange={(e) => setMemberForm({ ...memberForm, age: e.target.value })} placeholder="28" />
                      </div>
                    </div>
                    {!editingUser && (
                      <div>
                        <label className="text-sm font-medium">Email *</label>
                        <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} placeholder="john@example.com" />
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} placeholder="+1234567890" />
                    </div>
                    {!editingUser && (
                      <div>
                        <label className="text-sm font-medium">Password *</label>
                        <Input type="password" value={memberForm.password} onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })} placeholder="Min 8 characters" />
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

          <Card>
            <CardHeader>
              <CardTitle>All Members</CardTitle>
              <CardDescription>{usersLoading ? 'Loading...' : `${filteredUsers.length} members`}</CardDescription>
            </CardHeader>
            <CardContent>
              {usersError && <div className="text-center py-8 text-red-500">Failed to load members. Check credentials.</div>}
              {usersLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Health Goals</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Membership</TableHead>
                        <TableHead>Plan Start</TableHead>
                        <TableHead>Plan Expiry</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No members found. Add your first member.</TableCell></TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user._id}>
                            {(() => {
                              const membership = getUserMembership(user)
                              return (
                                <>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell>{user.age}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.gender}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {user.healthGoals.slice(0, 2).map((g) => (
                                  <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                                ))}
                                {user.healthGoals.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">+{user.healthGoals.length - 2}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {membership ? (
                                <Badge variant="secondary">{membership.planName}</Badge>
                              ) : (
                                <Badge variant="outline">Not Assigned</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatDateOnly(membership?.startDate)}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDateOnly(membership?.endDate)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {!membership && (
                                  <Button asChild size="sm">
                                    <Link href={`/admin/memberships?assignUserId=${encodeURIComponent(user._id)}`}>
                                      Assign Membership
                                    </Link>
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => handleOpenEditUser(user)}><IconEdit className="w-4 h-4" /></Button>
                                <Button size="sm" variant="outline" className="text-red-600" onClick={() => { if (confirm(`Delete ${user.username}?`)) deleteUser.mutate(user._id) }} disabled={deleteUser.isPending}><IconTrash className="w-4 h-4" /></Button>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ADMINS TAB ─── */}
        <TabsContent value="admins" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by name or email..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              className="max-w-sm"
            />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchAdmins()}>
                <IconRefresh className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <Dialog open={isAdminDialogOpen} onOpenChange={(o) => { setIsAdminDialogOpen(o); if (!o) resetAdminForm() }}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetAdminForm(); setIsAdminDialogOpen(true) }}>
                    <IconPlus className="w-4 h-4 mr-2" /> Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingAdmin ? 'Edit Admin' : 'Create Admin'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-sm font-medium">Full Name</label>
                      <Input value={adminForm.adminName} onChange={(e) => setAdminForm({ ...adminForm, adminName: e.target.value })} placeholder="Alice Manager" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} placeholder="alice@hybridhuman.com" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input value={adminForm.phone} onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })} placeholder="+1234567890" />
                    </div>
                    {!editingAdmin && (
                      <div>
                        <label className="text-sm font-medium">Password</label>
                        <Input type="password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} />
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

          <Card>
            <CardHeader>
              <CardTitle>Staff Admins</CardTitle>
              <CardDescription>{adminsLoading ? 'Loading...' : `${filteredAdmins.length} admins`}</CardDescription>
            </CardHeader>
            <CardContent>
              {adminsError && <div className="text-center py-8 text-red-500">Failed to load admins.</div>}
              {adminsLoading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdmins.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No admins found</TableCell></TableRow>
                      ) : (
                        filteredAdmins.map((admin) => (
                          <TableRow key={admin._id}>
                            <TableCell className="font-medium">{admin.adminName}</TableCell>
                            <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                            <TableCell>{admin.phone}</TableCell>
                            <TableCell className="text-muted-foreground">{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleOpenEditAdmin(admin)}><IconEdit className="w-4 h-4" /></Button>
                                <Button size="sm" variant="outline" className="text-red-600" onClick={() => { if (confirm('Delete this admin?')) deleteAdmin.mutate(admin._id) }} disabled={deleteAdmin.isPending}><IconTrash className="w-4 h-4" /></Button>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
