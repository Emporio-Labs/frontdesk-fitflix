'use client'

import { useEffect } from 'react'
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { API_BASE_URL, getStoredToken } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import {
  type ChatAccessPatch,
  type ChatConversation,
  type ChatMe,
  type ChatMessage,
  type ChatParticipantKind,
  type ChatPersonAccess,
  type ChatReaction,
  type ChatReportReason,
  type ChatRole,
  type ChatRuleMode,
  type ChatSettings,
  chatService,
} from '@/lib/services/chat.service'

type MessagesPage = { messages: ChatMessage[]; hasMore: boolean }
type MessagesData = InfiniteData<MessagesPage, string | undefined>
type ConversationsData = { conversations: ChatConversation[]; unreadCount: number; me: ChatMe }

const errorMessage = (err: any, fallback: string): string =>
  err?.response?.data?.message || err?.response?.data?.error || fallback

// ── Cache helpers ────────────────────────────────────────────────────────────

/** Insert a message, or swap it in for the optimistic bubble it confirms. */
function upsertMessage(qc: QueryClient, message: ChatMessage) {
  qc.setQueryData<MessagesData>(queryKeys.chat.messages(message.conversationId), (data) => {
    if (!data) return data
    const matches = (m: ChatMessage) =>
      m.id === message.id ||
      (!!message.clientMessageId && m.clientMessageId === message.clientMessageId)
    if (data.pages.some((p) => p.messages.some(matches))) {
      return {
        ...data,
        pages: data.pages.map((p) => ({
          ...p,
          messages: p.messages.map((m) => (matches(m) ? message : m)),
        })),
      }
    }
    // pages[0] is the newest page.
    const [first, ...rest] = data.pages
    return { ...data, pages: [{ ...first, messages: [...first.messages, message] }, ...rest] }
  })
}

function markDeleted(qc: QueryClient, conversationId: string, messageId: string) {
  qc.setQueryData<MessagesData>(queryKeys.chat.messages(conversationId), (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            messages: p.messages.map((m) => (m.id === messageId ? { ...m, body: '', deleted: true } : m)),
          })),
        }
      : data,
  )
}

/** Drop an optimistic bubble that never reached the server. */
export function discardLocalMessage(qc: QueryClient, conversationId: string, clientMessageId: string) {
  qc.setQueryData<MessagesData>(queryKeys.chat.messages(conversationId), (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((p) => ({ ...p, messages: p.messages.filter((m) => m.id !== clientMessageId) })),
        }
      : data,
  )
}

// ── Realtime ─────────────────────────────────────────────────────────────────

let socket: Socket | null = null
let socketUsers = 0

/**
 * Keeps chat caches live. Mounted once by the sidebar, which is on every staff
 * page, so the unread badge and any open thread update without polling.
 */
export function useChatRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    const token = getStoredToken()
    if (!token) return

    socketUsers += 1
    if (!socket) {
      socket = io(API_BASE_URL.replace(/\/api\/v1$/, '').replace(/\/api$/, ''), {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling'],
      })
    }
    const s = socket

    const onMessage = (payload: { conversationId: string; message: ChatMessage }) => {
      if (!payload?.message) return
      upsertMessage(qc, payload.message)
      qc.invalidateQueries({ queryKey: queryKeys.chat.conversations() })
      qc.invalidateQueries({ queryKey: queryKeys.chat.unread() })
    }
    const onDeleted = (payload: { conversationId: string; messageId: string }) => {
      if (!payload?.messageId) return
      markDeleted(qc, payload.conversationId, payload.messageId)
      qc.invalidateQueries({ queryKey: queryKeys.chat.conversations() })
    }
    const onReaction = (payload: { conversationId: string; messageId: string; reactions: ChatReaction[] }) => {
      if (!payload?.messageId) return
      qc.setQueryData<MessagesData>(queryKeys.chat.messages(payload.conversationId), (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((p) => ({
                ...p,
                messages: p.messages.map((m) =>
                  m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m,
                ),
              })),
            }
          : data,
      )
    }
    const onRead = () => {
      qc.invalidateQueries({ queryKey: queryKeys.chat.conversations() })
      qc.invalidateQueries({ queryKey: queryKeys.chat.unread() })
    }
    // Anything sent while the socket was down is picked up on reconnect.
    const onConnect = () => qc.invalidateQueries({ queryKey: queryKeys.chat.all() })

    // Tell the server whether anyone is actually looking, so a dashboard left
    // open in a background tab still gets the push notification.
    const reportFocus = () => s.emit('chat:focus', document.visibilityState === 'visible')
    const onSocketConnect = () => reportFocus()

    s.on('chat:message', onMessage)
    s.on('chat:message_deleted', onDeleted)
    s.on('chat:reaction', onReaction)
    s.on('chat:read', onRead)
    s.on('connect', onSocketConnect)
    s.io.on('reconnect', onConnect)
    document.addEventListener('visibilitychange', reportFocus)
    if (s.connected) reportFocus()

    return () => {
      s.off('chat:message', onMessage)
      s.off('chat:message_deleted', onDeleted)
      s.off('chat:reaction', onReaction)
      s.off('chat:read', onRead)
      s.off('connect', onSocketConnect)
      s.io.off('reconnect', onConnect)
      document.removeEventListener('visibilitychange', reportFocus)
      socketUsers -= 1
      if (socketUsers === 0) {
        s.disconnect()
        socket = null
      }
    }
  }, [qc])
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useChatConversations() {
  return useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: chatService.getConversations,
  })
}

export function useChatUnreadCount() {
  return useQuery({
    queryKey: queryKeys.chat.unread(),
    queryFn: chatService.getUnreadCount,
    select: (d) => d.unreadCount,
    // Safety net for a dropped socket.
    refetchInterval: 60_000,
  })
}

export function useChatContacts(search: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.contacts(search),
    queryFn: () => chatService.getContacts(search || undefined),
    select: (d) => d.contacts,
    enabled,
  })
}

export function useChatMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: queryKeys.chat.messages(conversationId ?? ''),
    queryFn: ({ pageParam }) => chatService.getMessages(conversationId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.messages[0]?.id : undefined),
    enabled: !!conversationId,
    // Oldest first, across pages (pages[0] is the newest page).
    select: (data) => ({
      messages: [...data.pages].reverse().flatMap((p) => p.messages),
    }),
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useOpenConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (peer: { kind: ChatParticipantKind; id: string }) =>
      chatService.openConversation(peer),
    onSuccess: ({ conversation }) => {
      // A brand-new thread has no messages, so the inbox query does not return
      // it yet — put it in the cache so the page can show it straight away.
      qc.setQueryData<ConversationsData>(queryKeys.chat.conversations(), (data) =>
        data && !data.conversations.some((c) => c.id === conversation.id)
          ? { ...data, conversations: [conversation, ...data.conversations] }
          : data,
      )
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not open this chat')),
  })
}

export function useSendChatMessage(conversationId: string | null, me: ChatMe | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      body,
      clientMessageId,
      kind,
      media,
      payload,
    }: {
      body: string
      clientMessageId: string
      kind?: string
      media?: any
      payload?: Record<string, any>
    }) =>
      chatService.sendMessage(conversationId!, body, clientMessageId, { kind, media, payload }),
    onMutate: ({ body, clientMessageId, kind, media, payload }) => {
      if (!conversationId || !me) return
      upsertMessage(qc, {
        id: clientMessageId,
        conversationId,
        senderKind: me.kind,
        senderId: me.id,
        senderRole: me.role,
        senderName: '',
        body,
        clientMessageId,
        createdAt: new Date().toISOString(),
        pending: true,
        kind: (kind as any) ?? 'text',
        media,
        payload,
      })
    },
    onSuccess: ({ message }) => {
      upsertMessage(qc, message)
      qc.invalidateQueries({ queryKey: queryKeys.chat.conversations() })
    },
    onError: (err, { body, clientMessageId, kind, media, payload }) => {
      if (conversationId && me) {
        upsertMessage(qc, {
          id: clientMessageId,
          conversationId,
          senderKind: me.kind,
          senderId: me.id,
          senderRole: me.role,
          senderName: '',
          body,
          clientMessageId,
          createdAt: new Date().toISOString(),
          failed: true,
          kind: (kind as any) ?? 'text',
          media,
          payload,
        })
      }
      toast.error(errorMessage(err, 'Message not sent'))
      // The rules may have changed under us — refresh canSend.
      qc.invalidateQueries({ queryKey: queryKeys.chat.conversations() })
    },
  })
}

export function useMarkChatRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) => chatService.markRead(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chat.conversations() })
      qc.invalidateQueries({ queryKey: queryKeys.chat.unread() })
    },
  })
}

// ── Admin ────────────────────────────────────────────────────────────────────

export function useChatPolicy() {
  return useQuery({ queryKey: queryKeys.chat.policy(), queryFn: chatService.getPolicy })
}

export function useUpdateChatPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rules: Array<{ from: ChatRole; to: ChatRole; mode: ChatRuleMode }>) =>
      chatService.updatePolicy(rules),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.chat.policy(), data)
      toast.success(data.message)
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not update chat rules')),
  })
}

export function useResetChatPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: chatService.resetPolicy,
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.chat.policy(), data)
      toast.success(data.message)
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not reset chat rules')),
  })
}

export function useChatPeopleAccess(role?: 'client', search?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.people(role, search),
    queryFn: () => chatService.getPeopleAccess({ role, search: search || undefined }),
    select: (d) => d.people,
    enabled,
  })
}

export function useUpdateChatAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ person, patch }: { person: ChatPersonAccess; patch: ChatAccessPatch }) =>
      chatService.updateAccess(person.kind, person.id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', 'people'] }),
    onError: (err) => toast.error(errorMessage(err, 'Could not update chat access')),
  })
}

// ── Delete, block, report ────────────────────────────────────────────────────

export function useDeleteChatMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) => chatService.deleteMessage(messageId),
    onSuccess: ({ conversationId, messageId }) => {
      markDeleted(qc, conversationId, messageId)
      qc.invalidateQueries({ queryKey: queryKeys.chat.conversations() })
      qc.invalidateQueries({ queryKey: queryKeys.chat.adminConversation(conversationId) })
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not delete the message')),
  })
}

export function useToggleChatReaction(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, reaction }: { messageId: string; reaction: string }) =>
      chatService.toggleReaction(conversationId, messageId, reaction),
    onSuccess: (result, variables) => {
      qc.setQueryData<MessagesData>(queryKeys.chat.messages(conversationId), (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((p) => ({
                ...p,
                messages: p.messages.map((m) =>
                  m.id === variables.messageId ? { ...m, reactions: result.reactions } : m,
                ),
              })),
            }
          : data,
      )
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not update reaction')),
  })
}

export function useBlockChatPeer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ peer, block }: { peer: { kind: ChatParticipantKind; id: string }; block: boolean }) =>
      block ? chatService.block(peer) : chatService.unblock(peer),
    onSuccess: (data) => {
      toast.success(data.message)
      qc.invalidateQueries({ queryKey: queryKeys.chat.conversations() })
      qc.invalidateQueries({ queryKey: ['chat', 'contacts'] })
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not update the block')),
  })
}

export function useReportChat(conversationId: string) {
  return useMutation({
    mutationFn: (payload: { reason: ChatReportReason; note?: string; messageId?: string }) =>
      chatService.report(conversationId, payload),
    onSuccess: (data) => toast.success(data.message),
    onError: (err) => toast.error(errorMessage(err, 'Could not send the report')),
  })
}

// ── Admin: settings and moderation ───────────────────────────────────────────

export function useUpdateChatSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: ChatSettings) => chatService.updateSettings(settings),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.chat.policy() })
      toast.success(data.message)
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not update chat settings')),
  })
}

export function useChatReports(status?: 'open' | 'resolved') {
  return useQuery({
    queryKey: queryKeys.chat.reports(status),
    queryFn: () => chatService.getReports(status),
  })
}

export function useResolveChatReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; status: 'open' | 'resolved'; resolutionNote?: string }) =>
      chatService.resolveReport(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['chat', 'reports'] })
      toast.success(data.message)
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not update the report')),
  })
}

export function useAllChatConversations(search: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.adminConversations(search),
    queryFn: () => chatService.getAllConversations(search || undefined),
    select: (d) => d.conversations,
    enabled,
  })
}

export function useAnyChatConversation(id: string | null) {
  return useQuery({
    queryKey: queryKeys.chat.adminConversation(id ?? ''),
    queryFn: () => chatService.getAnyConversation(id!),
    enabled: !!id,
  })
}
