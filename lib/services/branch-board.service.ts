import { apiClient } from '@/lib/api-client'

export interface BranchBoardSessionItem {
  id: string
  className: string
  instructorName: string
  startTime: string
  endTime: string
  status: string
  roomStatus: string
  isLive: boolean
  capacity: number
  bookingCount: number
}

export interface BranchBoardStaffItem {
  id: string
  name: string
  role: string
  isOnline: boolean
}

export interface BranchBoardAlertItem {
  id: string
  type: string
  severity: string
  status: string
  title: string
  message: string
  createdAt: string
}

export interface BranchBoardItem {
  branch: {
    id: string
    name: string
    code: string
    timezone: string
    isActive: boolean
    phone?: string
  }
  sessions: {
    liveCount: number
    upcomingCount: number
    totalToday: number
    items: BranchBoardSessionItem[]
  }
  checkIns: {
    todayCount: number
    currentlyInGym: number
  }
  staffOnDuty: {
    count: number
    members: BranchBoardStaffItem[]
  }
  alerts: {
    openCount: number
    criticalCount: number
    warningCount: number
    recentAlerts: BranchBoardAlertItem[]
  }
  revenue: {
    todayTotal: number
    currency: string
    invoiceCount: number
  }
}

export type BranchBoardTimeframe = 'today' | 'all'

export interface BranchBoardResponse {
  asOf: string
  timeframe?: BranchBoardTimeframe
  branches: BranchBoardItem[]
}

export const branchBoardService = {
  getBoard: async (
    branchId?: string | null,
    timeframe: BranchBoardTimeframe = 'today'
  ): Promise<BranchBoardResponse> => {
    const params: Record<string, string> = { timeframe }
    if (branchId && branchId !== '__all__' && branchId !== 'all') {
      params.branchId = branchId
    }
    const { data } = await apiClient.get<BranchBoardResponse>('/dashboard/branch-board', {
      params,
    })
    return data
  },
}
