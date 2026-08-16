import { apiClient } from '@/lib/api-client'

/**
 * Promotions — the marketing layer over classes, therapies, plans and URLs.
 *
 * A promotion owns no content. It points at something that already exists, so
 * booking, credits and cancellation stay with the linked entity.
 */

export type PromotionLinkType = 'class' | 'therapy' | 'plan' | 'url'

/**
 * Null is meaningful: a promotion with no mode is shown to both audiences.
 * This is the promotion's own field, deliberately not inherited from whatever
 * it links to — a `url` link has no target to inherit from.
 */
export type PromotionMode = 'online' | 'offline' | null

/**
 * Who the promotion is pitched at — distinct from `mode`, which is about how
 * the thing is delivered rather than who should hear about it.
 *
 * Three membership states rather than two: someone who never joined and
 * someone who used to be a member want opposite pitches, and collapsing them
 * is how a lapsed member gets sold the introduction they already sat through.
 *
 * The viewer's audience is resolved server-side from their actual memberships,
 * so a targeted promotion is simply never returned to the wrong person.
 */
export type PromotionAudience = 'all' | 'non_member' | 'member' | 'lapsed'

export const PROMOTION_AUDIENCES: {
  value: PromotionAudience
  label: string
  hint: string
}[] = [
  { value: 'all', label: 'Everyone', hint: 'No targeting — shown to every viewer' },
  {
    value: 'non_member',
    label: 'Prospects',
    hint: 'Signed up but never bought a plan, plus the signed-out landing page',
  },
  { value: 'member', label: 'Members', hint: 'Currently on an active plan' },
  {
    value: 'lapsed',
    label: 'Lapsed',
    hint: 'Was a member before, not on a plan now',
  },
]

export interface PromotionLink {
  type: PromotionLinkType
  /** Set for class | therapy | plan. A class id is a UUID; the others are ObjectIds. */
  targetId?: string | null
  /** Set for type: 'url' only. */
  url?: string | null
}

export interface Promotion {
  _id: string
  id?: string
  /** Null means company-wide — shown at every branch. */
  locationId: string | null
  title: string
  imageUrl: string
  subtext: string
  tag: string
  mode: PromotionMode
  audience: PromotionAudience
  /** Overrides the app's built-in button text. Empty means "use the default". */
  ctaLabel: string
  link: PromotionLink
  activeFrom: string
  activeTo: string
  priority: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePromotionPayload {
  locationId?: string | null
  title: string
  imageUrl: string
  subtext?: string
  tag?: string
  mode?: PromotionMode
  audience?: PromotionAudience
  ctaLabel?: string
  link: PromotionLink
  activeFrom: string
  activeTo: string
  priority?: number
  isActive?: boolean
}

export interface UpdatePromotionPayload
  extends Partial<CreatePromotionPayload> {}

/**
 * The backend's `applyIdTransform` strips `_id` and exposes the `id` virtual
 * instead. The rest of this codebase keys off `_id`, so normalise once here —
 * the same trap `location.service.ts` documents.
 */
const normalizePromotion = (raw: any): Promotion => ({
  _id: raw?._id ?? raw?.id ?? '',
  id: raw?.id ?? raw?._id ?? '',
  locationId: raw?.locationId ?? null,
  title: raw?.title ?? '',
  imageUrl: raw?.imageUrl ?? '',
  subtext: raw?.subtext ?? '',
  tag: raw?.tag ?? '',
  // Absent and null both mean "matches both audiences"; don't coerce to a string.
  mode: raw?.mode ?? null,
  // Promotions created before targeting existed carry no `audience` at all.
  // They are shown to everyone (the backend's $in includes null), so reading
  // them as 'all' is what the server actually does with them.
  audience: (raw?.audience ?? 'all') as PromotionAudience,
  ctaLabel: raw?.ctaLabel ?? '',
  link: {
    type: raw?.link?.type ?? 'url',
    targetId: raw?.link?.targetId ?? null,
    url: raw?.link?.url ?? null,
  },
  activeFrom: raw?.activeFrom ?? '',
  activeTo: raw?.activeTo ?? '',
  priority: Number(raw?.priority ?? 0),
  isActive: raw?.isActive !== false,
  createdAt: raw?.createdAt ?? '',
  updatedAt: raw?.updatedAt ?? '',
})

export interface PromotionQuery {
  /** Branch to scope to. Omit for every branch. */
  locationId?: string | null
  /** Staff-only; the backend ignores it for everyone else. */
  includeInactive?: boolean
}

export const promotionService = {
  getAll: async ({
    locationId,
    includeInactive,
  }: PromotionQuery = {}): Promise<{ promotions: Promotion[] }> => {
    const { data } = await apiClient.get('/api/v1/promotions', {
      params: {
        ...(locationId ? { locationId } : {}),
        ...(includeInactive ? { includeInactive: 'true' } : {}),
      },
    })
    return {
      promotions: (data?.promotions ?? []).map(normalizePromotion),
    }
  },

  getById: async (id: string): Promise<{ promotion: Promotion }> => {
    const { data } = await apiClient.get(`/api/v1/promotions/${id}`)
    return { promotion: normalizePromotion(data?.promotion) }
  },

  create: async (
    payload: CreatePromotionPayload
  ): Promise<{ message: string; promotion: Promotion }> => {
    const { data } = await apiClient.post('/api/v1/promotions', payload)
    return {
      message: data?.message || 'Promotion created',
      promotion: normalizePromotion(data?.promotion),
    }
  },

  update: async (
    id: string,
    payload: UpdatePromotionPayload
  ): Promise<{ message: string; promotion: Promotion }> => {
    const { data } = await apiClient.patch(`/api/v1/promotions/${id}`, payload)
    return {
      message: data?.message || 'Promotion updated',
      promotion: normalizePromotion(data?.promotion),
    }
  },

  /**
   * A hard delete — nothing references a promotion, so removing one orphans no
   * history. To take a promotion off the carousel without losing it, set
   * `isActive: false` instead.
   */
  remove: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/api/v1/promotions/${id}`)
    return { message: data?.message || 'Promotion deleted' }
  },
}
