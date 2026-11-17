export type WearableSource = 'APPLE_HEALTH' | 'HEALTH_CONNECT'

export interface WearableDay {
  date: string
  source: WearableSource | null
  steps?: number
  activeCaloriesKcal?: number
  distanceMeters?: number
  restingHeartRate?: number
  avgHeartRate?: number
  maxHeartRate?: number
  workoutCount?: number
  workoutMinutes?: number
  weightKg?: number
}

export interface WearableConnection {
  source: WearableSource
  connectedAt: string
  lastSyncedAt: string | null
}

/**
 * `sharing: false` is a normal state, not an error: the member hasn't turned
 * on "Share with my coach" (or is under 18), so the backend sends no data.
 */
export type MemberWearablesResponse =
  | { sharing: false; reason?: string; daily: [] }
  | {
      sharing: true
      from: string
      to: string
      daily: WearableDay[]
      connections: WearableConnection[]
    }
