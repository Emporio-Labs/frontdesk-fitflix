import type { ExpertAppointment } from '@/lib/services/onboarding.service'
import type { UserOnboardingSummary } from '@/lib/services/user.service'

export type MemberOnboardingStepKey =
  | 'ACTIVE_X_TEST'
  | 'DNA_SAMPLE'
  | 'VALD_TEST'
  | 'NUTRITION_APPOINTMENT'
  | 'SPORT_SCIENTIST_APPOINTMENT'
  | 'PLAN_TRAINER_ASSIGNMENT'

export type AppointmentKind = 'nutritionist' | 'sports_scientist'
export type MemberOnboardingStepStatus = 'pending' | 'scheduled' | 'complete'

export type LocalOnboardingState = {
  completed: MemberOnboardingStepKey[]
  bookings: Partial<Record<AppointmentKind, { date: string; time: string; mode: 'IN_PERSON' | 'ONLINE' }>>
}

export const MEMBER_ONBOARDING_STORAGE_PREFIX = 'fitflix_member_onboarding_v2:'

export const MEMBER_ONBOARDING_STEPS: Array<{
  key: MemberOnboardingStepKey
  title: string
  description: string
  helper: string
  appointment?: AppointmentKind
}> = [
  {
    key: 'ACTIVE_X_TEST',
    title: 'Active X test',
    description: 'Capture the baseline performance assessment.',
    helper: 'Conduct at the club and record the result.',
  },
  {
    key: 'DNA_SAMPLE',
    title: 'DNA sample',
    description: 'Collect and register the member DNA sample.',
    helper: 'Confirm the sample is labelled and sent to the lab.',
  },
  {
    key: 'VALD_TEST',
    title: 'VALD test',
    description: 'Run the VALD movement and strength assessment.',
    helper: 'Record completion after the testing session.',
  },
  {
    key: 'NUTRITION_APPOINTMENT',
    title: 'Nutrition appointment',
    description: 'Book a consultation with the nutrition team.',
    helper: 'Choose a date, time, and consultation mode in the app.',
    appointment: 'nutritionist',
  },
  {
    key: 'SPORT_SCIENTIST_APPOINTMENT',
    title: 'Sport scientist appointment',
    description: 'Book the performance consultation.',
    helper: 'Choose a date, time, and consultation mode in the app.',
    appointment: 'sports_scientist',
  },
  {
    key: 'PLAN_TRAINER_ASSIGNMENT',
    title: 'Plan & PT trainer assignment',
    description: 'Assign the member plan and personal trainer.',
    helper: 'The membership plan and trainer should be visible on the profile.',
  },
]

export const EMPTY_LOCAL_ONBOARDING_STATE: LocalOnboardingState = { completed: [], bookings: {} }

export function readMemberOnboardingState(userId: string): LocalOnboardingState {
  if (typeof window === 'undefined') return EMPTY_LOCAL_ONBOARDING_STATE
  try {
    const raw = window.localStorage.getItem(`${MEMBER_ONBOARDING_STORAGE_PREFIX}${userId}`)
    if (!raw) return EMPTY_LOCAL_ONBOARDING_STATE
    const parsed = JSON.parse(raw) as Partial<LocalOnboardingState>
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      bookings: parsed.bookings && typeof parsed.bookings === 'object' ? parsed.bookings : {},
    }
  } catch {
    return EMPTY_LOCAL_ONBOARDING_STATE
  }
}

export function getMemberOnboardingStatus({
  onboarding,
  expertAppointments,
  hasActiveMembership,
  hasTrainerAssigned,
  localState,
}: {
  onboarding?: UserOnboardingSummary
  expertAppointments?: ExpertAppointment[]
  hasActiveMembership: boolean
  hasTrainerAssigned: boolean
  localState?: LocalOnboardingState
}) {
  // Readiness is deliberately server-authoritative. `localState` remains in
  // the signature for backward compatibility with older callers, but browser
  // storage must never make an onboarding step appear complete.
  const serverCompleted = new Set<MemberOnboardingStepKey>()
  if (onboarding?.activeXTestCompleted) serverCompleted.add('ACTIVE_X_TEST')
  if (onboarding?.dnaSampleCompleted) serverCompleted.add('DNA_SAMPLE')
  if (onboarding?.valdTestCompleted) serverCompleted.add('VALD_TEST')
  if (onboarding?.nutritionistBooked) serverCompleted.add('NUTRITION_APPOINTMENT')
  if (onboarding?.sportsScientistBooked) serverCompleted.add('SPORT_SCIENTIST_APPOINTMENT')
  if (onboarding?.planTrainerAssignmentCompleted || (hasActiveMembership && hasTrainerAssigned)) {
    serverCompleted.add('PLAN_TRAINER_ASSIGNMENT')
  }

  const statuses = MEMBER_ONBOARDING_STEPS.map((step) => {
    const appointment = step.appointment
      ? (expertAppointments ?? []).find((item) => item.expertType === step.appointment)
      : undefined
    const appointmentStatus = appointment?.bookingStatus?.toLowerCase()
    const isComplete = serverCompleted.has(step.key) || appointmentStatus === 'completed'
    const isScheduled = !!appointment && appointmentStatus !== 'cancelled'
    return {
      ...step,
      status: (isComplete ? 'complete' : isScheduled ? 'scheduled' : 'pending') as MemberOnboardingStepStatus,
    }
  })

  return {
    steps: statuses,
    completedCount: statuses.filter((step) => step.status === 'complete').length,
    scheduledCount: statuses.filter((step) => step.status === 'scheduled').length,
    pendingSteps: statuses.filter((step) => step.status === 'pending'),
  }
}
