// Mock analytics data for admin dashboard.
// Backend stats endpoints (/workouts/me/stats) are user-scoped,
// so admin-level aggregated analytics use local plan state + these placeholders.

export const MOCK_WEEKLY_ENGAGEMENT = [
  { day: 'Mon', sessions: 12 },
  { day: 'Tue', sessions: 18 },
  { day: 'Wed', sessions: 15 },
  { day: 'Thu', sessions: 22 },
  { day: 'Fri', sessions: 20 },
  { day: 'Sat', sessions: 8 },
  { day: 'Sun', sessions: 5 },
]

export const MOCK_MUSCLE_GROUP_DISTRIBUTION = [
  { group: 'Chest', count: 34 },
  { group: 'Back', count: 28 },
  { group: 'Legs', count: 42 },
  { group: 'Shoulders', count: 18 },
  { group: 'Arms', count: 24 },
  { group: 'Core', count: 16 },
]

export const MOCK_COMPLETION_TREND = [
  { date: '05/09', completed: 8, total: 12 },
  { date: '05/10', completed: 10, total: 14 },
  { date: '05/11', completed: 6, total: 10 },
  { date: '05/12', completed: 14, total: 16 },
  { date: '05/13', completed: 12, total: 15 },
  { date: '05/14', completed: 9, total: 11 },
  { date: '05/15', completed: 11, total: 13 },
]
