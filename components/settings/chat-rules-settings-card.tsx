'use client'

import { useEffect, useState } from 'react'
import { IconMessages, IconSearch } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useChatPeopleAccess,
  useChatPolicy,
  useResetChatPolicy,
  useUpdateChatAccess,
  useUpdateChatPolicy,
  useUpdateChatSettings,
} from '@/hooks/use-chat'
import {
  type ChatPersonAccess,
  type ChatRole,
  type ChatRule,
  type ChatRuleMode,
  chatRoleLabel,
} from '@/lib/services/chat.service'
import { ChatConversationsPanel, ChatReportsPanel } from '@/components/settings/chat-moderation-panels'
import { cn } from '@/lib/utils'

const MODE_LABEL: Record<ChatRuleMode, string> = {
  none: 'Off',
  assigned: 'Assigned only',
  all: 'Everyone',
}

const MODE_TONE: Record<ChatRuleMode, string> = {
  none: 'text-muted-foreground',
  assigned: 'text-amber-700 dark:text-amber-400',
  all: 'text-emerald-700 dark:text-emerald-400',
}

const plural = (role: ChatRole): string => {
  const label = chatRoleLabel(role)
  return role === 'frontdesk' ? label : `${label}s`
}

export function ChatRulesSettingsCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconMessages className="h-5 w-5" />
          <div>
            <CardTitle>Chat permissions</CardTitle>
            <CardDescription>
              Decide who can message whom. Changes apply straight away, including to existing conversations.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">Role rules</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
          </TabsList>
          <TabsContent value="rules" className="pt-4">
            <RoleRules />
          </TabsContent>
          <TabsContent value="staff" className="pt-4">
            <PeopleAccess scope="staff" />
          </TabsContent>
          <TabsContent value="members" className="pt-4">
            <PeopleAccess scope="members" />
          </TabsContent>
          <TabsContent value="reports" className="pt-4">
            <ChatReportsPanel />
          </TabsContent>
          <TabsContent value="conversations" className="pt-4">
            <ChatConversationsPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ── Role rules ───────────────────────────────────────────────────────────────

function RoleRules() {
  const { data, isLoading } = useChatPolicy()
  const update = useUpdateChatPolicy()
  const reset = useResetChatPolicy()
  const settings = useUpdateChatSettings()

  if (isLoading || !data) return <Skeleton className="h-64 w-full" />

  const rule = (from: ChatRole, to: ChatRole): ChatRule | undefined =>
    data.rules.find((r) => r.from === from && r.to === to)
  const changed = data.rules.some((r) => r.mode !== r.defaultMode)

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Each row is who <span className="font-medium text-foreground">starts</span> the conversation; each column is
        who they are writing to. Once a conversation exists, the other person can always reply.{' '}
        <span className="font-medium text-foreground">Assigned only</span> limits it to a member and the staff they
        are assigned to (their trainer, their nutritionist).
      </p>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-36 bg-background">Can start a chat with →</TableHead>
              {data.roles.map((to) => (
                <TableHead key={to} className="min-w-36 whitespace-nowrap">
                  {plural(to)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.roles.map((from) => (
              <TableRow key={from}>
                <TableCell className="sticky left-0 z-10 bg-background font-medium">{plural(from)}</TableCell>
                {data.roles.map((to) => {
                  const r = rule(from, to)
                  if (!r) return <TableCell key={to} />
                  if (r.locked) {
                    return (
                      <TableCell key={to} className="text-sm text-muted-foreground">
                        Everyone
                      </TableCell>
                    )
                  }
                  return (
                    <TableCell key={to}>
                      <Select
                        value={r.mode}
                        disabled={update.isPending}
                        onValueChange={(mode) => update.mutate([{ from, to, mode: mode as ChatRuleMode }])}
                      >
                        <SelectTrigger
                          aria-label={`${plural(from)} to ${plural(to)}`}
                          className={cn('h-8 w-36 font-medium', MODE_TONE[r.mode])}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{MODE_LABEL.none}</SelectItem>
                          {r.supportsAssigned && <SelectItem value="assigned">{MODE_LABEL.assigned}</SelectItem>}
                          <SelectItem value="all">{MODE_LABEL.all}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <label className="flex items-start justify-between gap-4 rounded-md border p-3">
        <span>
          <span className="block text-sm font-medium">Members need an active membership to chat</span>
          <span className="block text-sm text-muted-foreground">
            A member whose membership has ended can still reach admins and the front desk, so they can renew.
          </span>
        </span>
        <Switch
          checked={data.settings.requireActiveMembership}
          disabled={settings.isPending}
          onCheckedChange={(v) => settings.mutate({ requireActiveMembership: v })}
          aria-label="Members need an active membership to chat"
        />
      </label>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Admins can always message everyone.</p>
        <Button variant="outline" size="sm" disabled={!changed || reset.isPending} onClick={() => reset.mutate()}>
          Reset to defaults
        </Button>
      </div>
    </div>
  )
}

// ── Per-person toggles ───────────────────────────────────────────────────────

function PeopleAccess({ scope }: { scope: 'staff' | 'members' }) {
  const isMembers = scope === 'members'
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  // Members are searched for, not listed — there are too many to page through.
  const enabled = !isMembers || debounced.length >= 2
  const { data: people, isLoading } = useChatPeopleAccess(isMembers ? 'client' : undefined, debounced, enabled)
  const update = useUpdateChatAccess()

  const toggle = (person: ChatPersonAccess, key: 'staffChat' | 'allClients' | 'chatDisabled', value: boolean) =>
    update.mutate({ person, patch: { [key]: value } })

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {isMembers
          ? 'Turn chat off for a single member. Search by name, email or phone.'
          : 'Exceptions for one person, on top of the role rules — for example letting one trainer message other staff.'}
      </p>
      <div className="relative max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isMembers ? 'Search members' : 'Search staff'}
          className="pl-9"
        />
      </div>
      {!enabled ? null : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !people || people.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nobody found.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {!isMembers && <TableHead>Role</TableHead>}
                {!isMembers && <TableHead className="whitespace-nowrap">Can message other staff</TableHead>}
                {!isMembers && <TableHead className="whitespace-nowrap">Can message any member</TableHead>}
                <TableHead className="whitespace-nowrap">Chat turned off</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => (
                <TableRow key={`${p.kind}:${p.id}`}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  {!isMembers && <TableCell className="text-muted-foreground">{chatRoleLabel(p.role)}</TableCell>}
                  {!isMembers && (
                    <TableCell>
                      <Switch
                        checked={p.staffChat}
                        disabled={p.chatDisabled}
                        onCheckedChange={(v) => toggle(p, 'staffChat', v)}
                        aria-label={`${p.name} can message other staff`}
                      />
                    </TableCell>
                  )}
                  {!isMembers && (
                    <TableCell>
                      <Switch
                        checked={p.allClients}
                        disabled={p.chatDisabled}
                        onCheckedChange={(v) => toggle(p, 'allClients', v)}
                        aria-label={`${p.name} can message any member`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Switch
                      checked={p.chatDisabled}
                      onCheckedChange={(v) => toggle(p, 'chatDisabled', v)}
                      aria-label={`Chat turned off for ${p.name}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
