import type { UserRole } from '@/lib/rbac'

export interface ReportAccessContext {
  currentUser?: {
    id?: string
    name?: string
    email?: string
    role?: UserRole
  } | null
  targetMember?: any
  myMembersList?: any[]
  myClientsList?: any[]
}

export interface ReportAccessResult {
  allowed: boolean
  reason?: string
}

/**
 * Normalizes an entity ID or populated user object to a string ID.
 */
export function extractId(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value._id) return String(value._id)
  if (value.id) return String(value.id)
  if (value.userId) return extractId(value.userId)
  return ''
}

/**
 * Determines whether the current authenticated user has permission to
 * open/view medical reports for the given target member (AC FX-07.3).
 *
 * Rules:
 * - Admin / Clinic Admin / Staff / Clinician / Doctor: Always allowed.
 * - Nutritionist: Allowed ONLY for members they look after (assigned client or booked consultation).
 * - Trainer: Allowed ONLY for members they look after (assigned member in PT roster).
 * - Other: Disallowed.
 */
export function canAccessMemberReports(context: ReportAccessContext): ReportAccessResult {
  const { currentUser, targetMember, myMembersList = [], myClientsList = [] } = context

  if (!currentUser) {
    return { allowed: false, reason: 'Authentication required to view medical reports.' }
  }

  const role = currentUser.role
  const currentUserId = currentUser.id ? String(currentUser.id) : ''
  const currentUserName = currentUser.name?.trim().toLowerCase() || ''
  const currentUserEmail = currentUser.email?.trim().toLowerCase() || ''
  const targetMemberId = extractId(targetMember)

  // 1. Elevated clinical and administrative roles have full access
  const unrestrictedRoles: UserRole[] = [
    'super_admin',
    'clinic_admin',
    'staff',
    'clinician',
  ]
  if (role && unrestrictedRoles.includes(role)) {
    return { allowed: true }
  }

  // 2. Nutritionist role: strictly scoped to members they look after
  if (role === 'nutritionist') {
    // Check if member is in nutritionist's client list
    const inClientList = myClientsList.some((client) => {
      const cid = extractId(client)
      return cid && targetMemberId && cid === targetMemberId
    })

    if (inClientList) {
      return { allowed: true }
    }

    // Check direct nutritionist assignment on member profile
    const assignedNutriId = extractId(
      targetMember?.assignedNutritionist || targetMember?.assignedNutritionistId
    )
    if (assignedNutriId && currentUserId && assignedNutriId === currentUserId) {
      return { allowed: true }
    }

    // Check nutritionist appointment records on the target member
    const appts = targetMember?.expertAppointments
    if (Array.isArray(appts)) {
      const hasMyAppointment = appts.some((a: any) => {
        if (a.expertType !== 'nutritionist') return false
        const nutId = extractId(a.assignedNutritionistId || a.assignedNutritionist)
        if (nutId && currentUserId && nutId === currentUserId) return true
        const nutName = String(a.assignedNutritionistName || '').trim().toLowerCase()
        if (nutName && currentUserName && nutName === currentUserName) return true
        return false
      })
      if (hasMyAppointment) {
        return { allowed: true }
      }
    }

    return {
      allowed: false,
      reason: 'As a nutritionist, you can only open medical reports for members you look after.',
    }
  }

  // 3. Trainer role: strictly scoped to members they look after
  if (role === 'trainer') {
    // Check if member is in trainer's assigned members list
    const inTrainerList = myMembersList.some((m) => {
      const mid = extractId(m)
      return mid && targetMemberId && mid === targetMemberId
    })

    if (inTrainerList) {
      return { allowed: true }
    }

    // Check assignedTrainer on member profile
    const assignedTrainerRaw = targetMember?.assignedTrainer
    const assignedTrainerId = extractId(assignedTrainerRaw)

    if (assignedTrainerId && currentUserId && assignedTrainerId === currentUserId) {
      return { allowed: true }
    }

    if (typeof assignedTrainerRaw === 'object' && assignedTrainerRaw !== null) {
      const tEmail = String(assignedTrainerRaw.email || '').trim().toLowerCase()
      const tName = String(assignedTrainerRaw.trainerName || '').trim().toLowerCase()
      if (currentUserEmail && tEmail && tEmail === currentUserEmail) return { allowed: true }
      if (currentUserName && tName && tName === currentUserName) return { allowed: true }
    }

    return {
      allowed: false,
      reason: 'As a trainer, you can only open medical reports for members you look after.',
    }
  }

  return {
    allowed: false,
    reason: 'You do not have permission to view medical reports for this member.',
  }
}
