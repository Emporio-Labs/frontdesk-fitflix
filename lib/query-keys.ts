export const queryKeys = {
  users: {
    all: () => ['users'] as const,
    detail: (id: string) => ['users', id] as const,
  },
  admins: {
    all: () => ['admins'] as const,
    detail: (id: string) => ['admins', id] as const,
  },
  doctors: {
    all: () => ['doctors'] as const,
    detail: (id: string) => ['doctors', id] as const,
  },
  trainers: {
    all: () => ['trainers'] as const,
    detail: (id: string) => ['trainers', id] as const,
  },
  slots: {
    all: () => ['slots'] as const,
    detail: (id: string) => ['slots', id] as const,
  },
  bookings: {
    all: () => ['bookings'] as const,
    mine: () => ['bookings', 'me'] as const,
    detail: (id: string) => ['bookings', id] as const,
  },
  appointments: {
    all: () => ['appointments'] as const,
    mine: () => ['appointments', 'me'] as const,
    detail: (id: string) => ['appointments', id] as const,
  },
  schedules: {
    mine: () => ['schedules', 'me'] as const,
    user: (userId: string) => ['schedules', userId] as const,
  },
  memberships: {
    all: () => ['memberships'] as const,
    detail: (id: string) => ['memberships', id] as const,
  },
  membershipPlans: {
    all: () => ['membership-plans'] as const,
    detail: (id: string) => ['membership-plans', id] as const,
  },
  therapies: {
    all: () => ['therapies'] as const,
    detail: (id: string) => ['therapies', id] as const,
  },
  services: {
    all: () => ['services'] as const,
    detail: (id: string) => ['services', id] as const,
  },
  leads: {
    all: () => ['leads'] as const,
    detail: (id: string) => ['leads', id] as const,
  },
  exercises: {
    all: () => ['exercises'] as const,
    list: (filters?: Record<string, any>) => ['exercises', 'list', filters] as const,
    detail: (id: string) => ['exercises', id] as const,
  },
  workoutSessions: {
    all: () => ['workout-sessions'] as const,
    detail: (id: string) => ['workout-sessions', id] as const,
  },
  credits: {
    myBalance: () => ['credits', 'me', 'balance'] as const,
    myHistory: (limit = 50, sourceType?: string) => ['credits', 'me', 'history', limit, sourceType || 'all'] as const,
    userBalance: (userId: string) => ['credits', 'users', userId, 'balance'] as const,
    userHistory: (userId: string, limit = 50, sourceType?: string) =>
      ['credits', 'users', userId, 'history', limit, sourceType || 'all'] as const,
  },
  onboarding: {
    all: () => ['onboarding'] as const,
    mine: () => ['onboarding', 'me'] as const,
    byUser: (userId: string) => ['onboarding', 'user', userId] as const,
  },
  nutritionistBookings: {
    all: () => ['nutritionist-bookings'] as const,
    detail: (id: string) => ['nutritionist-bookings', id] as const,
  },
}
