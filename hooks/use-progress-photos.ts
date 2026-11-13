import { useQuery } from '@tanstack/react-query'
import { progressPhotoService } from '@/lib/services/progress-photo.service'
import { queryKeys } from '@/lib/query-keys'
import type { PhotoPose } from '@/types/progress-photo'

export function useMemberProgressPhotos(
  userId: string,
  params?: { pose?: PhotoPose; from?: string; to?: string; limit?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.users.progressPhotos(userId),
    queryFn: () => progressPhotoService.getMemberPhotos(userId, params),
    enabled: !!userId && enabled,
  })
}

export function useMemberPhotoComparison(
  userId: string,
  params: { dateA: string; dateB: string; pose?: PhotoPose },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.users.photoComparison(userId, params.dateA, params.dateB, params.pose),
    queryFn: () => progressPhotoService.getMemberComparison(userId, params),
    enabled: !!userId && !!params.dateA && !!params.dateB && enabled,
  })
}
