export type PhotoPose = 'front' | 'side' | 'back'

export interface ProgressPhoto {
  _id: string
  userId: string
  recordedDate: string
  capturedAt: string
  pose: PhotoPose
  url: string
  thumbnailUrl: string
  weightKg?: number
  notes?: string
  isPrivateToSelf?: boolean
  createdAt: string
  updatedAt: string
}

export interface ProgressCheckInGroup {
  date: string
  recordedDate: string
  weightKg?: number
  notes?: string
  poses: {
    front?: ProgressPhoto
    side?: ProgressPhoto
    back?: ProgressPhoto
  }
}

export interface ProgressPhotosResponse {
  memberId: string
  total: number
  checkIns: ProgressCheckInGroup[]
  photos: ProgressPhoto[]
}

export interface ProgressComparisonResponse {
  memberId: string
  before: ProgressCheckInGroup
  after: ProgressCheckInGroup
}
