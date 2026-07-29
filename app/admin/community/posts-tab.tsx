'use client'

import Link from 'next/link'
import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  IconEye, IconPin, IconPinnedOff, IconTrash, IconRestore, IconRefresh, IconSpeakerphone,
  IconPaperclip, IconX, IconUpload, IconFile, IconFileTypePdf, IconVideo,
  IconPhoto, IconLoader2, IconMicrophone,
} from '@tabler/icons-react'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTable } from '@/components/skeleton-loader'
import {
  useAdminPosts, usePinPost, useUnpinPost, useDeletePost, useRestorePost, useCreateOfficial, useUploadFiles, useUploadVideo,
} from '@/hooks/use-community'
import { AdminPost, UploadedAttachment, UploadedImage, UploadedVideo } from '@/lib/services/community.service'
import { toast } from 'sonner'
import { ModerationDialog } from './moderation-dialog'
import { RoleBadge, VisibilityBadge, formatDateTime, truncate } from './shared'

const ANY = 'any'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <IconPhoto className="w-4 h-4 text-blue-400" />
  if (mimeType === 'application/pdf') return <IconFileTypePdf className="w-4 h-4 text-red-400" />
  if (mimeType.startsWith('video/')) return <IconVideo className="w-4 h-4 text-purple-400" />
  if (mimeType.startsWith('audio/')) return <IconMicrophone className="w-4 h-4 text-emerald-400" />
  return <IconFile className="w-4 h-4 text-muted-foreground" />
}

const ACCEPTED_MIME = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/x-m4a',
].join(',')

// ── AttachmentPreview ──────────────────────────────────────────────────────────

function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: UploadedAttachment
  onRemove: () => void
}) {
  const isImage = attachment.type === 'image'
  const isVideo = attachment.type === 'video'
  const isAudio = attachment.mimeType?.startsWith('audio/')
  const imageAtt = isImage ? (attachment as UploadedImage) : null

  return (
    <div className="relative group flex-shrink-0">
      {isImage && imageAtt ? (
        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted">
          <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <IconPhoto className="w-6 h-6 text-blue-400" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-white px-1 py-0.5 truncate">
            {attachment.originalName}
          </div>
        </div>
      ) : isVideo ? (
        <div className="flex items-center gap-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2.5 max-w-[220px]">
          <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <IconVideo className="w-4 h-4 text-purple-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{attachment.originalName}</p>
            <p className="text-[10px] text-muted-foreground">{formatBytes(attachment.bytes)} · Video</p>
          </div>
        </div>
      ) : isAudio ? (
        <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2.5 max-w-[220px]">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <IconMicrophone className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{attachment.originalName}</p>
            <p className="text-[10px] text-muted-foreground">{formatBytes(attachment.bytes)} · Audio</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-3 py-2 max-w-[200px]">
          {getFileIcon(attachment.mimeType)}
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{attachment.originalName}</p>
            <p className="text-[10px] text-muted-foreground">{formatBytes(attachment.bytes)}</p>
          </div>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
        aria-label="Remove attachment"
      >
        <IconX className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── DropZone ──────────────────────────────────────────────────────────────────

function DropZone({
  onFiles,
  isUploading,
}: {
  onFiles: (files: File[]) => void
  isUploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) onFiles(files)
  }, [onFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onFiles(files)
    e.target.value = ''
  }, [onFiles])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer
        transition-all duration-200 p-4 min-h-[80px]
        ${isDragging
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border/60 hover:border-primary/50 hover:bg-muted/40 bg-muted/20'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME}
        multiple
        className="sr-only"
        onChange={handleChange}
        disabled={isUploading}
      />
      {isUploading ? (
        <>
          <IconLoader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Uploading…</p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <IconUpload className="w-5 h-5 text-muted-foreground" />
            <IconPhoto className="w-4 h-4 text-blue-400/70" />
            <IconFileTypePdf className="w-4 h-4 text-red-400/70" />
            <IconVideo className="w-4 h-4 text-purple-400/70" />
            <IconMicrophone className="w-4 h-4 text-emerald-400/70" />
          </div>
          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Click or drag &amp; drop</span> to attach files<br />
            Images, PDFs, DOCX, videos, audio — up to 50 MB each
          </p>
        </>
      )}
    </div>
  )
}

// ── PostsTab ──────────────────────────────────────────────────────────────────

export function PostsTab() {
  const [role, setRole] = useState(ANY)
  const [visibility, setVisibility] = useState(ANY)
  const [state, setState] = useState('live') // live | deleted | reported

  const filters: Record<string, string> = {}
  if (role !== ANY) filters.role = role
  if (visibility !== ANY) filters.visibility = visibility
  if (state === 'deleted') filters.deleted = 'true'
  if (state === 'live') filters.deleted = 'false'
  if (state === 'reported') filters.reported = 'true'

  const { data: posts = [], isLoading, isError, refetch } = useAdminPosts(filters)

  const pin = usePinPost()
  const unpin = useUnpinPost()
  const deletePost = useDeletePost()
  const restorePost = useRestorePost()
  const createOfficial = useCreateOfficial()
  const uploadFiles = useUploadFiles()
  const uploadVideo = useUploadVideo()

  const [deleting, setDeleting] = useState<AdminPost | null>(null)
  const [restoring, setRestoring] = useState<AdminPost | null>(null)
  const [officialOpen, setOfficialOpen] = useState(false)
  const [officialBody, setOfficialBody] = useState('')
  const [officialVisibility, setOfficialVisibility] = useState('public')
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([])

  const isUploading = uploadFiles.isPending || uploadVideo.isPending

  const handleFiles = async (files: File[]) => {
    // Videos go straight to S3 via a presigned URL; everything else proxies
    // through /media/files. Only one video per post (matches audio's cap).
    const videoFiles = files.filter(f => f.type.startsWith('video/'))
    const otherFiles = files.filter(f => !f.type.startsWith('video/'))

    if (videoFiles.length > 0) {
      const alreadyHasVideo = attachments.some(a => a.type === 'video')
      if (alreadyHasVideo || videoFiles.length > 1) {
        toast.error('Only one video is allowed per post')
      }
      if (!alreadyHasVideo) {
        try {
          const uploaded = await uploadVideo.mutateAsync(videoFiles[0])
          setAttachments(prev => [...prev, uploaded])
        } catch {
          // error already toasted by hook
        }
      }
    }

    if (otherFiles.length > 0) {
      try {
        const uploaded = await uploadFiles.mutateAsync(otherFiles)
        setAttachments(prev => [...prev, ...uploaded])
      } catch {
        // error already toasted by hook
      }
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const resetOfficialDialog = () => {
    setOfficialBody('')
    setOfficialVisibility('public')
    setAttachments([])
  }

  const publishOfficial = async () => {
    if (!officialBody.trim() && attachments.length === 0) return

    // Split attachments into images, video and other files for the backend
    const images = attachments
      .filter(a => a.type === 'image')
      .map(a => ({ url: (a as UploadedImage).url, thumbnailUrl: (a as UploadedImage).thumbnailUrl }))
    const video = attachments.find(a => a.type === 'video') as UploadedVideo | undefined
    const fileAttachments = attachments
      .filter(a => a.type === 'file')
      .map(a => ({ url: a.url, originalName: a.originalName, mimeType: a.mimeType }))

    await createOfficial.mutateAsync({
      body: officialBody.trim(),
      visibility: officialVisibility,
      images: images.length > 0 ? images : undefined,
      video: video ? { s3Key: video.s3Key } : undefined,
      attachments: fileAttachments.length > 0 ? fileAttachments : undefined,
    })
    setOfficialOpen(false)
    resetOfficialDialog()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Author role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All authors</SelectItem>
            <SelectItem value="member">Members</SelectItem>
            <SelectItem value="trainer">Trainers</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>

        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Visibility" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All visibility</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="members_only">Members only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={state} onValueChange={setState}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 px-3 text-xs">
            <IconRefresh className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button
            size="sm"
            className="h-9 px-3 text-xs font-semibold"
            onClick={() => setOfficialOpen(true)}
          >
            <IconSpeakerphone className="w-4 h-4 mr-1.5" /> Official post
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/60">
          <CardTitle className="text-lg font-bold text-foreground">Posts</CardTitle>
          <CardDescription>{isLoading ? 'Loading…' : `${posts.length} posts`}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <div className="text-center py-8 text-destructive">
              Failed to load posts. Your admin session may have expired — sign in again.
            </div>
          ) : isLoading ? (
            <div className="p-6"><SkeletonTable /></div>
          ) : posts.length === 0 ? (
            <EmptyState title="No posts match these filters" description="Try widening the author, visibility or state filter." />
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader className="bg-muted/30 border-b border-border/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 font-semibold w-[160px]">Author</TableHead>
                    <TableHead className="font-semibold">Content</TableHead>
                    <TableHead className="font-semibold w-[120px]">Visibility</TableHead>
                    <TableHead className="font-semibold w-[130px]">Engagement</TableHead>
                    <TableHead className="font-semibold w-[170px]">Posted</TableHead>
                    <TableHead className="text-right pr-6 font-semibold w-[190px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id} className="hover:bg-muted/20 border-b border-border/40 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground truncate max-w-[150px]">
                            {post.author.name ?? 'Unknown'}
                          </span>
                          <RoleBadge role={post.author.role} />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[340px]">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-foreground">{truncate(post.content)}</span>
                          <div className="flex flex-wrap gap-1">
                            {post.pinned && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">Pinned</Badge>
                            )}
                            {post.isOfficial && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">Official</Badge>
                            )}
                            {post.edited && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full border-dashed">Edited</Badge>
                            )}
                            {post.deleted && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full border-destructive/40 text-destructive">Deleted</Badge>
                            )}
                            {(post.media?.length ?? 0) > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full border-dashed">
                                {post.media?.length} image{(post.media?.length ?? 0) > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><VisibilityBadge visibility={post.visibility} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {post.likeCount} likes · {post.commentCount} comments · {post.shareCount} shares
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDateTime(post.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-2">
                        <div className="flex justify-end items-center gap-1">
                          <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0" title="Open post">
                            <Link href={`/admin/community/posts/${post.id}`}><IconEye className="w-4 h-4" /></Link>
                          </Button>
                          {!post.deleted && (
                            post.pinned ? (
                              <Button
                                size="sm" variant="ghost" className="h-8 w-8 p-0" title="Unpin"
                                onClick={() => unpin.mutate(post.id)} disabled={unpin.isPending}
                              >
                                <IconPinnedOff className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm" variant="ghost" className="h-8 w-8 p-0" title="Pin (replaces the current pinned post)"
                                onClick={() => pin.mutate(post.id)} disabled={pin.isPending}
                              >
                                <IconPin className="w-4 h-4" />
                              </Button>
                            )
                          )}
                          {post.deleted ? (
                            <Button
                              size="sm" variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Restore" onClick={() => setRestoring(post)}
                            >
                              <IconRestore className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm" variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete" onClick={() => setDeleting(post)}
                            >
                              <IconTrash className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ModerationDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this post"
        description="The post is soft-deleted and hidden from the feed. It can be restored later. This is recorded in the audit log."
        confirmLabel="Delete post"
        requireReason
        requireStepUp
        destructive
        pending={deletePost.isPending}
        onConfirm={async ({ reason, stepUpToken }) => {
          if (!deleting) return
          await deletePost.mutateAsync({ id: deleting.id, reason, stepUpToken })
          setDeleting(null)
        }}
      />

      <ModerationDialog
        open={!!restoring}
        onOpenChange={(o) => !o && setRestoring(null)}
        title="Restore this post"
        description="The post returns to the feed with its original visibility."
        confirmLabel="Restore post"
        pending={restorePost.isPending}
        onConfirm={async ({ reason }) => {
          if (!restoring) return
          await restorePost.mutateAsync({ id: restoring.id, reason })
          setRestoring(null)
        }}
      />

      {/* ── Official Post Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={officialOpen}
        onOpenChange={(o) => {
          setOfficialOpen(o)
          if (!o) resetOfficialDialog()
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconSpeakerphone className="w-5 h-5 text-primary" />
              Publish an official post
            </DialogTitle>
            <DialogDescription>
              Posted as Fitflix and badged &ldquo;Official&rdquo; in the member feed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Message */}
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={officialBody}
                onChange={(e) => setOfficialBody(e.target.value)}
                rows={5}
                placeholder="Holiday hours, new equipment, class changes…"
                className="mt-1 resize-none"
              />
            </div>

            {/* Attachments drop zone */}
            <div>
              <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <IconPaperclip className="w-4 h-4" />
                Attachments
                {attachments.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({attachments.length} file{attachments.length !== 1 ? 's' : ''})
                  </span>
                )}
              </label>

              <DropZone onFiles={handleFiles} isUploading={isUploading} />

              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachments.map((att, i) => (
                    <AttachmentPreview
                      key={`${att.originalName}-${i}`}
                      attachment={att}
                      onRemove={() => removeAttachment(i)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Visibility */}
            <div>
              <label className="text-sm font-medium">Visibility</label>
              <Select value={officialVisibility} onValueChange={setOfficialVisibility}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — everyone</SelectItem>
                  <SelectItem value="members_only">Members only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setOfficialOpen(false)
                  resetOfficialDialog()
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={publishOfficial}
                disabled={
                  (!officialBody.trim() && attachments.length === 0) ||
                  createOfficial.isPending ||
                  isUploading
                }
              >
                {createOfficial.isPending ? 'Publishing…' : 'Publish'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
