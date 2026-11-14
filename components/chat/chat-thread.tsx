'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  IconArrowLeft,
  IconBan,
  IconDotsVertical,
  IconFlag,
  IconLock,
  IconRefresh,
  IconSend2,
  IconTrash,
} from '@tabler/icons-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  showDay,
  grouped,
  onRetry,
  onDiscard,
  onDelete,
  onReport,
}: {
  message: ChatMessage
  mine: boolean
  showDay: boolean
  grouped: boolean
  onRetry?: () => void
  onDiscard?: () => void
  onDelete?: () => void
  onReport?: () => void
}) {
  const hasActions = !!(onDelete || onReport)
  return (
    <>
      {showDay && (
        <p className="my-3 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {dayOf(message.createdAt)}
        </p>
      )}
      <div
        className={cn(
          'group flex items-center gap-1',
          mine ? 'flex-row-reverse' : 'flex-row',
          !grouped && !showDay && 'mt-2',
        )}
      >
        <div
          className={cn(
            'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[65%]',
            mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
            message.deleted && 'bg-transparent text-muted-foreground ring-1 ring-border',
            message.pending && 'opacity-60',
            message.failed && 'bg-destructive/15 text-destructive',
          )}
        >
          {message.deleted ? (
            <p className="italic">Message deleted</p>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
          )}
          <p
            className={cn(
              'mt-0.5 text-right text-[10px]',
              mine && !message.failed && !message.deleted ? 'text-primary-foreground/70' : 'text-muted-foreground',
            )}
          >
            {message.failed ? 'Not sent' : message.pending ? 'Sending…' : timeOf(message.createdAt)}
          </p>
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
