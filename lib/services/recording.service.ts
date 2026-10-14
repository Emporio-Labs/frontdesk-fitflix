import { apiClient } from '@/lib/api-client'

export interface RecordingItem {
  _id: string
  sessionId: string
  classId: string
  sessionType: 'live_stream'
  title: string
  instructorName: string
  instructorUserId: string | null
  branchId: string | null
  videoRoomId: string
  recordingTaskId: string | null
  startedAt: string
  endedAt: string | null
  durationSeconds: number
  fileUrl: string | null
  thumbnailUrl: string | null
  status: 'RECORDING' | 'PROCESSING' | 'READY' | 'FAILED'
  isHidden: boolean
  isDeleted: boolean
  viewsCount: number
  createdAt: string
  updatedAt: string
}

export const recordingService = {
  async getAll(): Promise<{ recordings: RecordingItem[] }> {
    const res = await apiClient.get('/api/v1/admin/recordings')
    return res.data
  },

  async updateVisibility(id: string, isHidden: boolean): Promise<{ success: boolean; message: string; recording: RecordingItem }> {
    const res = await apiClient.patch(`/api/v1/admin/recordings/${id}/visibility`, { isHidden })
    return res.data
  },

  async deleteRecording(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete(`/api/v1/admin/recordings/${id}`)
    return res.data
  },
}
