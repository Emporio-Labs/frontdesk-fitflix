'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  IconActivity,
  IconArrowLeft,
  IconBan,
  IconBarbell,
  IconDotsVertical,
  IconFlag,
  IconFlame,
  IconLock,
  IconRefresh,
  IconScale,
  IconSend2,
  IconThumbUp,
  IconTrash,
  IconTrophy,
} from '@tabler/icons-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  discardLocalMessage,
  useBlockChatPeer,
  useChatMessages,
  useDeleteChatMessage,
  useMarkChatRead,
  useReportChat,
  useSendChatMessage,
  useToggleChatReaction,
} from '@/hooks/use-chat'
import { resolveAssetUrl } from '@/lib/asset-url'
import {
  CHAT_REPORT_REASON_LABELS,
  type ChatBlockedReason,
  type ChatConversation,
  type ChatMe,
  type ChatMessage,
  type ChatReportReason,
  chatRoleLabel,
} from '@/lib/services/chat.service'
import { cn } from '@/lib/utils'

const BLOCKED_COPY: Record<ChatBlockedReason, string> = {
  SELF: 'You cannot message yourself.',
  CHAT_DISABLED: 'Chat has been turned off for your account.',
  RECIPIENT_UNAVAILABLE: 'This person is not available on chat right now.',
  BLOCKED: 'This person is not available on chat right now.',
  BLOCKED_BY_YOU: 'You have blocked this person. Unblock them to send a message.',
  MEMBERSHIP_INACTIVE: 'Chat is available with an active membership.',
  NOT_ALLOWED: 'Messaging between you and this person is switched off. You can still read the history.',
  NOT_ASSIGNED: 'This member is no longer assigned to you. You can still read the history.',
}

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?'

export const timeOf = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export const dayOf = (iso: string): string => {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

export const REACTION_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  fire: { label: 'Fire', icon: IconFlame },
  muscle: { label: 'Strong', icon: IconBarbell },
  trophy: { label: 'Trophy', icon: IconTrophy },
  thumbs_up: { label: 'Thumbs Up', icon: IconThumbUp },
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0m'
  const m = Math.floor(seconds / 60)
  const h = Math.floor(m / 60)
  const remainingM = m % 60
  if (h > 0) return `${h}h ${remainingM}m`
  return `${m}m`
}

export function WorkoutActivityCard({
  payload,
  message,
  me,
  onToggleReaction,
}: {
  payload: any
  message: ChatMessage
  me?: ChatMe
  onToggleReaction?: (reaction: string) => void
}) {
  const workoutTitle = payload?.workoutTitle || 'Workout Session'
  const duration = formatDuration(payload?.durationSeconds)
  const exercises = payload?.exercisesCount ?? 0
  const sets = payload?.totalSets ?? 0
  const volume = payload?.totalVolumeKg ?? 0
  const rpe = payload?.rpe
  const reflection = payload?.reflection

  return (
    <div className="w-full min-w-[280px] max-w-sm rounded-2xl border bg-card p-3.5 text-card-foreground shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconActivity className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Workout Logged</p>
            <h4 className="truncate font-semibold text-xs text-foreground">{workoutTitle}</h4>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{timeOf(message.createdAt)}</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/50 p-2 text-center">
        <div>
          <p className="text-[9px] text-muted-foreground uppercase font-medium">Time</p>
          <p className="text-xs font-bold">{duration}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground uppercase font-medium">Exercises</p>
          <p className="text-xs font-bold">{exercises} ({sets}s)</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground uppercase font-medium">Volume</p>
          <p className="text-xs font-bold">{volume > 0 ? `${volume} kg` : '—'}</p>
        </div>
      </div>

      {rpe && (
        <div className="flex items-center justify-between rounded-lg bg-muted/30 px-2.5 py-1.5 text-xs">
          <span className="text-[11px] text-muted-foreground">Effort (RPE)</span>
          <Badge
            variant={rpe >= 8 ? 'destructive' : rpe >= 5 ? 'secondary' : 'outline'}
            className="text-[10px] h-5 px-1.5 font-semibold"
          >
            {rpe} / 10
          </Badge>
        </div>
      )}

      {reflection && (
        <div className="rounded-lg border-l-2 border-primary/60 bg-muted/40 px-2.5 py-1.5 text-xs italic text-muted-foreground">
          &ldquo;{reflection}&rdquo;
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-2">
        <span className="text-[10px] font-medium text-muted-foreground">React:</span>
        <div className="flex items-center gap-1">
          {Object.entries(REACTION_CONFIG).map(([key, config]) => {
            const Icon = config.icon
            const hasMyReaction = message.reactions?.some((r) => r.userId === me?.id && r.reaction === key)
            const count = message.reactions?.filter((r) => r.reaction === key).length ?? 0
            return (
              <Button
                key={key}
                type="button"
                variant={hasMyReaction ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'h-6 px-1.5 text-xs gap-1 rounded-full transition-transform active:scale-95',
                  hasMyReaction && 'bg-primary/15 text-primary border border-primary/30',
                )}
                onClick={() => onToggleReaction?.(key)}
                title={config.label}
              >
                <Icon className={cn('size-3.5', hasMyReaction ? 'text-primary' : 'text-muted-foreground')} />
                {count > 0 && <span className="text-[10px] font-semibold">{count}</span>}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function ChatAvatar({ name, avatarUrl, className }: { name: string; avatarUrl?: string; className?: string }) {
  return (
    <Avatar className={cn('size-9 shrink-0', className)}>
      {avatarUrl ? <AvatarImage src={resolveAssetUrl(avatarUrl)} alt="" /> : null}
      <AvatarFallback className="text-xs font-medium">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

interface ChatThreadProps {
  conversation: ChatConversation
  me: ChatMe | undefined
  onBack: () => void
}

export function ChatThread({ conversation, me, onBack }: ChatThreadProps) {
  const qc = useQueryClient()
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useChatMessages(conversation.id)
  const send = useSendChatMessage(conversation.id, me)
  const markRead = useMarkChatRead()
  const remove = useDeleteChatMessage()
  const toggleReaction = useToggleChatReaction(conversation.id)
  const block = useBlockChatPeer()
  const [draft, setDraft] = useState('')
  // null = closed; { messageId } = reporting one message; {} = the conversation
  const [reporting, setReporting] = useState<{ messageId?: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const messages = data?.messages ?? []
  const lastId = messages[messages.length - 1]?.id
  const peer = conversation.peer
  // Admins sit outside blocking and reporting: they can always reach everyone.
  const canModerate = me?.role !== 'admin' && peer.role !== 'admin'

  // Follow new messages unless the reader has scrolled up into the history.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [lastId, conversation.id])

  useEffect(() => {
    stickToBottom.current = true
    setDraft('')
  }, [conversation.id])

  // Opening the thread, or a message landing while it is open, reads it.
  const { mutate: markAsRead } = markRead
  useEffect(() => {
    if (conversation.unreadCount > 0 && document.visibilityState === 'visible') {
      markAsRead(conversation.id)
    }
  }, [conversation.id, conversation.unreadCount, lastId, markAsRead])

  const submit = () => {
    const body = draft.trim()
    if (!body || !conversation.canSend) return
    stickToBottom.current = true
    send.mutate({ body, clientMessageId: crypto.randomUUID() })
    setDraft('')
  }

  // "Seen" belongs under my message only while it is the last thing said.
  const last = messages[messages.length - 1]
  const lastMine = last && last.senderId === me?.id && !last.pending && !last.failed ? last : undefined
  const seen =
    !!lastMine &&
    !!conversation.peerLastReadAt &&
    new Date(conversation.peerLastReadAt) >= new Date(lastMine.createdAt)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b px-3 py-2.5 sm:px-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Back to conversations">
          <IconArrowLeft className="size-5" />
        </Button>
        <ChatAvatar name={peer.name} avatarUrl={peer.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{peer.name}</p>
          <p className="text-xs text-muted-foreground">{chatRoleLabel(peer.role)}</p>
        </div>
        {canModerate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Conversation options">
                <IconDotsVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setReporting({})}>
                <IconFlag className="size-4" />
                Report conversation
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => block.mutate({ peer, block: !conversation.blockedByMe })}
                className={conversation.blockedByMe ? undefined : 'text-destructive focus:text-destructive'}
              >
                <IconBan className="size-4" />
                {conversation.blockedByMe ? `Unblock ${peer.name.split(' ')[0]}` : `Block ${peer.name.split(' ')[0]}`}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4"
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
      >
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-48 rounded-2xl" />
            <Skeleton className="ml-auto h-9 w-56 rounded-2xl" />
            <Skeleton className="h-9 w-40 rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hello to {peer.name.split(' ')[0]}.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                className="mx-auto mb-2"
                disabled={isFetchingNextPage}
                onClick={() => {
                  stickToBottom.current = false
                  fetchNextPage()
                }}
              >
                {isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
              </Button>
            )}
            {messages.map((m, i) => {
              const mine = m.senderId === me?.id
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  mine={mine}
                  me={me}
                  showDay={i === 0 || dayOf(messages[i - 1].createdAt) !== dayOf(m.createdAt)}
                  grouped={i > 0 && messages[i - 1].senderId === m.senderId}
                  onRetry={
                    m.failed && m.clientMessageId
                      ? () => send.mutate({ body: m.body, clientMessageId: m.clientMessageId! })
                      : undefined
                  }
                  onDiscard={m.failed ? () => discardLocalMessage(qc, conversation.id, m.id) : undefined}
                  onDelete={mine && !m.pending && !m.failed && !m.deleted ? () => remove.mutate(m.id) : undefined}
                  onReport={!mine && canModerate && !m.deleted ? () => setReporting({ messageId: m.id }) : undefined}
                  onToggleReaction={(rx) => toggleReaction.mutate({ messageId: m.id, reaction: rx })}
                />
              )
            })}
            {seen && <p className="pr-1 text-right text-[11px] text-muted-foreground">Seen</p>}
          </div>
        )}
      </div>

      {conversation.canSend ? (
        <form
          className="flex items-end gap-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={`Message ${peer.name.split(' ')[0]}`}
            rows={1}
            maxLength={4000}
            className="max-h-36 min-h-10 resize-none"
          />
          <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send message">
            <IconSend2 className="size-5" />
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2 border-t bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <IconLock className="size-4 shrink-0" />
          <span className="flex-1">{BLOCKED_COPY[conversation.blockedReason ?? 'NOT_ALLOWED']}</span>
          {conversation.blockedByMe && (
            <Button size="sm" variant="outline" onClick={() => block.mutate({ peer, block: false })}>
              Unblock
            </Button>
          )}
        </div>
      )}

      <ReportDialog
        conversationId={conversation.id}
        target={reporting}
        peerName={peer.name}
        onClose={() => setReporting(null)}
      />
    </div>
  )
}

export function MessageBubble({
  message,
  mine,
  me,
  showDay,
  grouped,
  onRetry,
  onDiscard,
  onDelete,
  onReport,
  onToggleReaction,
}: {
  message: ChatMessage
  mine: boolean
  me?: ChatMe
  showDay: boolean
  grouped: boolean
  onRetry?: () => void
  onDiscard?: () => void
  onDelete?: () => void
  onReport?: () => void
  onToggleReaction?: (reaction: string) => void
}) {
  const hasActions = !!(onDelete || onReport)
  const isActivityCard = message.kind === 'activity_card' && message.payload?.type === 'WORKOUT_COMPLETED'

  return (
    <>
      {showDay && (
        <p className="my-3 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {dayOf(message.createdAt)}
        </p>
      )}
      <div
        className={cn(
          'group flex items-start gap-1',
          mine ? 'flex-row-reverse' : 'flex-row',
          !grouped && !showDay && 'mt-2',
        )}
      >
        <div className="flex flex-col max-w-[85%] sm:max-w-[70%]">
          {message.deleted ? (
            <div className="rounded-2xl px-3.5 py-2 text-sm bg-transparent text-muted-foreground ring-1 ring-border">
              <p className="italic">Message deleted</p>
            </div>
          ) : isActivityCard ? (
            <WorkoutActivityCard
              payload={message.payload}
              message={message}
              me={me}
              onToggleReaction={onToggleReaction}
            />
          ) : (
            <div
              className={cn(
                'rounded-2xl px-3.5 py-2 text-sm',
                mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
                message.pending && 'opacity-60',
                message.failed && 'bg-destructive/15 text-destructive',
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <p
                className={cn(
                  'mt-0.5 text-right text-[10px]',
                  mine && !message.failed ? 'text-primary-foreground/70' : 'text-muted-foreground',
                )}
              >
                {message.failed ? 'Not sent' : message.pending ? 'Sending…' : timeOf(message.createdAt)}
              </p>
            </div>
          )}

          {/* Reaction chips for text messages */}
          {!isActivityCard && !message.deleted && message.reactions && message.reactions.length > 0 && (
            <div className={cn('flex flex-wrap gap-1 mt-1', mine ? 'justify-end' : 'justify-start')}>
              {Object.entries(
                message.reactions.reduce<Record<string, { count: number; hasMine: boolean }>>((acc, r) => {
                  if (!acc[r.reaction]) acc[r.reaction] = { count: 0, hasMine: false }
                  acc[r.reaction].count += 1
                  if (r.userId === me?.id) acc[r.reaction].hasMine = true
                  return acc
                }, {}),
              ).map(([rx, info]) => {
                const config = REACTION_CONFIG[rx]
                const Icon = config?.icon ?? IconFlame
                return (
                  <button
                    key={rx}
                    type="button"
                    onClick={() => onToggleReaction?.(rx)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium border transition-colors',
                      info.hasMine
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-background border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="size-3" />
                    <span>{info.count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {message.failed && (
          <div className="flex shrink-0 items-center">
            {onRetry && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onRetry}>
                <IconRefresh className="size-3.5" />
                Retry
              </Button>
            )}
            {onDiscard && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={onDiscard}
                aria-label="Discard unsent message"
              >
                <IconTrash className="size-3.5" />
              </Button>
            )}
          </div>
        )}

        {hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                aria-label="Message options"
              >
                <IconDotsVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={mine ? 'end' : 'start'}>
              {onDelete && (
                <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
                  <IconTrash className="size-4" />
                  Delete message
                </DropdownMenuItem>
              )}
              {onReport && (
                <DropdownMenuItem onSelect={onReport}>
                  <IconFlag className="size-4" />
                  Report message
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </>
  )
}

function ReportDialog({
  conversationId,
  target,
  peerName,
  onClose,
}: {
  conversationId: string
  target: { messageId?: string } | null
  peerName: string
  onClose: () => void
}) {
  const report = useReportChat(conversationId)
  const [reason, setReason] = useState<ChatReportReason>('harassment')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (target) {
      setReason('harassment')
      setNote('')
    }
  }, [target])

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{target?.messageId ? 'Report this message' : `Report ${peerName}`}</DialogTitle>
          <DialogDescription>
            An admin will review it. {peerName.split(' ')[0]} is not told who reported them.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={(v) => setReason(v as ChatReportReason)} className="gap-3">
          {(Object.keys(CHAT_REPORT_REASON_LABELS) as ChatReportReason[]).map((r) => (
            <div key={r} className="flex items-center gap-2">
              <RadioGroupItem value={r} id={`report-${r}`} />
              <Label htmlFor={`report-${r}`} className="font-normal">
                {CHAT_REPORT_REASON_LABELS[r]}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything the admin should know (optional)"
          maxLength={1000}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={report.isPending}
            onClick={() =>
              report.mutate(
                { reason, note: note.trim() || undefined, messageId: target?.messageId },
                { onSuccess: onClose },
              )
            }
          >
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
