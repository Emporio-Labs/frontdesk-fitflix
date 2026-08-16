import { apiClient } from '@/lib/api-client'

/**
 * Copy overrides for the mobile app.
 *
 * The app ships every string it needs and asks this collection only whether to
 * say something else. That direction matters when editing here: deleting a row
 * restores the app's built-in wording rather than blanking the line, and an
 * empty table is a perfectly healthy state.
 *
 * It exists because changing a headline otherwise costs an App Store and a
 * Play Store review — which in practice means the copy never changes.
 */

export type ContentPlatform = 'ios' | 'android'

export interface ContentOverride {
  _id: string
  id?: string
  /** Dotted, lowercase, namespaced by surface — e.g. `visitor.hero.title`. */
  key: string
  value: string
  /** Null means every platform. */
  platform: ContentPlatform | null
  /** Internal note for staff; never sent to the app. */
  note: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateContentOverridePayload {
  key: string
  value: string
  platform?: ContentPlatform | null
  note?: string
  isActive?: boolean
}

export interface UpdateContentOverridePayload
  extends Partial<CreateContentOverridePayload> {}

/**
 * The backend's `applyIdTransform` strips `_id` for the `id` virtual, while the
 * rest of this codebase keys off `_id`. Normalise once, as promotion.service
 * and location.service already do.
 */
const normalize = (raw: any): ContentOverride => ({
  _id: raw?._id ?? raw?.id ?? '',
  id: raw?.id ?? raw?._id ?? '',
  key: raw?.key ?? '',
  value: raw?.value ?? '',
  // Absent and null both mean "every platform"; don't coerce to a string.
  platform: raw?.platform ?? null,
  note: raw?.note ?? '',
  isActive: raw?.isActive !== false,
  createdAt: raw?.createdAt ?? '',
  updatedAt: raw?.updatedAt ?? '',
})

export const contentService = {
  getAll: async (): Promise<{ overrides: ContentOverride[] }> => {
    const { data } = await apiClient.get('/api/v1/content', {
      // Staff manage the whole table, including rows that are switched off.
      params: { includeInactive: 'true' },
    })
    return { overrides: (data?.overrides ?? []).map(normalize) }
  },

  create: async (
    payload: CreateContentOverridePayload
  ): Promise<{ override: ContentOverride }> => {
    const { data } = await apiClient.post('/api/v1/content', payload)
    return { override: normalize(data?.override) }
  },

  update: async (
    id: string,
    payload: UpdateContentOverridePayload
  ): Promise<{ override: ContentOverride }> => {
    const { data } = await apiClient.patch(`/api/v1/content/${id}`, payload)
    return { override: normalize(data?.override) }
  },

  /**
   * Removes the override entirely, which restores whatever the app shipped
   * with. To hide a row without losing the text, set `isActive: false`.
   */
  remove: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/api/v1/content/${id}`)
    return { message: data?.message || 'Override deleted' }
  },
}
