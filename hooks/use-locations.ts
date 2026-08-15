import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CreateLocationPayload,
  LocationSettings,
  UpdateLocationPayload,
  locationService,
} from '@/lib/services/location.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

export function useLocations(includeInactive = false) {
  return useQuery({
    queryKey: queryKeys.locations.all(includeInactive),
    queryFn: () => locationService.getAll(includeInactive),
    select: (data) => data.locations,
    // Branches change rarely and every scoped query depends on this list, so
    // a longer stale window avoids refetching it constantly.
    staleTime: 5 * 60 * 1000,
  })
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: queryKeys.locations.detail(id),
    queryFn: () => locationService.getById(id),
    select: (data) => data.location,
    enabled: !!id,
  })
}

export function useLocationSettings(id: string) {
  return useQuery({
    queryKey: queryKeys.locations.settings(id),
    queryFn: () => locationService.getSettings(id),
    enabled: !!id,
  })
}

export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateLocationPayload) => locationService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success(data.message || 'Location created')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to create location'),
  })
}

export function useUpdateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLocationPayload }) =>
      locationService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success(data.message || 'Location updated')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to update location'),
  })
}

export function useDeactivateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => locationService.deactivate(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success(data.message || 'Location deactivated')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to deactivate location'),
  })
}

export function useUpdateLocationSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LocationSettings> }) =>
      locationService.updateSettings(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.locations.settings(data.locationId) })
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success(data.message || 'Settings updated')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to update settings'),
  })
}

export function useCopyLocationSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sourceId }: { id: string; sourceId: string }) =>
      locationService.copySettingsFrom(id, sourceId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.locations.settings(data.locationId) })
      toast.success(data.message || 'Settings copied')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to copy settings'),
  })
}
