import { apiClient } from '@/lib/api-client'

/**
 * FX-20.3 — Club-wide member notifications.
 *
 * A notification is a one-off message delivered to the members of a club (the
 * Release 2 member app surfaces it). `locationId: null` is company-wide — it
 * reaches members of every club; a concrete `Location._id` reaches only that
 * club's members. The backend is the authority on delivery: it resolves
 * recipients from the `locationId` (and the `X-Location-Id` header the api
 * client attaches on every request) plus the `audience` segment, so a message
 * is never delivered to the wrong club.
 *
 * ASSUMPTION (FX-20.3): the `/member-notifications` routes are UNVERIFIED and
 * tracked as a backend dependency — the member-facing delivery lives in the
 * Release 2 app + backend. This service is the single place to correct when the
 * real contract lands; the hook and page stay stable. Parallel to
 * `push.service.ts` (FX-25), which carries the same caveat.
 */

/**
 * Who in the club should receive the notification. Mirrors `PromotionAudience`
 * minus `non_member` — a notification targets people the club can actually
 * reach (existing or lapsed members), not anonymous prospects.
 */
export type NotificationAudience = 'all' | 'member' | 'lapsed'

export const NOTIFICATION_AUDIENCES: {
  value: NotificationAudience
  label: string
  hint: string
}[] = [
  { value: 'all', label: 'All members', hint: 'Everyone attached to the club' },
  { value: 'member', label: 'Active members', hint: 'Currently on an active plan' },
  { value: 'lapsed', label: 'Lapsed members', hint: 'Was a member before, not on a plan now' },
]

export interface MemberNotification {
  _id: string
  id?: string
  title: string
  body: string
  /** Null means company-wide — reaches every club's members. */
  locationId: string | null
  audience: NotificationAudience
  /** When the notification was sent. */
  sentAt: string
  /** Resolved sender name when the backend populates it. */
  sentBy?: string
  /** How many members the backend delivered to, when it reports it. */
  recipientCount?: number
}

export interface SendMemberNotificationPayload {
  title: string
  body: string
  /** Null = company-wide; a `Location._id` = that club's members only. */
  locationId: string | null
  audience: NotificationAudience
}

/**
 * Backends that run the `applyIdTransform` virtual expose `id` and drop `_id`;
 * the rest of this codebase keys off `_id`, so normalise once here — the same
 * trap `location.service.ts` / `promotion.service.ts` document.
 */
const normalizeMemberNotification = (raw: any): MemberNotification => ({
  _id: raw?._id ?? raw?.id ?? '',
  id: raw?.id ?? raw?._id ?? '',
  title: raw?.title ?? '',
  body: raw?.body ?? raw?.message ?? '',
  locationId: raw?.locationId ?? null,
  audience: (raw?.audience ?? 'all') as NotificationAudience,
  sentAt: raw?.sentAt ?? raw?.createdAt ?? '',
  sentBy:
    typeof raw?.sentBy === 'object'
      ? (raw?.sentBy?.name ?? raw?.sentBy?.adminName ?? undefined)
      : raw?.sentBy
        ? String(raw.sentBy)
        : undefined,
  recipientCount: raw?.recipientCount != null ? Number(raw.recipientCount) : undefined,
})

export interface MemberNotificationQuery {
  /** Branch to scope the history to. Omit for every branch. */
  locationId?: string | null
}

export const memberNotificationService = {
  // ASSUMPTION: GET /member-notifications → { items: MemberNotification[] },
  // branch-scoped by the X-Location-Id header; `locationId` narrows further.
  getAll: async ({
    locationId,
  }: MemberNotificationQuery = {}): Promise<{ items: MemberNotification[] }> => {
    const { data } = await apiClient.get('/member-notifications', {
      params: { ...(locationId ? { locationId } : {}) },
    })
    const list = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.notifications)
        ? data.notifications
        : Array.isArray(data)
          ? data
          : []
    return { items: list.map(normalizeMemberNotification) }
  },

  // ASSUMPTION: POST /member-notifications → { message, notification }.
  send: async (
    payload: SendMemberNotificationPayload,
  ): Promise<{ message: string; notification: MemberNotification }> => {
    const { data } = await apiClient.post('/member-notifications', payload)
    return {
      message: data?.message || 'Notification sent',
      notification: normalizeMemberNotification(data?.notification ?? data),
    }
  },
}
