import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query-keys'
import {
  onboardingService,
  HealthMarkersPayload,
  HealthGoalsPayload,
  ConsentPayload,
  ReportUploadPayload,
  OnboardingAppointmentPayload,
} from '@/lib/services/onboarding.service'

// Authenticated user's own onboarding status. NOT for admin dashboards —
// admins read `user.onboardingStatus` from `useUser(id)` instead.
export function useOnboardingStatus() {
  return useQuery({
    queryKey: queryKeys.onboarding.mine(),
    queryFn: onboardingService.getStatus,
  })
}

// Admin visibility — fetches a specific member's live onboarding state.
// Use in lead detail panels and user detail cards when `user.onboardingStatus`
// from the user cache needs a dedicated refresh.
export function useAdminOnboardingStatus(userId: string) {
  return useQuery({
    queryKey: queryKeys.onboarding.byUser(userId),
    queryFn: () => onboardingService.getStatusByUser(userId),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

function invalidateOnboarding(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.onboarding.all() })
  qc.invalidateQueries({ queryKey: queryKeys.users.all() })
}

export function useSubmitHealthMarkers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: HealthMarkersPayload) => onboardingService.submitHealthMarkers(payload),
    onSuccess: (data) => {
      invalidateOnboarding(qc)
      toast.success(data.message || 'Health markers submitted')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to submit health markers')
    },
  })
}

export function useSubmitHealthGoals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: HealthGoalsPayload) => onboardingService.submitHealthGoals(payload),
    onSuccess: (data) => {
      invalidateOnboarding(qc)
      toast.success(data.message || 'Health goals submitted')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to submit health goals')
    },
  })
}

export function useSubmitConsent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ConsentPayload) => onboardingService.submitConsent(payload),
    onSuccess: (data) => {
      invalidateOnboarding(qc)
      toast.success(data.message || 'Consent recorded')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record consent')
    },
  })
}

export function useSubmitOnboardingReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ReportUploadPayload) => onboardingService.submitReport(payload),
    onSuccess: (data) => {
      invalidateOnboarding(qc)
      toast.success(data.message || 'Report uploaded')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to upload report')
    },
  })
}

export function useSubmitOnboardingAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: OnboardingAppointmentPayload) => onboardingService.submitAppointment(payload),
    onSuccess: (data) => {
      invalidateOnboarding(qc)
      toast.success(data.message || 'Appointment booked')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to book appointment')
    },
  })
}

export function useCompleteOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => onboardingService.complete(),
    onSuccess: (data) => {
      invalidateOnboarding(qc)
      toast.success(data.message || 'Onboarding completed')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to complete onboarding')
    },
  })
}
