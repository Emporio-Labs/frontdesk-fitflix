'use client'

import Link from 'next/link'
import { useState } from 'react'
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
} from '@tabler/icons-react'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTable } from '@/components/skeleton-loader'
import {
  useAdminPosts, usePinPost, useUnpinPost, useDeletePost, useRestorePost, useCreateOfficial,
} from '@/hooks/use-community'
import { AdminPost } from '@/lib/services/community.service'
import { ModerationDialog } from './moderation-dialog'
import { RoleBadge, VisibilityBadge, formatDateTime, truncate } from './shared'

const ANY = 'any'

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

  const [deleting, setDeleting] = useState<AdminPost | null>(null)
  const [restoring, setRestoring] = useState<AdminPost | null>(null)
  const [officialOpen, setOfficialOpen] = useState(false)
  const [officialBody, setOfficialBody] = useState('')
  const [officialVisibility, setOfficialVisibility] = useState('public')

  const publishOfficial = async () => {
    if (!officialBody.trim()) return
    await createOfficial.mutateAsync({ body: officialBody.trim(), visibility: officialVisibility })
    setOfficialOpen(false)
    setOfficialBody('')
    setOfficialVisibility('public')
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

      <Dialog open={officialOpen} onOpenChange={setOfficialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish an official post</DialogTitle>
            <DialogDescription>
              Posted as Fitflix and badged &ldquo;Official&rdquo; in the member feed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-sm font-medium">Message *</label>
              <Textarea
                value={officialBody}
                onChange={(e) => setOfficialBody(e.target.value)}
                rows={5}
                placeholder="Holiday hours, new equipment, class changes…"
                className="mt-1"
              />
            </div>
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
              <Button variant="outline" onClick={() => setOfficialOpen(false)}>Cancel</Button>
              <Button onClick={publishOfficial} disabled={!officialBody.trim() || createOfficial.isPending}>
                {createOfficial.isPending ? 'Publishing…' : 'Publish'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
