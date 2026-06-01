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

export function useOnboardingProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.onboarding.byUser(userId),
    queryFn: () => onboardingService.getOnboardingProfile(userId),
    enabled: !!userId,
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

export function useCancelNutritionistBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => onboardingService.cancelNutritionistAppointment(userId),
    onSuccess: (data, userId) => {
      invalidateOnboarding(qc)
      qc.invalidateQueries({ queryKey: queryKeys.users.detail(userId) })
      qc.invalidateQueries({ queryKey: queryKeys.onboarding.byUser(userId) })
      toast.success(data.message || 'Nutritionist booking cancelled')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel booking')
    },
  })
}
