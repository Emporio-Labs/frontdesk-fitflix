export type AgendaItemCategory =
  | 'WORKOUT'
  | 'CLASS'
  | 'LIVE_STREAM'
  | 'THERAPY'
  | 'COACHING'
  | 'NUTRITIONIST'
  | 'CHECKIN'

export type AgendaItemStatus =
  | 'SCHEDULED'
  | 'LIVE_NOW'
  | 'COMPLETED'
  | 'MISSED'
  | 'CANCELLED'
  | 'REST_DAY'

export interface AgendaDots {
  workout: boolean
  therapy: boolean
  coaching: boolean
  classSession: boolean
  nutrition: boolean
}

export interface AgendaItem {
  id: string
  sourceId: string
  sourceCollection: string
  category: AgendaItemCategory
  title: string
  subtitle?: string
  date: string // YYYY-MM-DD
  startTime?: string
  endTime?: string
  timeLabel: string
  status: AgendaItemStatus
  isOnline: boolean
  location?: string
  zegoRoomId?: string | null
  canJoinNow: boolean
  actionUrl?: string
  metadata?: Record<string, unknown>
}

export interface AgendaDay {
  date: string // YYYY-MM-DD
  dayOfWeek: number
  dayName: string
  dayInitial: string
  isToday: boolean
  isPast: boolean
  hasEvents: boolean
  dots: AgendaDots
  items: AgendaItem[]
}

export interface AgendaResult {
  selectedDate: string
  range: {
    from: string
    to: string
  }
  summary: {
    todayItemCount: number
    weekItemCount: number
  }
  days: AgendaDay[]
}
