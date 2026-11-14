'use client'

import { useEffect, useState } from 'react'
import { IconSearch, IconTrash } from '@tabler/icons-react'
import { dayOf, timeOf } from '@/components/chat/chat-thread'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAllChatConversations,
  useAnyChatConversation,
  useChatReports,
  useDeleteChatMessage,
  useResolveChatReport,
} from '@/hooks/use-chat'
import { CHAT_REPORT_REASON_LABELS, chatRoleLabel } from '@/lib/services/chat.service'
import { cn } from '@/lib/utils'

const when = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''

/** Reports members and staff have filed, newest first. */
export function ChatReportsPanel() {
  const [status, setStatus] = useState<'open' | 'resolved'>('open')
  const { data, isLoading } = useChatReports(status)
  const resolve = useResolveChatReport()
  const [viewing, setViewing] = useState<{ id: string; messageId: string | null } | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Conversations and messages people have flagged. The person reported is not told who reported them.
        </p>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant={status === 'open' ? 'default' : 'outline'} onClick={() => setStatus('open')}>
            Open{data ? ` (${data.openCount})` : ''}
          </Button>
          <Button size="sm" variant={status === 'resolved' ? 'default' : 'outline'} onClick={() => setStatus('resolved')}>
            Resolved
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.reports.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {status === 'open' ? 'Nothing waiting for review.' : 'No resolved reports yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {data.reports.map((r) => (
            <li key={r.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-medium">{r.reporter.name}</span>
                <span className="text-muted-foreground">reported</span>
                <span className="font-medium">{r.reported.name}</span>
                <Badge variant="secondary">{CHAT_REPORT_REASON_LABELS[r.reason] ?? r.reason}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{when(r.createdAt)}</span>
              </div>
              {r.messageBody && (
                <p className="mt-2 rounded bg-muted px-3 py-2 text-sm whitespace-pre-wrap break-words">
                  {r.messageBody}
                </p>
              )}
              {r.note && <p className="mt-2 text-sm text-muted-foreground">“{r.note}”</p>}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setViewing({ id: r.conversationId, messageId: r.messageId })}>
                  View conversation
                </Button>
                <Button
                  size="sm"
                  variant={r.status === 'open' ? 'default' : 'outline'}
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: r.id, status: r.status === 'open' ? 'resolved' : 'open' })}
                >
                  {r.status === 'open' ? 'Mark resolved' : 'Reopen'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConversationViewer
        conversationId={viewing?.id ?? null}
        highlightMessageId={viewing?.messageId ?? null}
        onClose={() => setViewing(null)}
      />
    </div>
  )
}

/** Any conversation in the club, read-only, for handling a complaint. */
export function ChatConversationsPanel() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [viewing, setViewing] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  const { data: conversations, isLoading } = useAllChatConversations(debounced)

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Read any conversation between members and staff. Use this to look into a complaint — it is read-only, apart
        from removing a message.
      </p>
      <div className="relative max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" className="pl-9" />
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !conversations || conversations.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No conversations found.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setViewing(c.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {c.participants.map((p) => `${p.name} (${chatRoleLabel(p.role)})`).join('  ↔  ')}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{c.lastMessage?.body}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{when(c.lastMessage?.at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConversationViewer conversationId={viewing} highlightMessageId={null} onClose={() => setViewing(null)} />
    </div>
  )
}

function ConversationViewer({
  conversationId,
  highlightMessageId,
  onClose,
}: {
  conversationId: string | null
  highlightMessageId: string | null
  onClose: () => void
}) {
  const { data, isLoading } = useAnyChatConversation(conversationId)
  const remove = useDeleteChatMessage()
  // Left-align the first participant, right-align the second, as in a chat.
  const leftId = data?.conversation.participants[0]?.id

  return (
    <Dialog open={!!conversationId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85dvh] max-w-2xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle>
            {data ? data.conversation.participants.map((p) => p.name).join(' and ') : 'Conversation'}
          </DialogTitle>
          <DialogDescription>
            {data
              ? data.conversation.participants.map((p) => chatRoleLabel(p.role)).join(' · ')
              : 'Loading conversation'}
            {data?.hasMore ? ' · showing the latest 100 messages' : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading || !data ? (
            <Skeleton className="h-40 w-full" />
          ) : data.messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No messages.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {data.messages.map((m, i) => {
                const left = m.senderId === leftId
                const newDay = i === 0 || dayOf(data.messages[i - 1].createdAt) !== dayOf(m.createdAt)
                return (
                  <div key={m.id}>
                    {newDay && (
                      <p className="my-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {dayOf(m.createdAt)}
                      </p>
                    )}
                    <div className={cn('group flex items-center gap-1', left ? 'flex-row' : 'flex-row-reverse')}>
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                          left ? 'bg-muted' : 'bg-primary/10',
                          m.deleted && 'bg-transparent text-muted-foreground ring-1 ring-border',
                          m.id === highlightMessageId && 'ring-2 ring-destructive',
                        )}
                      >
                        <p className="text-[11px] font-medium text-muted-foreground">{m.senderName}</p>
                        {m.deleted ? (
                          <p className="italic">Message deleted</p>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        )}
                        <p className="mt-0.5 text-right text-[10px] text-muted-foreground">{timeOf(m.createdAt)}</p>
                      </div>
                      {!m.deleted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 text-muted-foreground opacity-0 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(m.id)}
                          aria-label={`Delete message from ${m.senderName}`}
                        >
                          <IconTrash className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
