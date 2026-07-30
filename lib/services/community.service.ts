import { apiClient } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ModAuthor {
  id: string
  name: string | null
  role: 'member' | 'trainer' | 'admin'
}

export interface AdminPost {
  id: string
  author: ModAuthor
  title: string
  content: string
  /** Long-form description. Empty string when not set. */
  description: string
  visibility: 'public' | 'members_only'
  status: string
  isOfficial: boolean
  pinned: boolean
  edited: boolean
  deleted: boolean
  likeCount: number
  commentCount: number
  shareCount: number
  createdAt: string
  media?: {
    id: string
    kind: string
    url: string
    position: number
    /** Only set for kind 'file' — files have no preview, so the chip is
     *  rendered from the original name and size. */
    originalName?: string | null
    mimeType?: string | null
    bytes?: number | null
  }[]
}

export interface AdminComment {
  id: string
  parentId: string | null
  author: ModAuthor
  body: string
  deleted: boolean
  likeCount: number
  createdAt: string
}

export interface PostVersionRow {
  id: string
  version: number
  editedBy: string
  editedAt: string
  titleSnapshot: string
  contentSnapshot: string
  /** Snapshot of description at this version. Empty string when not set. */
  descriptionSnapshot: string
}

export interface ReportRow {
  id: string
  targetType: 'post' | 'comment' | 'user'
  targetId: string
  reason: string
  note: string
  reporter: string | null
  reportCount: number
  ageHours: number
  createdAt: string
  content: { content?: string; body?: string; visibility?: string } | null
}

export interface AdminUserRow {
  id: string
  username: string | null
  status: string
  suspendedUntil: string | null
  communityRole: string | null
  createdAt: string | null
}

export interface AdminUserDetail {
  user: Record<string, any>
  membership: Record<string, any> | null
  postCount: number
  commentCount: number
  reportsAgainst: number
  moderationActions: Record<string, any>[]
}

export type ReportAction = 'dismiss' | 'delete_content' | 'warn' | 'suspend' | 'ban'

/** Returned by POST /community/media/images */
export interface UploadedImage {
  type: 'image'
  url: string
  thumbnailUrl: string
  fullUrl: string
  blurredUrl: string
  position: number
  width: number
  height: number
  bytes: number
  originalName: string
  mimeType: string
}

/** Returned by POST /community/media/files for non-image files */
export interface UploadedFile {
  type: 'file'
  url: string
  previewUrl: string
  bytes: number
  originalName: string
  mimeType: string
}

/** Result of the direct-to-S3 video upload flow (presign + PUT). */
export interface UploadedVideo {
  type: 'video'
  s3Key: string
  bytes: number
  originalName: string
  mimeType: string
}

export type UploadedAttachment = UploadedImage | UploadedFile | UploadedVideo

const B = '/community/admin'
const stepUpHeader = (token?: string) =>
  token ? { headers: { 'X-Step-Up-Token': token } } : undefined

export const communityService = {
  // Re-auth (step-up) for destructive actions.
  stepUp: async (password: string): Promise<{ stepUpToken: string }> => {
    const { data } = await apiClient.post(`${B}/step-up`, { password })
    return data
  },

  // ── Media uploads ──────────────────────────────────────────────────────────

  /** Upload one or more images (jpeg/png/webp) to /community/media/images */
  uploadImages: async (files: File[]): Promise<UploadedImage[]> => {
    const form = new FormData()
    for (const f of files) form.append('images', f)
    const { data } = await apiClient.post('/community/media/images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return (data.images ?? []) as UploadedImage[]
  },

  /** Upload any supported files (images, PDFs, DOCX) to /community/media/files */
  uploadFiles: async (files: File[]): Promise<UploadedAttachment[]> => {
    const form = new FormData()
    for (const f of files) form.append('files', f)
    const { data } = await apiClient.post('/community/media/files', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return (data.files ?? []) as UploadedAttachment[]
  },

  /**
   * Upload a video directly to S3: get a presigned PUT URL from the backend,
   * then PUT the raw file straight to S3 (bypassing our server, unlike the
   * other media types — videos are large enough that proxying them through
   * the API is wasteful and slow). The presigned URL is single-use and
   * already scoped to this exact key/content-type/size, so the PUT itself
   * needs no auth header.
   */
  uploadVideo: async (file: File): Promise<UploadedVideo> => {
    const { data: presign } = await apiClient.post('/community/media/video/presign', {
      filename: file.name,
      contentType: file.type,
      contentLength: file.size,
    })

    const putRes = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!putRes.ok) {
      throw new Error(`Video upload to storage failed (${putRes.status})`)
    }

    return {
      type: 'video',
      s3Key: presign.s3Key,
      bytes: file.size,
      originalName: file.name,
      mimeType: file.type,
    }
  },

  // Posts
  listPosts: async (params: Record<string, string> = {}) => {
    const { data } = await apiClient.get(`${B}/posts`, { params })
    return (data.posts ?? []) as AdminPost[]
  },
  getPost: async (id: string) => {
    const { data } = await apiClient.get(`${B}/posts/${id}`)
    return data.post as AdminPost
  },
  editPost: async (id: string, payload: { title?: string; body?: string; description?: string; visibility?: string; reason?: string }) => {
    const { data } = await apiClient.patch(`${B}/posts/${id}`, payload)
    return data
  },
  deletePost: async (id: string, reason: string, stepUpToken: string) => {
    const { data } = await apiClient.delete(`${B}/posts/${id}`, {
      data: { reason },
      ...stepUpHeader(stepUpToken),
    } as any)
    return data
  },
  restorePost: async (id: string, reason?: string) => {
    const { data } = await apiClient.post(`${B}/posts/${id}/restore`, { reason })
    return data
  },
  pinPost: async (id: string) => (await apiClient.post(`${B}/posts/${id}/pin`)).data,
  unpinPost: async (id: string) => (await apiClient.post(`${B}/posts/${id}/unpin`)).data,
  createOfficial: async (payload: { title?: string; body: string; description?: string; visibility: string; images?: any[]; attachments?: any[]; video?: { s3Key: string } }) =>
    (await apiClient.post(`${B}/posts/official`, payload)).data,

  // Comments
  listComments: async (postId: string) => {
    const { data } = await apiClient.get(`${B}/posts/${postId}/comments`)
    return (data.comments ?? []) as AdminComment[]
  },
  deleteComment: async (id: string, reason: string, stepUpToken: string) =>
    (
      await apiClient.delete(`${B}/comments/${id}`, {
        data: { reason },
        ...stepUpHeader(stepUpToken),
      } as any)
    ).data,

  // History (read-only)
  getVersions: async (postId: string) => {
    const { data } = await apiClient.get(`${B}/posts/${postId}/versions`)
    return (data.versions ?? []) as PostVersionRow[]
  },

  // Reports
  listReports: async () => {
    const { data } = await apiClient.get(`${B}/reports`)
    return (data.reports ?? []) as ReportRow[]
  },
  resolveReport: async (
    id: string,
    action: ReportAction,
    reason: string | undefined,
    stepUpToken: string,
  ) =>
    (
      await apiClient.post(
        `${B}/reports/${id}/resolve`,
        { action, reason },
        stepUpHeader(stepUpToken),
      )
    ).data,

  // Users
  listUsers: async (params: Record<string, string> = {}) => {
    const { data } = await apiClient.get(`${B}/users`, { params })
    return (data.users ?? []) as AdminUserRow[]
  },
  getUser: async (id: string) => {
    const { data } = await apiClient.get(`${B}/users/${id}`)
    return data as AdminUserDetail
  },
  suspendUser: async (id: string, reason: string, until: string | null, stepUpToken: string) =>
    (await apiClient.post(`${B}/users/${id}/suspend`, { reason, until }, stepUpHeader(stepUpToken))).data,
  unsuspendUser: async (id: string, reason?: string) =>
    (await apiClient.post(`${B}/users/${id}/unsuspend`, { reason })).data,
  banUser: async (id: string, reason: string, stepUpToken: string) =>
    (await apiClient.post(`${B}/users/${id}/ban`, { reason }, stepUpHeader(stepUpToken))).data,
  unbanUser: async (id: string, reason?: string) =>
    (await apiClient.post(`${B}/users/${id}/unban`, { reason })).data,
  assignTrainer: async (id: string) => (await apiClient.post(`${B}/users/${id}/role`)).data,
  revokeTrainer: async (id: string) => (await apiClient.delete(`${B}/users/${id}/role`)).data,
}
