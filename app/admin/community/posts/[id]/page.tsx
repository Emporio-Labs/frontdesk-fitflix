'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  IconArrowLeft, IconEdit, IconPin, IconPinnedOff, IconRestore, IconTrash,
} from '@tabler/icons-react'
import { EmptyState } from '@/components/empty-state'
import {
  useAdminComments, useAdminPost, useDeleteComment, useDeletePost, useEditPost,
  usePinPost, usePostVersions, useRestorePost, useUnpinPost,
} from '@/hooks/use-community'
import { AdminComment } from '@/lib/services/community.service'
import { ModerationDialog } from '../../moderation-dialog'
import { RoleBadge, VisibilityBadge, formatDateTime } from '../../shared'

export default function CommunityPostDetailPage() {
  const params = useParams()
  const postId = String(params?.id ?? '')

  const { data: post, isLoading, isError } = useAdminPost(postId)
  const { data: comments = [], isLoading: commentsLoading } = useAdminComments(postId)

  const pin = usePinPost()
  const unpin = useUnpinPost()
  const editPost = useEditPost()
  const deletePost = useDeletePost()
  const restorePost = useRestorePost()
  const deleteComment = useDeleteComment()

  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editVisibility, setEditVisibility] = useState('public')
  const [editReason, setEditReason] = useState('')
  const [deletingPost, setDeletingPost] = useState(false)
  const [restoringPost, setRestoringPost] = useState(false)
  const [deletingComment, setDeletingComment] = useState<AdminComment | null>(null)

  const openEdit = () => {
    if (!post) return
    setEditTitle(post.title ?? '')
    setEditBody(post.content)
    setEditDescription(post.description ?? '')
    setEditVisibility(post.visibility)
    setEditReason('')
    setEditOpen(true)
  }

  const submitEdit = async () => {
    await editPost.mutateAsync({
      id: postId,
      title: editTitle,
      body: editBody,
      description: editDescription,
      visibility: editVisibility,
      reason: editReason.trim() || undefined,
    })
    setEditOpen(false)
  }

  // Replies are one level deep by design, so grouping by parentId is enough.
  const topLevel = comments.filter((c) => !c.parentId)
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id)

  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <Button asChild variant="ghost" size="sm" className="h-8 px-2 -ml-2 text-muted-foreground">
        <Link href="/admin/community"><IconArrowLeft className="w-4 h-4 mr-1.5" /> Back to community</Link>
      </Button>

      {isError ? (
        <Card><CardContent className="py-10 text-center text-destructive">Post not found.</CardContent></Card>
      ) : isLoading || !post ? (
        <Card><CardContent className="py-6 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </CardContent></Card>
      ) : (
        <>
          <Card className="border-border shadow-sm bg-card">
            <CardHeader className="border-b border-border/60">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex flex-col gap-1.5">
                  <CardTitle className="text-lg font-bold">{post.author.name ?? 'Unknown author'}</CardTitle>
                  <CardDescription>{formatDateTime(post.createdAt)}</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                  <RoleBadge role={post.author.role} />
                  <VisibilityBadge visibility={post.visibility} />
                  {post.pinned && <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-full">Pinned</Badge>}
                  {post.isOfficial && <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-full">Official</Badge>}
                  {post.edited && <Badge variant="outline" className="text-[10px] px-2 py-0 rounded-full border-dashed">Edited</Badge>}
                  {post.deleted && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0 rounded-full border-destructive/40 text-destructive">
                      Deleted
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {post.title && (
                <p className="text-base font-bold text-foreground">{post.title}</p>
              )}
              <p className="text-sm text-foreground whitespace-pre-wrap">{post.content || '—'}</p>
              {post.description && (
                <>
                  <hr className="border-border/60" />
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.description}</p>
                </>
              )}

              {(post.media?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-3">
                  {post.media?.map((m) => {
                    const kind = m.kind ?? 'image'

                    if (kind === 'video') {
                      return (
                        <video
                          key={m.id}
                          src={m.url}
                          controls
                          className="h-48 max-w-full rounded-lg border border-border/60 bg-black"
                          style={{ maxWidth: '100%' }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      )
                    }

                    if (kind === 'audio') {
                      return (
                        <div
                          key={m.id}
                          className="w-full flex items-center gap-3 bg-muted/40 border border-border/60 rounded-lg px-4 py-3"
                        >
                          <span className="text-xs text-muted-foreground font-medium shrink-0">🎵 Audio</span>
                          <audio controls className="flex-1 h-9" src={m.url}>
                            Your browser does not support the audio tag.
                          </audio>
                        </div>
                      )
                    }

                    // Default: image
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={m.id}
                        src={m.url}
                        alt="Post attachment"
                        className="h-40 w-40 object-cover rounded-lg border border-border/60"
                      />
                    )
                  })}
                </div>
              )}


              <div className="text-xs text-muted-foreground">
                {post.likeCount} likes · {post.commentCount} comments · {post.shareCount} shares
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                {!post.deleted && (
                  <>
                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={openEdit}>
                      <IconEdit className="w-4 h-4 mr-1.5" /> Edit
                    </Button>
                    {post.pinned ? (
                      <Button
                        size="sm" variant="outline" className="h-8 px-3 text-xs"
                        onClick={() => unpin.mutate(postId)} disabled={unpin.isPending}
                      >
                        <IconPinnedOff className="w-4 h-4 mr-1.5" /> Unpin
                      </Button>
                    ) : (
                      <Button
                        size="sm" variant="outline" className="h-8 px-3 text-xs"
                        onClick={() => pin.mutate(postId)} disabled={pin.isPending}
                        title="Only one post can be pinned — this replaces the current one."
                      >
                        <IconPin className="w-4 h-4 mr-1.5" /> Pin
                      </Button>
                    )}
                  </>
                )}
                {post.deleted ? (
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => setRestoringPost(true)}>
                    <IconRestore className="w-4 h-4 mr-1.5" /> Restore
                  </Button>
                ) : (
                  <Button
                    size="sm" variant="outline"
                    className="h-8 px-3 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletingPost(true)}
                  >
                    <IconTrash className="w-4 h-4 mr-1.5" /> Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="comments">
            <TabsList className="bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="comments" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Comments
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Edit history
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="mt-4">
              <Card className="border-border shadow-sm bg-card overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-border/60">
                  <CardTitle className="text-lg font-bold">Comments</CardTitle>
                  <CardDescription>
                    {commentsLoading ? 'Loading…' : `${comments.length} total, including deleted`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {commentsLoading ? (
                    <div className="p-6 space-y-3">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : comments.length === 0 ? (
                    <EmptyState title="No comments yet" />
                  ) : (
                    <div className="divide-y divide-border/50">
                      {topLevel.map((comment) => (
                        <div key={comment.id}>
                          <CommentRow comment={comment} onDelete={setDeletingComment} />
                          {repliesOf(comment.id).map((reply) => (
                            <CommentRow key={reply.id} comment={reply} onDelete={setDeletingComment} indented />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <HistoryViewer postId={postId} />
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
            <DialogDescription>
              The previous version is preserved in the post&rsquo;s history, attributed to you as the editor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-sm font-medium">Title <span className="text-muted-foreground">(optional)</span></label>
              <Textarea value={editTitle} onChange={(e) => setEditTitle(e.target.value)} rows={1} className="mt-1" maxLength={120} />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={6} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description <span className="text-muted-foreground">(optional, long-form)</span></label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} className="mt-1" maxLength={5000} />
            </div>
            <div>
              <label className="text-sm font-medium">Visibility</label>
              <Select value={editVisibility} onValueChange={setEditVisibility}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="members_only">Members only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">
                Reason <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={2}
                placeholder="Recorded in the moderation audit log."
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={submitEdit} disabled={editPost.isPending}>
                {editPost.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ModerationDialog
        open={deletingPost}
        onOpenChange={setDeletingPost}
        title="Delete this post"
        description="The post is soft-deleted and hidden from the feed. It can be restored later."
        confirmLabel="Delete post"
        requireReason
        requireStepUp
        destructive
        pending={deletePost.isPending}
        onConfirm={async ({ reason, stepUpToken }) => {
          await deletePost.mutateAsync({ id: postId, reason, stepUpToken })
          setDeletingPost(false)
        }}
      />

      <ModerationDialog
        open={restoringPost}
        onOpenChange={setRestoringPost}
        title="Restore this post"
        description="The post returns to the feed with its original visibility."
        confirmLabel="Restore post"
        pending={restorePost.isPending}
        onConfirm={async ({ reason }) => {
          await restorePost.mutateAsync({ id: postId, reason })
          setRestoringPost(false)
        }}
      />

      <ModerationDialog
        open={!!deletingComment}
        onOpenChange={(o) => !o && setDeletingComment(null)}
        title="Delete this comment"
        description="The comment is soft-deleted and hidden from members. Replies to it are unaffected."
        confirmLabel="Delete comment"
        requireReason
        requireStepUp
        destructive
        pending={deleteComment.isPending}
        onConfirm={async ({ reason, stepUpToken }) => {
          if (!deletingComment) return
          await deleteComment.mutateAsync({ id: deletingComment.id, reason, stepUpToken })
          setDeletingComment(null)
        }}
      />
    </div>
  )
}

function CommentRow({
  comment,
  onDelete,
  indented = false,
}: {
  comment: AdminComment
  onDelete: (comment: AdminComment) => void
  indented?: boolean
}) {
  return (
    <div className={`px-6 py-4 flex items-start gap-3 ${indented ? 'pl-14 bg-muted/10' : ''}`}>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{comment.author.name ?? 'Unknown'}</span>
          <RoleBadge role={comment.author.role} />
          <span className="text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</span>
          {comment.deleted && (
            <Badge variant="outline" className="text-[10px] px-2 py-0 rounded-full border-destructive/40 text-destructive">
              Deleted
            </Badge>
          )}
        </div>
        <p className={`text-sm whitespace-pre-wrap ${comment.deleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {comment.body}
        </p>
        <p className="text-xs text-muted-foreground">{comment.likeCount} likes</p>
      </div>
      {!comment.deleted && (
        <Button
          size="sm" variant="ghost"
          className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Delete comment"
          onClick={() => onDelete(comment)}
        >
          <IconTrash className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

/**
 * Read-only by contract. Post history is append-only in the database
 * (`APPEND_ONLY_VIOLATION` on any update or delete), and this viewer renders no
 * edit, delete, revert or hide affordance at all — not even a disabled one.
 */
function HistoryViewer({ postId }: { postId: string }) {
  const { data: versions = [], isLoading } = usePostVersions(postId)

  return (
    <Card className="border-border shadow-sm bg-card overflow-hidden">
      <CardHeader className="py-4 px-6 border-b border-border/60">
        <CardTitle className="text-lg font-bold">Edit history</CardTitle>
        <CardDescription>
          {isLoading ? 'Loading…' : `${versions.length} recorded version${versions.length === 1 ? '' : 's'} — permanent and read-only`}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : versions.length === 0 ? (
          <EmptyState title="Never edited" description="This post has not been changed since it was published." />
        ) : (
          <ol className="divide-y divide-border/50">
            {versions.map((version) => (
              <li key={version.id} className="px-6 py-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={version.version === 1 ? 'secondary' : 'outline'} className="text-[10px] px-2 py-0 rounded-full">
                    {version.version === 1 ? 'Original' : `Version ${version.version}`}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(version.editedAt)}</span>
                  <span className="text-xs text-muted-foreground">· edited by {version.editedBy}</span>
                </div>
                {version.titleSnapshot && (
                  <p className="text-xs font-semibold text-foreground">{version.titleSnapshot}</p>
                )}
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {version.contentSnapshot || '—'}
                </p>
                {version.descriptionSnapshot && (
                  <>
                    <hr className="border-border/40" />
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Description</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{version.descriptionSnapshot}</p>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
