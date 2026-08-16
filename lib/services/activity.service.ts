import { apiClient } from '@/lib/api-client'

/**
 * What a lead has been doing in the app, so whoever calls them knows what to
 * talk about.
 *
 * Narrow on purpose. This is not product analytics — it answers "what was
 * this person looking at", per person, right now. Aggregate funnel questions
 * belong somewhere else entirely.
 *
 * Only exists for people who consented. The app asks at signup, the server
 * refuses to record without it, and withdrawing deletes the history — so an
 * empty summary is the normal case, not a bug, and the UI has to read as
 * "nothing to show" rather than "something went wrong".
 */

export interface InterestItem {
  /** 'therapy' | 'class' | 'plan' — whatever the app tagged the view with. */
  type: string
  id: string
  count: number
  lastViewedAt: string
}

export interface InterestSummary {
  /** Null when nothing has been recorded. */
  lastActiveAt: string | null
  eventCount: number
  topInterests: InterestItem[]
  planViews: number
  consultTaps: number
  mtmJoins: number
}

const normalizeSummary = (raw: any): InterestSummary => ({
  lastActiveAt: raw?.lastActiveAt ?? null,
  eventCount: Number(raw?.eventCount ?? 0),
  topInterests: Array.isArray(raw?.topInterests)
    ? raw.topInterests.map((item: any) => ({
        type: String(item?.type ?? ''),
        id: String(item?.id ?? ''),
        count: Number(item?.count ?? 0),
        lastViewedAt: String(item?.lastViewedAt ?? ''),
      }))
    : [],
  planViews: Number(raw?.planViews ?? 0),
  consultTaps: Number(raw?.consultTaps ?? 0),
  mtmJoins: Number(raw?.mtmJoins ?? 0),
})

export const activityService = {
  getInterestSummary: async (userId: string): Promise<InterestSummary> => {
    const { data } = await apiClient.get(`/api/v1/activity/summary/${userId}`)
    return normalizeSummary(data?.summary)
  },
}
