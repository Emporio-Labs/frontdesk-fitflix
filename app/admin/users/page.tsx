'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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
import { IconPlus, IconEdit, IconTrash, IconRefresh, IconUsers, IconShieldHalf, IconEye, IconEyeOff, IconSend, IconBan, IconCircleCheck, IconCopy, IconMapPin } from '@tabler/icons-react'
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
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-users'
import { useAdmins, useInviteAdmin, useResendInvite, useUpdateAdmin, useDeleteAdmin, useSetAdminStatus } from '@/hooks/use-admins'
import { useMemberships } from '@/hooks/use-memberships'
import { useLocations } from '@/hooks/use-locations'
import { User, CreateUserPayload } from '@/lib/services/user.service'
import { Admin } from '@/lib/services/admin.service'
import { StatusBadge } from '@/components/status-badge'
import { UserDetailsDialog } from '@/components/users/user-details-dialog'
import { toast } from 'sonner'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const GENDER_OPTIONS = ['Male', 'Female', 'Others']

const MEMBER_DRAFT_KEY = 'create_member_form_draft'

type MemberFormState = {
  username: string
  email: string
  phone: string
  password: string
  age: string
  gender: string
  healthGoalsInput: string
}

function defaultMemberForm(): MemberFormState {
  return {
    username: '',
    email: '',
    phone: '',
    password: '',
    age: '',
    gender: 'Male',
    healthGoalsInput: '',
  }
}

function saveMemberDraft(data: MemberFormState) {
  try {
    sessionStorage.setItem(MEMBER_DRAFT_KEY, JSON.stringify(data))
  } catch (e) {}
}

function loadMemberDraft(): MemberFormState | null {
  try {
    const item = sessionStorage.getItem(MEMBER_DRAFT_KEY)
    return item ? JSON.parse(item) : null
  } catch (e) {
    return null
  }
}

function clearMemberDraft() {
  try {
    sessionStorage.removeItem(MEMBER_DRAFT_KEY)
  } catch (e) {}
}

const ADMIN_DRAFT_KEY = 'create_admin_form_draft'

// The shared login being phased out (FX-30.3). Matched case-insensitively.
const SHARED_LOGIN_EMAIL = 'frontdesk@fitflix.in'

// Staff-role options for an invited account. The backend is the authority on the
// actual role; 'frontdesk' maps to the `staff` UI role (see login roleMap).
// FX-32.1 — every staff role can now be created here (admin-family + experts).
const STAFF_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Branch Manager' },
  { value: 'sales', label: 'Sales' },
  { value: 'frontdesk', label: 'Front Desk' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'nutritionist', label: 'Nutritionist' },
  { value: 'sports_scientist', label: 'Sports Scientist' },
]

// FX-32.1 — experts work across every branch; the branch picker is hidden and
// `allBranches` is set for them. Full admins (admin / no role) are global too.
const EXPERT_STAFF_ROLES = ['trainer', 'nutritionist', 'sports_scientist']
const isExpertRole = (role?: string) => !!role && EXPERT_STAFF_ROLES.includes(role)
// A "full admin" (complete dashboard) is staffRole 'admin' or none — the role
// FX-32.5 protects from being disabled/demoted/deleted when it's the last one.
const isFullAdminRole = (role?: string | null) => !role || role === 'admin'

const STAFF_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  frontdesk: 'Front Desk',
  manager: 'Branch Manager',
  sales: 'Sales',
  trainer: 'Trainer',
  nutritionist: 'Nutritionist',
  sports_scientist: 'Sports Scientist',
}
const staffRoleLabel = (role?: string | null) =>
  role ? STAFF_ROLE_LABELS[role] ?? role : 'Needs role'

type AdminFormState = {
  adminName: string
  email: string
  phone: string
  staffRole: string
  // FX-32.1 — branches for a scoped role; ignored when allBranches/expert/admin.
  branchIds: string[]
  allBranches: boolean
}

function defaultAdminForm(): AdminFormState {
  return {
    adminName: '',
    email: '',
    phone: '',
    staffRole: 'frontdesk',
    branchIds: [],
    allBranches: false,
  }
}

function saveAdminDraft(data: AdminFormState) {
  try {
    sessionStorage.setItem(ADMIN_DRAFT_KEY, JSON.stringify(data))
  } catch (e) {}
}

function loadAdminDraft(): AdminFormState | null {
  try {
    const item = sessionStorage.getItem(ADMIN_DRAFT_KEY)
    return item ? JSON.parse(item) : null
  } catch (e) {
    return null
  }
}

function clearAdminDraft() {
  try {
    sessionStorage.removeItem(ADMIN_DRAFT_KEY)
  } catch (e) {}
}

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
  const [showPassword, setShowPassword] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
  const [selectedDetailUser, setSelectedDetailUser] = useState<User | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Auto-persist form draft to sessionStorage while filling in Create mode
  useEffect(() => {
    if (isMemberDialogOpen && !editingUser) {
      saveMemberDraft(memberForm)
    }
  }, [memberForm, isMemberDialogOpen, editingUser])

  const isMemberFormDirty = useMemo(() => {
    if (editingUser) {
      return (
        memberForm.username !== (editingUser.username || '') ||
        memberForm.email !== (editingUser.email || '') ||
        memberForm.phone !== (editingUser.phone || '') ||
        memberForm.password !== '' ||
        memberForm.age !== String(editingUser.age ?? '') ||
        memberForm.gender !== (editingUser.gender || 'Male') ||
        memberForm.healthGoalsInput !== (editingUser.healthGoals?.join(', ') || '')
      )
    }
    return Boolean(
      memberForm.username.trim() ||
      memberForm.email.trim() ||
      memberForm.phone.trim() ||
      memberForm.password.trim() ||
      memberForm.age.trim() ||
      memberForm.healthGoalsInput.trim() ||
      (memberForm.gender && memberForm.gender !== 'Male')
    )
  }, [memberForm, editingUser])

  const handleCloseMemberDialog = () => {
    if (isMemberFormDirty) {
      setShowUnsavedConfirm(true)
    } else {
      if (!editingUser) {
        clearMemberDraft()
      }
      setIsMemberDialogOpen(false)
      resetMemberForm()
    }
  }

  const openCreateMemberModal = () => {
    setEditingUser(null)
    setMemberFormErrors({})
    setShowPassword(false)
    setShowUnsavedConfirm(false)
    const draft = loadMemberDraft()
    if (draft) {
      setMemberForm(draft)
    } else {
      setMemberForm(defaultMemberForm())
    }
    setIsMemberDialogOpen(true)
  }

  // Admin state
  const [adminSearch, setAdminSearch] = useState('')
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [adminForm, setAdminForm] = useState<AdminFormState>(defaultAdminForm())
  const [adminPage, setAdminPage] = useState(1)
  const [showAdminUnsavedConfirm, setShowAdminUnsavedConfirm] = useState(false)
  // Shown when the backend returns the invite link instead of emailing it.
  const [inviteLinkDialog, setInviteLinkDialog] = useState<{ open: boolean; link: string; email: string }>({
    open: false,
    link: '',
    email: '',
  })

  // Auto-persist admin form draft to sessionStorage while filling in Create mode
  useEffect(() => {
    if (isAdminDialogOpen && !editingAdmin) {
      saveAdminDraft(adminForm)
    }
  }, [adminForm, isAdminDialogOpen, editingAdmin])

  const isAdminFormDirty = useMemo(() => {
    if (editingAdmin) {
      return (
        adminForm.adminName !== (editingAdmin.adminName || '') ||
        adminForm.email !== (editingAdmin.email || '') ||
        adminForm.phone !== (editingAdmin.phone || '') ||
        adminForm.staffRole !== (editingAdmin.staffRole || 'frontdesk') ||
        adminForm.allBranches !== Boolean(editingAdmin.allBranches) ||
        adminForm.branchIds.join(',') !== (editingAdmin.branchIds || []).join(',')
      )
    }
    return Boolean(
      adminForm.adminName.trim() ||
      adminForm.email.trim() ||
      adminForm.phone.trim() ||
      adminForm.branchIds.length > 0
    )
  }, [adminForm, editingAdmin])

  const handleCloseAdminDialog = () => {
    if (isAdminFormDirty) {
      setShowAdminUnsavedConfirm(true)
    } else {
      if (!editingAdmin) {
        clearAdminDraft()
      }
      setIsAdminDialogOpen(false)
      resetAdminForm()
    }
  }

  const openCreateAdminModal = () => {
    setEditingAdmin(null)
    setShowAdminUnsavedConfirm(false)
    setAdminFormError('')
    const draft = loadAdminDraft()
    if (draft) {
      setAdminForm({ ...defaultAdminForm(), ...draft })
    } else {
      setAdminForm(defaultAdminForm())
    }
    setIsAdminDialogOpen(true)
  }
  const itemsPerPage = 12

  const { data: users = [], isLoading: usersLoading, isError: usersError, refetch: refetchUsers } = useUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const { data: memberships = [] } = useMemberships()

  const { data: admins = [], isLoading: adminsLoading, isError: adminsError, refetch: refetchAdmins } = useAdmins()
  const inviteAdmin = useInviteAdmin()
  const resendInvite = useResendInvite()
  const updateAdmin = useUpdateAdmin()
  const deleteAdmin = useDeleteAdmin()
  const setAdminStatus = useSetAdminStatus()
  const { data: locations = [] } = useLocations()

  // FX-32.1 — branch picker validation error (scoped role with no branch chosen).
  const [adminFormError, setAdminFormError] = useState('')

  // FX-32.5 — the full admins (complete dashboard) who can still sign in. When
  // only one remains, the UI blocks disabling/demoting/deleting it; the backend
  // returns 409 as the real authority.
  const activeFullAdmins = useMemo(
    () => admins.filter((a) => isFullAdminRole(a.staffRole) && a.status !== 'disabled'),
    [admins],
  )
  const isLastFullAdmin = (admin: Admin) =>
    isFullAdminRole(admin.staffRole) &&
    admin.status !== 'disabled' &&
    activeFullAdmins.length <= 1

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>()
    locations.forEach((loc) => map.set(loc._id, loc.name))
    return map
  }, [locations])

  const membershipsByUserKey = useMemo(() => {
    const mapping = new Map<string, (typeof memberships)[number]>()
    memberships.forEach((membership) => {
      // Expired/cancelled memberships don't count as "currently assigned" —
      // only Active/Paused should block re-assignment or show as the member's plan.
      if (membership.status !== 'Active' && membership.status !== 'Paused') {
        return
      }
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
    setShowPassword(false)
    setShowUnsavedConfirm(false)
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
        clearMemberDraft()
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

  // FX-32.6 — accounts still waiting for a role surface at the top so they're
  // not forgotten, then invited (first sign-in pending) accounts, then the rest.
  // Stable within each rank (keeps the backend's createdAt ordering).
  const adminSortRank = (a: Admin) => (!a.staffRole ? 0 : a.status === 'invited' ? 1 : 2)
  const sortedAdmins = useMemo(() => {
    return filteredAdmins
      .map((a, i) => ({ a, i }))
      .sort((x, y) => adminSortRank(x.a) - adminSortRank(y.a) || x.i - y.i)
      .map(({ a }) => a)
  }, [filteredAdmins])

  const totalAdminPages = Math.ceil(sortedAdmins.length / itemsPerPage)
  const activeAdminPage = Math.max(1, Math.min(adminPage, totalAdminPages || 1))
  const adminStartIndex = (activeAdminPage - 1) * itemsPerPage
  const paginatedAdmins = sortedAdmins.slice(adminStartIndex, adminStartIndex + itemsPerPage)

  const resetAdminForm = () => {
    setAdminForm(defaultAdminForm())
    setEditingAdmin(null)
    setShowAdminUnsavedConfirm(false)
    setAdminFormError('')
  }

  const handleOpenEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin)
    setAdminFormError('')
    setAdminForm({
      adminName: admin.adminName,
      email: admin.email,
      phone: admin.phone,
      staffRole: admin.staffRole || 'frontdesk',
      branchIds: admin.branchIds || [],
      allBranches: Boolean(admin.allBranches),
    })
    setIsAdminDialogOpen(true)
  }

  // FX-32.1 — resolve the branch fields for the chosen role, validating that a
  // branch-scoped role actually names a branch. Returns null (with an inline
  // error set) when invalid. Experts / all-branches → allBranches; full admins →
  // neither (they are global).
  const resolveAdminBranchPayload = (): { branchIds: string[]; allBranches: boolean } | null => {
    const role = adminForm.staffRole
    if (isFullAdminRole(role)) return { branchIds: [], allBranches: false }
    if (isExpertRole(role) || adminForm.allBranches) return { branchIds: [], allBranches: true }
    if (adminForm.branchIds.length === 0) {
      setAdminFormError('Select at least one branch, or mark this role as working across all branches.')
      return null
    }
    return { branchIds: adminForm.branchIds, allBranches: false }
  }

  const handleAdminSubmit = async () => {
    setAdminFormError('')
    if (!adminForm.adminName || !adminForm.email || !adminForm.phone) return

    // FX-32.5 — don't let the last full admin be demoted away from admin.
    if (
      editingAdmin &&
      isLastFullAdmin(editingAdmin) &&
      !isFullAdminRole(adminForm.staffRole)
    ) {
      setAdminFormError("This is the last remaining admin — assign another admin before changing this one's role.")
      return
    }

    const branch = resolveAdminBranchPayload()
    if (!branch) return

    try {
      if (editingAdmin) {
        await updateAdmin.mutateAsync({
          id: editingAdmin._id,
          payload: {
            adminName: adminForm.adminName,
            email: adminForm.email,
            phone: adminForm.phone,
            staffRole: adminForm.staffRole,
            ...branch,
          },
        })
      } else {
        // FX-30.2 — invite: no password is sent; backend returns a first-sign-in link.
        const result = await inviteAdmin.mutateAsync({
          adminName: adminForm.adminName,
          email: adminForm.email,
          phone: adminForm.phone,
          staffRole: adminForm.staffRole,
          ...branch,
        })
        clearAdminDraft()
        // If the backend returned the link instead of emailing it, surface a copyable fallback.
        if (result.inviteLink) {
          setInviteLinkDialog({ open: true, link: result.inviteLink, email: adminForm.email })
        }
      }
      setIsAdminDialogOpen(false)
      resetAdminForm()
    } catch (err: any) {
      // Surface a server-side rejection (e.g. FX-32.5 last-admin 409) inline.
      setAdminFormError(err?.response?.data?.message || 'Could not save the account.')
    }
  }

  const handleResendInvite = async (admin: Admin) => {
    const result = await resendInvite.mutateAsync(admin._id)
    if (result.inviteLink) {
      setInviteLinkDialog({ open: true, link: result.inviteLink, email: admin.email })
    }
  }

  // FX-30.3 — shared-login migration. The shared account can only be disabled once
  // every personal account has migrated: each is active and has signed in at least once.
  const sharedAccount = admins.find((a) => a.email.toLowerCase() === SHARED_LOGIN_EMAIL)
  const personalAccounts = admins.filter((a) => a.email.toLowerCase() !== SHARED_LOGIN_EMAIL)
  const allMigrated =
    personalAccounts.length > 0 &&
    personalAccounts.every((a) => a.status === 'active' && !!a.lastLoginAt)

  const handleToggleStatus = async (admin: Admin) => {
    const next = admin.status === 'disabled' ? 'active' : 'disabled'
    if (next === 'disabled' && !confirm(`Disable ${admin.adminName}'s account? They will no longer be able to sign in.`)) {
      return
    }
    await setAdminStatus.mutateAsync({ id: admin._id, status: next })
  }

  const handleDisableSharedLogin = async () => {
    if (!sharedAccount) return
    if (!confirm('Disable the shared frontdesk@fitflix.in login? Make sure everyone has signed in with their own account first.')) {
      return
    }
    await setAdminStatus.mutateAsync({ id: sharedAccount._id, status: 'disabled' })
  }

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLinkDialog.link)
      toast.success('Invite link copied')
    } catch {
      toast.error('Could not copy — select and copy the link manually')
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by username or email..."
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value)
                setMemberPage(1)
              }}
              className="w-full sm:max-w-sm h-9 bg-background focus-visible:ring-1"
            />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchUsers()} className="h-9 px-3 text-xs">
                <IconRefresh className="w-4 h-4 mr-1.5" /> Refresh
              </Button>
              <Dialog open={isMemberDialogOpen} onOpenChange={(o) => { if (!o) handleCloseMemberDialog() }}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateMemberModal} size="sm" className="h-9 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                    <IconPlus className="w-4 h-4 mr-1.5" /> Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent
                  onPointerDownOutside={(e) => {
                    if (isMemberFormDirty) {
                      e.preventDefault()
                      handleCloseMemberDialog()
                    }
                  }}
                  onInteractOutside={(e) => {
                    if (isMemberFormDirty) {
                      e.preventDefault()
                      handleCloseMemberDialog()
                    }
                  }}
                  onEscapeKeyDown={(e) => {
                    if (isMemberFormDirty) {
                      e.preventDefault()
                      handleCloseMemberDialog()
                    }
                  }}
                >
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
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={memberForm.password}
                            onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                            placeholder="Min 8 chars, 1 letter, 1 number"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            tabIndex={-1}
                          >
                            {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                          </button>
                        </div>
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
                      <Button variant="outline" onClick={handleCloseMemberDialog}>Cancel</Button>
                      <Button onClick={handleMemberSubmit} disabled={createUser.isPending || updateUser.isPending}>
                        {createUser.isPending || updateUser.isPending ? 'Saving...' : editingUser ? 'Save Changes' : 'Create Member'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <AlertDialog open={showUnsavedConfirm} onOpenChange={setShowUnsavedConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                    <AlertDialogDescription>
                      You have unsaved changes. Do you want to leave?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowUnsavedConfirm(false)}>
                      Stay
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setShowUnsavedConfirm(false)
                        if (!editingUser) {
                          clearMemberDraft()
                        }
                        setIsMemberDialogOpen(false)
                        resetMemberForm()
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Leave
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                      <TableHead className="hidden w-[60px] text-center font-semibold lg:table-cell">Age</TableHead>
                      <TableHead className="hidden w-[80px] font-semibold lg:table-cell">Gender</TableHead>
                      <TableHead className="hidden w-[200px] font-semibold lg:table-cell">Health Goals</TableHead>
                      <TableHead className="hidden w-[110px] font-semibold md:table-cell">Joined</TableHead>
                      <TableHead className="hidden w-[125px] font-semibold md:table-cell">Onboarding</TableHead>
                      <TableHead className="w-[130px] font-semibold">Membership</TableHead>
                      <TableHead className="hidden w-[100px] font-semibold lg:table-cell">Plan Start</TableHead>
                      <TableHead className="hidden w-[100px] font-semibold lg:table-cell">Plan Expiry</TableHead>
                      <TableHead className="w-[160px] text-right pr-6 font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No members found. Add your first member.</TableCell></TableRow>
                    ) : (
                      paginatedUsers.map((user, index) => {
                        const membership = getUserMembership(user)
                        return (
                          <TableRow key={user._id || index} className="hover:bg-muted/20 border-b border-border/40 transition-colors">
                            <TableCell className="pl-6 font-semibold text-foreground truncate max-w-[140px]">
                              <button
                                type="button"
                                className="text-left font-semibold hover:underline text-primary hover:text-primary/80 transition-colors"
                                onClick={() => {
                                  setSelectedDetailUser(user)
                                  setIsDetailDialogOpen(true)
                                }}
                                title="Click to view full health markers, assigned trainer & member details"
                              >
                                {user.username}
                              </button>
                            </TableCell>
                            <TableCell className="text-muted-foreground truncate max-w-[180px]" title={user.email}>{user.email}</TableCell>
                            <TableCell className="hidden text-center lg:table-cell">{user.age}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge variant="outline" className="font-semibold px-2 py-0.5 text-xs rounded-full border-border/80 text-foreground bg-background whitespace-nowrap">{user.gender}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {user.healthGoals.slice(0, 2).map((g, i) => (
                                  <Badge key={`${g}-${i}`} variant="secondary" className="text-[10px] px-1.5 py-0.5 font-medium rounded-full bg-secondary/80 text-secondary-foreground whitespace-nowrap">{g}</Badge>
                                ))}
                                {user.healthGoals.length > 2 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-medium rounded-full bg-secondary/80 text-secondary-foreground whitespace-nowrap">+{user.healthGoals.length - 2}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden text-muted-foreground whitespace-nowrap md:table-cell">{formatJoinedDate(user.createdAt)}</TableCell>
                            <TableCell className="hidden py-2 md:table-cell">
                              <StatusBadge status={deriveOnboardingState(user)} size="sm" />
                            </TableCell>
                            <TableCell className="py-2">
                              {membership ? (
                                <Badge variant="secondary" className="font-semibold px-2.5 py-0.5 text-xs rounded-full bg-secondary/80 text-secondary-foreground whitespace-nowrap">{membership.planName}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground border-dashed px-2.5 py-0.5 text-xs rounded-full bg-transparent whitespace-nowrap">Not Assigned</Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden text-muted-foreground whitespace-nowrap lg:table-cell">{formatDateOnly(membership?.startDate)}</TableCell>
                            <TableCell className="hidden text-muted-foreground whitespace-nowrap lg:table-cell">{formatDateOnly(membership?.endDate)}</TableCell>

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
                                  onClick={() => {
                                    setSelectedDetailUser(user)
                                    setIsDetailDialogOpen(true)
                                  }}
                                  title="View Member Details & Health Markers"
                                >
                                  <IconEye className="w-4 h-4 text-primary" />
                                </Button>
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
                          </TableRow>
                        )
                      })
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by name or email..."
              value={adminSearch}
              onChange={(e) => {
                setAdminSearch(e.target.value)
                setAdminPage(1)
              }}
              className="w-full sm:max-w-sm h-9 bg-background focus-visible:ring-1"
            />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchAdmins()} className="h-9 px-3 text-xs">
                <IconRefresh className="w-4 h-4 mr-1.5" /> Refresh
              </Button>
              <Dialog open={isAdminDialogOpen} onOpenChange={(o) => { if (!o) handleCloseAdminDialog() }}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateAdminModal} size="sm" className="h-9 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                    <IconPlus className="w-4 h-4 mr-1.5" /> Invite Staff
                  </Button>
                </DialogTrigger>
                <DialogContent
                  onPointerDownOutside={(e) => {
                    if (isAdminFormDirty) {
                      e.preventDefault()
                      handleCloseAdminDialog()
                    }
                  }}
                  onInteractOutside={(e) => {
                    if (isAdminFormDirty) {
                      e.preventDefault()
                      handleCloseAdminDialog()
                    }
                  }}
                  onEscapeKeyDown={(e) => {
                    if (isAdminFormDirty) {
                      e.preventDefault()
                      handleCloseAdminDialog()
                    }
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>{editingAdmin ? 'Edit Staff Account' : 'Invite Staff Member'}</DialogTitle>
                    <DialogDescription>
                      {editingAdmin
                        ? 'Update this staff account below.'
                        : 'We’ll email a first-sign-in link so they can set their own password. No password is set here.'}
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
                    <div>
                      <label className="text-sm font-medium">Role</label>
                      <Select
                        value={adminForm.staffRole}
                        onValueChange={(v) => setAdminForm({ ...adminForm, staffRole: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STAFF_ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* FX-32.1 — branch allocation. Experts work across all branches
                        (no picker). Full admins are global. Front-desk / manager /
                        sales are branch-scoped and must name at least one branch. */}
                    {isExpertRole(adminForm.staffRole) ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <IconMapPin className="w-3.5 h-3.5" />
                        {staffRoleLabel(adminForm.staffRole)}s work across all branches.
                      </p>
                    ) : isFullAdminRole(adminForm.staffRole) ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <IconMapPin className="w-3.5 h-3.5" />
                        Admins have access to every branch.
                      </p>
                    ) : (
                      <div className="rounded-lg border p-3">
                        <label className="text-sm font-medium">Branches *</label>
                        <p className="text-xs text-muted-foreground mb-2">Which branches this account works at.</p>
                        <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={adminForm.allBranches}
                            onChange={(e) =>
                              setAdminForm((prev) => ({
                                ...prev,
                                allBranches: e.target.checked,
                                branchIds: e.target.checked ? [] : prev.branchIds,
                              }))
                            }
                          />
                          <span>Works across all branches</span>
                        </label>
                        {!adminForm.allBranches && (
                          locations.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No branches found. Add a location first.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {locations.map((loc) => {
                                const checked = adminForm.branchIds.includes(loc._id)
                                return (
                                  <label key={loc._id} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-input"
                                      checked={checked}
                                      onChange={(e) =>
                                        setAdminForm((prev) => ({
                                          ...prev,
                                          branchIds: e.target.checked
                                            ? [...prev.branchIds, loc._id]
                                            : prev.branchIds.filter((id) => id !== loc._id),
                                        }))
                                      }
                                    />
                                    <span>{loc.name}{loc.isActive === false ? ' (inactive)' : ''}</span>
                                  </label>
                                )
                              })}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {adminFormError && <p className="text-xs text-red-500">{adminFormError}</p>}

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={handleCloseAdminDialog}>Cancel</Button>
                      <Button onClick={handleAdminSubmit} disabled={inviteAdmin.isPending || updateAdmin.isPending}>
                        {inviteAdmin.isPending || updateAdmin.isPending
                          ? 'Saving...'
                          : editingAdmin ? 'Save Changes' : 'Send Invite'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <AlertDialog open={showAdminUnsavedConfirm} onOpenChange={setShowAdminUnsavedConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                    <AlertDialogDescription>
                      You have unsaved changes. Do you want to leave?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowAdminUnsavedConfirm(false)}>
                      Stay
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setShowAdminUnsavedConfirm(false)
                        if (!editingAdmin) {
                          clearAdminDraft()
                        }
                        setIsAdminDialogOpen(false)
                        resetAdminForm()
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Leave
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* FX-30.3 — shared-login migration control */}
          {sharedAccount && (
            <Card className={sharedAccount.status === 'disabled' ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-amber-500/30 bg-amber-500/[0.04]'}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Shared login — {SHARED_LOGIN_EMAIL}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sharedAccount.status === 'disabled'
                      ? 'Disabled. Everyone now signs in with their own account.'
                      : allMigrated
                        ? 'All personal accounts have signed in — safe to disable the shared login.'
                        : 'Keep enabled until every personal account below is Active and has signed in at least once.'}
                  </p>
                </div>
                {sharedAccount.status === 'disabled' ? (
                  <StatusBadge status="disabled" size="sm" />
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-9 px-3 text-xs font-semibold shrink-0"
                    onClick={handleDisableSharedLogin}
                    disabled={!allMigrated || setAdminStatus.isPending}
                    title={allMigrated ? 'Disable the shared login' : 'All personal accounts must be Active and have signed in first'}
                  >
                    <IconBan className="w-4 h-4 mr-1.5" /> Disable shared login
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

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
                          <TableHead className="w-[180px] pl-6 font-semibold">Name</TableHead>
                          <TableHead className="w-[200px] font-semibold">Email</TableHead>
                          <TableHead className="w-[140px] font-semibold">Role</TableHead>
                          <TableHead className="hidden w-[180px] font-semibold lg:table-cell">Branches</TableHead>
                          <TableHead className="hidden w-[120px] font-semibold xl:table-cell">Phone</TableHead>
                          <TableHead className="w-[110px] font-semibold">Status</TableHead>
                          <TableHead className="hidden w-[130px] font-semibold md:table-cell">Last Sign-in</TableHead>
                          <TableHead className="text-right pr-6 w-[150px] font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAdmins.length === 0 ? (
                          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No staff accounts found</TableCell></TableRow>
                        ) : (
                          paginatedAdmins.map((admin, index) => {
                            const isShared = admin.email.toLowerCase() === SHARED_LOGIN_EMAIL
                            const lastAdmin = isLastFullAdmin(admin)
                            const branchLabel =
                              admin.allBranches || isFullAdminRole(admin.staffRole)
                                ? 'All branches'
                                : (admin.branchIds || [])
                                    .map((id) => branchNameById.get(id) || '…')
                                    .join(', ') || '—'
                            return (
                            <TableRow key={admin._id || index} className="hover:bg-muted/20 border-b border-border/40 transition-colors">
                              <TableCell className="pl-6 font-semibold text-foreground">{admin.adminName}</TableCell>
                              <TableCell className="text-muted-foreground truncate max-w-[200px]" title={admin.email}>{admin.email}</TableCell>
                              <TableCell className="py-2">
                                {admin.staffRole ? (
                                  <Badge variant="outline" className="font-medium px-2 py-0.5 text-xs rounded-full border-border/80 text-foreground bg-background whitespace-nowrap">
                                    {staffRoleLabel(admin.staffRole)}
                                  </Badge>
                                ) : (
                                  <Badge className="font-semibold px-2 py-0.5 text-xs rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 whitespace-nowrap">
                                    Needs role
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-muted-foreground text-xs max-w-[180px] truncate" title={branchLabel}>{branchLabel}</TableCell>
                              <TableCell className="hidden xl:table-cell">{admin.phone}</TableCell>
                              <TableCell className="py-2"><StatusBadge status={admin.status} size="sm" /></TableCell>
                              <TableCell className="hidden text-muted-foreground whitespace-nowrap md:table-cell">
                                {admin.lastLoginAt ? formatJoinedDate(admin.lastLoginAt) : <span className="text-muted-foreground/60">Never</span>}
                              </TableCell>
                              <TableCell className="text-right py-2 pr-6">
                                <div className="flex justify-end items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    onClick={() => handleResendInvite(admin)}
                                    disabled={resendInvite.isPending}
                                    title={admin.invitePending ? 'Resend first-sign-in link' : 'Send password reset link'}
                                  >
                                    <IconSend className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`h-8 w-8 p-0 flex items-center justify-center rounded-md transition-colors disabled:opacity-40 ${admin.status === 'disabled' ? 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10' : 'text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10'}`}
                                    onClick={() => handleToggleStatus(admin)}
                                    disabled={setAdminStatus.isPending || (admin.status !== 'disabled' && lastAdmin)}
                                    title={
                                      admin.status === 'disabled'
                                        ? 'Enable account'
                                        : lastAdmin
                                          ? "Can't disable the last remaining admin"
                                          : 'Disable account'
                                    }
                                  >
                                    {admin.status === 'disabled' ? <IconCircleCheck className="w-4 h-4" /> : <IconBan className="w-4 h-4" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    onClick={() => handleOpenEditAdmin(admin)}
                                    title="Edit account"
                                  >
                                    <IconEdit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                                    onClick={() => { if (confirm('Delete this account?')) deleteAdmin.mutate(admin._id) }}
                                    disabled={deleteAdmin.isPending || isShared || lastAdmin}
                                    title={
                                      isShared
                                        ? 'Disable the shared login instead of deleting it'
                                        : lastAdmin
                                          ? "Can't delete the last remaining admin"
                                          : 'Delete account'
                                    }
                                  >
                                    <IconTrash className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            )
                          })
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

      <UserDetailsDialog
        user={selectedDetailUser}
        membership={selectedDetailUser ? getUserMembership(selectedDetailUser) : null}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />

      {/* FX-30.2 — fallback when the backend returns the invite link instead of emailing it */}
      <Dialog open={inviteLinkDialog.open} onOpenChange={(o) => setInviteLinkDialog((d) => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>First-sign-in link</DialogTitle>
            <DialogDescription>
              Share this one-time link with {inviteLinkDialog.email || 'the new staff member'} so they can set their own password. It was not sent by email.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 pt-2">
            <Input readOnly value={inviteLinkDialog.link} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button size="sm" onClick={copyInviteLink} className="shrink-0">
              <IconCopy className="w-4 h-4 mr-1.5" /> Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
