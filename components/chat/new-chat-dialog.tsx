'use client'

import { useEffect, useState } from 'react'
import { IconSearch } from '@tabler/icons-react'
import { ChatAvatar } from '@/components/chat/chat-thread'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useChatContacts } from '@/hooks/use-chat'
import { type ChatPeer, chatRoleLabel } from '@/lib/services/chat.service'

interface NewChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (peer: ChatPeer) => void
}

/** Lists only the people the chat rules let this account message. */
export function NewChatDialog({ open, onOpenChange, onPick }: NewChatDialogProps) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const { data: contacts, isLoading } = useChatContacts(debounced, open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-3">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>People you are allowed to message.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone"
            className="pl-9"
          />
        </div>
        <div className="-mx-2 max-h-80 min-h-40 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 px-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !contacts || contacts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {debounced
                ? `Nobody matches “${debounced}”.`
                : 'There is nobody you can message yet. An admin controls who can chat with whom.'}
            </p>
          ) : (
            contacts.map((c) => (
              <button
                key={`${c.kind}:${c.id}`}
                type="button"
                onClick={() => onPick(c)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <ChatAvatar name={c.name} avatarUrl={c.avatarUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">{chatRoleLabel(c.role)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
