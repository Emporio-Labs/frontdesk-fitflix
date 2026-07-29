import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { communityService, ReportAction, UploadedAttachment } from '@/lib/services/community.service'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

// The community admin API returns `{ error, code }`; the shared error normalizer
// can also emit `message`. Read both so the operator sees the real reason
// (e.g. REASON_REQUIRED, ADMIN_SCOPE_REQUIRED) instead of a generic string.
function apiError(err: any, fallback: string): string {
  return err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback
}

// Every admin write can change list counts, report state and audit history, so
// each mutation invalidates the whole `community` namespace rather than trying
// to predict which of the seven caches moved.
function useCommunityMutation<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  success: string,
  failure: string
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community'] })
      toast.success(success)
    },
    onError: (err: any) => toast.error(apiError(err, failure)),
  })
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useAdminPosts(filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: queryKeys.community.posts(filters),
    queryFn: () => communityService.listPosts(filters),
    staleTime: 10_000,
  })
}

export function useAdminPost(id: string) {
  return useQuery({
    queryKey: queryKeys.community.post(id),
    queryFn: () => communityService.getPost(id),
    enabled: !!id,
  })
}

export function useAdminComments(postId: string) {
  return useQuery({
    queryKey: queryKeys.community.comments(postId),
    queryFn: () => communityService.listComments(postId),
    enabled: !!postId,
  })
}

export function usePostVersions(postId: string) {
  return useQuery({
    queryKey: queryKeys.community.versions(postId),
    queryFn: () => communityService.getVersions(postId),
    enabled: !!postId,
  })
}

export function useAdminReports() {
  return useQuery({
    queryKey: queryKeys.community.reports(),
    queryFn: () => communityService.listReports(),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  })
}

export function useAdminUsers(filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: queryKeys.community.users(filters),
    queryFn: () => communityService.listUsers(filters),
    staleTime: 10_000,
  })
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: queryKeys.community.user(id),
    queryFn: () => communityService.getUser(id),
    enabled: !!id,
  })
}

// ── Step-up re-auth ───────────────────────────────────────────────────────────

// Deliberately NOT cached and never persisted: the token lives in component
// state for the 5 minutes the backend honours it, then it is gone.
export function useStepUp() {
  return useMutation({
    mutationFn: (password: string) => communityService.stepUp(password),
    onError: (err: any) => toast.error(apiError(err, 'Re-authentication failed')),
  })
}

// ── Post mutations ────────────────────────────────────────────────────────────

export function usePinPost() {
  return useCommunityMutation(
    (id: string) => communityService.pinPost(id),
    'Post pinned',
    'Failed to pin post'
  )
}

export function useUnpinPost() {
  return useCommunityMutation(
    (id: string) => communityService.unpinPost(id),
    'Post unpinned',
    'Failed to unpin post'
  )
}

export function useEditPost() {
  return useCommunityMutation(
    ({ id, ...payload }: { id: string; title?: string; body?: string; description?: string; visibility?: string; reason?: string }) =>
      communityService.editPost(id, payload),
    'Post updated',
    'Failed to update post'
  )
}

export function useDeletePost() {
  return useCommunityMutation(
    ({ id, reason, stepUpToken }: { id: string; reason: string; stepUpToken: string }) =>
      communityService.deletePost(id, reason, stepUpToken),
    'Post deleted',
    'Failed to delete post'
  )
}

export function useRestorePost() {
  return useCommunityMutation(
    ({ id, reason }: { id: string; reason?: string }) => communityService.restorePost(id, reason),
    'Post restored',
    'Failed to restore post'
  )
}

export function useCreateOfficial() {
  return useCommunityMutation(
    (payload: { title?: string; body: string; description?: string; visibility: string; images?: any[]; attachments?: any[]; video?: { s3Key: string } }) =>
      communityService.createOfficial(payload),
    'Official post published',
    'Failed to publish post'
  )
}

// ── Upload hooks ──────────────────────────────────────────────────────────────

export function useUploadFiles() {
  return useMutation({
    mutationFn: (files: File[]) => communityService.uploadFiles(files),
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Upload failed'
      // Import toast lazily to avoid circular deps
      import('sonner').then(({ toast }) => toast.error(msg))
    },
  })
}

export function useUploadVideo() {
  return useMutation({
    mutationFn: (file: File) => communityService.uploadVideo(file),
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Video upload failed'
      import('sonner').then(({ toast }) => toast.error(msg))
    },
  })
}

// ── Comment mutations ─────────────────────────────────────────────────────────

export function useDeleteComment() {
  return useCommunityMutation(
    ({ id, reason, stepUpToken }: { id: string; reason: string; stepUpToken: string }) =>
      communityService.deleteComment(id, reason, stepUpToken),
    'Comment deleted',
    'Failed to delete comment'
  )
}

// ── Report mutations ──────────────────────────────────────────────────────────

export function useResolveReport() {
  return useCommunityMutation(
    ({
      id,
      action,
      reason,
      stepUpToken,
    }: { id: string; action: ReportAction; reason?: string; stepUpToken: string }) =>
      communityService.resolveReport(id, action, reason, stepUpToken),
    'Report resolved',
    'Failed to resolve report'
  )
}

// ── User mutations ────────────────────────────────────────────────────────────

export function useSuspendUser() {
  return useCommunityMutation(
    ({
      id,
      reason,
      until,
      stepUpToken,
    }: { id: string; reason: string; until: string | null; stepUpToken: string }) =>
      communityService.suspendUser(id, reason, until, stepUpToken),
    'User suspended',
    'Failed to suspend user'
  )
}

export function useUnsuspendUser() {
  return useCommunityMutation(
    ({ id, reason }: { id: string; reason?: string }) => communityService.unsuspendUser(id, reason),
    'Suspension lifted',
    'Failed to lift suspension'
  )
}

export function useBanUser() {
  return useCommunityMutation(
    ({ id, reason, stepUpToken }: { id: string; reason: string; stepUpToken: string }) =>
      communityService.banUser(id, reason, stepUpToken),
    'User banned',
    'Failed to ban user'
  )
}

export function useUnbanUser() {
  return useCommunityMutation(
    ({ id, reason }: { id: string; reason?: string }) => communityService.unbanUser(id, reason),
    'Ban lifted',
    'Failed to lift ban'
  )
}

export function useAssignTrainer() {
  return useCommunityMutation(
    (id: string) => communityService.assignTrainer(id),
    'Trainer role assigned',
    'Failed to assign trainer role'
  )
}

export function useRevokeTrainer() {
  return useCommunityMutation(
    (id: string) => communityService.revokeTrainer(id),
    'Trainer role revoked',
    'Failed to revoke trainer role'
  )
}
