import { apiClient } from '@/lib/api-client'
import type {
  PhotoPose,
  ProgressComparisonResponse,
  ProgressPhotosResponse,
} from '@/types/progress-photo'

export const progressPhotoService = {
  getMemberPhotos: async (
    userId: string,
    params?: { pose?: PhotoPose; from?: string; to?: string; limit?: number },
  ): Promise<ProgressPhotosResponse> => {
    const query = new URLSearchParams()
    if (params?.pose) query.set('pose', params.pose)
    if (params?.from) query.set('from', params.from)
    if (params?.to) query.set('to', params.to)
    if (params?.limit) query.set('limit', String(params.limit))

    const qs = query.toString()
    const path = `/progress/photos/user/${userId}${qs ? `?${qs}` : ''}`
    const { data } = await apiClient.get(path)
    return data as ProgressPhotosResponse
  },

  getMemberComparison: async (
    userId: string,
    params: { dateA: string; dateB: string; pose?: PhotoPose },
  ): Promise<ProgressComparisonResponse> => {
    const query = new URLSearchParams({
      dateA: params.dateA,
      dateB: params.dateB,
    })
    if (params.pose) query.set('pose', params.pose)

    const path = `/progress/photos/user/${userId}/compare?${query.toString()}`
    const { data } = await apiClient.get(path)
    return data as ProgressComparisonResponse
  },
}
