import { apiClient } from '@/lib/api-client'

export type ChatParticipantKind = 'User' | 'Trainer' | 'Admin'

export type ChatRole =
  | 'client'
  | 'trainer'
  | 'nutritionist'
  | 'sports_scientist'
  | 'doctor'
  | 'frontdesk'
  | 'admin'

export const CHAT_ROLE_LABELS: Record<ChatRole, string> = {
  client: 'Member',
  trainer: 'Trainer',
  nutritionist: 'Nutritionist',
  sports_scientist: 'Sports scientist',
  doctor: 'Doctor',
  frontdesk: 'Front desk',
  admin: 'Admin',
}

export const chatRoleLabel = (role: string): string =>
  CHAT_ROLE_LABELS[role as ChatRole] ?? role

export interface ChatPeer {
  kind: ChatParticipantKind
  id: string
  role: string
  name: string
  avatarUrl: string
}

export interface ChatReaction {
  userId: string
  senderKind: ChatParticipantKind
  reaction: string
  reactedAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderKind: ChatParticipantKind
  senderId: string
  senderRole: string
  senderName: string
  body: string
  /** The text was removed by its sender or an admin. */
  deleted?: boolean
  clientMessageId: string | null
  createdAt: string
  /** Client-only: an optimistic bubble that has not been confirmed yet. */
  pending?: boolean
  failed?: boolean
  kind?: 'text' | 'activity_card'
  payload?: Record<string, any>
  reactions?: ChatReaction[]
}

export type ChatBlockedReason =
  | 'SELF'
  | 'CHAT_DISABLED'
  | 'RECIPIENT_UNAVAILABLE'
  | 'BLOCKED'
  | 'BLOCKED_BY_YOU'
  | 'MEMBERSHIP_INACTIVE'
  | 'NOT_ALLOWED'
  | 'NOT_ASSIGNED'

export interface ChatConversation {
  id: string
  type: string
  peer: ChatPeer
  lastMessage: { body: string; senderId: string | null; at: string | null; mine: boolean } | null
  unreadCount: number
  peerLastReadAt: string | null
  canSend: boolean
  blockedReason: ChatBlockedReason | null
  blockedByMe: boolean
  updatedAt: string
}

export interface ChatMe {
  kind: ChatParticipantKind
  id: string
  role: ChatRole
}

export type ChatRuleMode = 'none' | 'assigned' | 'all'

export interface ChatRule {
  from: ChatRole
  to: ChatRole
  mode: ChatRuleMode
  defaultMode: ChatRuleMode
  locked: boolean
  supportsAssigned: boolean
}

export interface ChatSettings {
  requireActiveMembership: boolean
}

export interface ChatPolicy {
  roles: ChatRole[]
  assignableRoles: ChatRole[]
  rules: ChatRule[]
  settings: ChatSettings
}

export type ChatReportReason = 'harassment' | 'inappropriate' | 'spam' | 'other'

export const CHAT_REPORT_REASON_LABELS: Record<ChatReportReason, string> = {
  harassment: 'Harassment or bullying',
  inappropriate: 'Inappropriate content',
  spam: 'Spam',
  other: 'Something else',
}

export interface ChatReport {
  id: string
  conversationId: string
  messageId: string | null
  messageBody: string
  reporter: { kind: string; id: string; name: string }
  reported: { kind: string; id: string; name: string }
  reason: ChatReportReason
  note: string
  status: 'open' | 'resolved'
  resolutionNote: string
  createdAt: string
  resolvedAt: string | null
}

export interface ChatAdminConversation {
  id: string
  participants: ChatPeer[]
  lastMessage: { body: string; at: string | null } | null
  updatedAt: string
}

export interface ChatPersonAccess extends ChatPeer {
  staffChat: boolean
  allClients: boolean
  chatDisabled: boolean
}

export type ChatAccessPatch = Partial<
  Pick<ChatPersonAccess, 'staffChat' | 'allClients' | 'chatDisabled'>
>

export const chatService = {
  getConversations: async () => {
    const { data } = await apiClient.get('/chat/conversations')
    return data as { conversations: ChatConversation[]; unreadCount: number; me: ChatMe }
  },
  getUnreadCount: async () => {
    const { data } = await apiClient.get('/chat/unread-count')
    return data as { unreadCount: number }
  },
  getContacts: async (search?: string) => {
    const { data } = await apiClient.get('/chat/contacts', {
      params: search ? { search } : undefined,
    })
    return data as { contacts: ChatPeer[] }
  },
  openConversation: async (peer: { kind: ChatParticipantKind; id: string }) => {
    const { data } = await apiClient.post('/chat/conversations', peer)
    return data as { conversation: ChatConversation }
  },
  getMessages: async (conversationId: string, before?: string) => {
    const { data } = await apiClient.get(`/chat/conversations/${conversationId}/messages`, {
      params: { limit: 40, ...(before ? { before } : {}) },
    })
    return data as { messages: ChatMessage[]; hasMore: boolean }
  },
  sendMessage: async (conversationId: string, body: string, clientMessageId: string) => {
    const { data } = await apiClient.post(`/chat/conversations/${conversationId}/messages`, {
      body,
      clientMessageId,
    })
    return data as { message: ChatMessage }
  },
  markRead: async (conversationId: string) => {
    const { data } = await apiClient.post(`/chat/conversations/${conversationId}/read`)
    return data as { readAt: string }
  },
  deleteMessage: async (messageId: string) => {
    const { data } = await apiClient.delete(`/chat/messages/${messageId}`)
    return data as { conversationId: string; messageId: string }
  },
  toggleReaction: async (conversationId: string, messageId: string, reaction: string) => {
    const { data } = await apiClient.post(
      `/chat/conversations/${conversationId}/messages/${messageId}/reactions`,
      { reaction }
    )
    return data as { reactions: ChatReaction[] }
  },
  deleteReaction: async (conversationId: string, messageId: string) => {
    const { data } = await apiClient.delete(
      `/chat/conversations/${conversationId}/messages/${messageId}/reactions`
    )
    return data as { reactions: ChatReaction[] }
  },
  block: async (peer: { kind: ChatParticipantKind; id: string }) => {
    const { data } = await apiClient.post('/chat/blocks', peer)
    return data as { message: string }
  },
  unblock: async (peer: { kind: ChatParticipantKind; id: string }) => {
    const { data } = await apiClient.delete(`/chat/blocks/${peer.kind}/${peer.id}`)
    return data as { message: string }
  },
  report: async (
    conversationId: string,
    payload: { reason: ChatReportReason; note?: string; messageId?: string },
  ) => {
    const { data } = await apiClient.post(`/chat/conversations/${conversationId}/report`, payload)
    return data as { message: string }
  },

  // ── Admin ──
  getPolicy: async () => {
    const { data } = await apiClient.get('/chat/admin/policy')
    return data as ChatPolicy
  },
  updatePolicy: async (rules: Array<{ from: ChatRole; to: ChatRole; mode: ChatRuleMode }>) => {
    const { data } = await apiClient.put('/chat/admin/policy', { rules })
    return data as ChatPolicy & { message: string }
  },
  resetPolicy: async () => {
    const { data } = await apiClient.post('/chat/admin/policy/reset')
    return data as ChatPolicy & { message: string }
  },
  getPeopleAccess: async (params?: { role?: 'client'; search?: string }) => {
    const { data } = await apiClient.get('/chat/admin/people', { params })
    return data as { people: ChatPersonAccess[] }
  },
  updateAccess: async (kind: ChatParticipantKind, id: string, patch: ChatAccessPatch) => {
    const { data } = await apiClient.put(`/chat/admin/overrides/${kind}/${id}`, patch)
    return data as { message: string; person: ChatPersonAccess }
  },
  updateSettings: async (settings: ChatSettings) => {
    const { data } = await apiClient.put('/chat/admin/settings', settings)
    return data as { message: string; settings: ChatSettings }
  },
  getReports: async (status?: 'open' | 'resolved') => {
    const { data } = await apiClient.get('/chat/admin/reports', { params: status ? { status } : undefined })
    return data as { reports: ChatReport[]; openCount: number }
  },
  resolveReport: async (id: string, payload: { status: 'open' | 'resolved'; resolutionNote?: string }) => {
    const { data } = await apiClient.patch(`/chat/admin/reports/${id}`, payload)
    return data as { message: string; report: ChatReport }
  },
  getAllConversations: async (search?: string) => {
    const { data } = await apiClient.get('/chat/admin/conversations', {
      params: search ? { search } : undefined,
    })
    return data as { conversations: ChatAdminConversation[] }
  },
  getAnyConversation: async (id: string) => {
    const { data } = await apiClient.get(`/chat/admin/conversations/${id}`, { params: { limit: 100 } })
    return data as { conversation: ChatAdminConversation; messages: ChatMessage[]; hasMore: boolean }
  },
}
