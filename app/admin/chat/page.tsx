'use client'

import { Suspense, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { IconEdit, IconMessages, IconSearch } from '@tabler/icons-react'
import { ChatAvatar, ChatThread } from '@/components/chat/chat-thread'
import { NewChatDialog } from '@/components/chat/new-chat-dialog'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useChatConversations, useOpenConversation } from '@/hooks/use-chat'
import { type ChatConversation, chatRoleLabel } from '@/lib/services/chat.service'
import { cn } from '@/lib/utils'

const stamp = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

function ChatPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const activeId = params.get('c')

  const { data, isLoading } = useChatConversations()
  const open = useOpenConversation()
  const [filter, setFilter] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const conversations = data?.conversations ?? []
  const active = conversations.find((c) => c.id === activeId) ?? null

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? conversations.filter((c) => c.peer.name.toLowerCase().includes(q)) : conversations
  }, [conversations, filter])

  const select = (id: string | null) => {
    router.replace(id ? `${pathname}?c=${id}` : pathname, { scroll: false })
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-0 sm:h-[calc(100dvh-3.5rem)]">
      {/* Inbox */}
      <aside
        className={cn(
          'flex w-full min-w-0 flex-col border-r md:w-80 lg:w-96',
          active && 'hidden md:flex',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
          <h2 className="text-xl font-bold tracking-tight">Messages</h2>
          <Button size="sm" onClick={() => setPickerOpen(true)}>
            <IconEdit className="size-4" />
            New
          </Button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search conversations"
              className="pl-9"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 px-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<IconMessages className="size-10" />}
              title={filter ? 'No matches' : 'No conversations yet'}
              description={filter ? undefined : 'Start one with the New button.'}
            />
          ) : (
            visible.map((c) => (
              <ConversationRow key={c.id} conversation={c} active={c.id === activeId} onClick={() => select(c.id)} />
            ))
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className={cn('min-w-0 flex-1', !active && 'hidden md:block')}>
        {active ? (
          <ChatThread key={active.id} conversation={active} me={data?.me} onBack={() => select(null)} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<IconMessages className="size-12" />}
              title="Select a conversation"
              description="Pick a conversation on the left, or start a new one."
            />
          </div>
        )}
      </section>

      <NewChatDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(peer) =>
          open.mutate(
            { kind: peer.kind, id: peer.id },
            {
              onSuccess: ({ conversation }) => {
                setPickerOpen(false)
                select(conversation.id)
              },
            },
          )
        }
      />
    </div>
  )
}

function ConversationRow({
  conversation: c,
  active,
  onClick,
}: {
  conversation: ChatConversation
  active: boolean
  onClick: () => void
}) {
  const unread = c.unreadCount > 0
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60',
        active && 'bg-muted',
      )}
    >
      <ChatAvatar name={c.peer.name} avatarUrl={c.peer.avatarUrl} className="size-10" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-sm', unread ? 'font-semibold' : 'font-medium')}>{c.peer.name}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{stamp(c.lastMessage?.at)}</span>
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className={cn('truncate text-xs', unread ? 'text-foreground' : 'text-muted-foreground')}>
            {c.lastMessage
              ? `${c.lastMessage.mine ? 'You: ' : ''}${c.lastMessage.body}`
              : chatRoleLabel(c.peer.role)}
          </span>
          {unread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {c.unreadCount > 99 ? '99+' : c.unreadCount}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  )
}
