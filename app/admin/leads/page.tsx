'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import {
  IconBrandWhatsapp,
  IconLock,
  IconMessageCircle,
  IconPhone,
  IconPlus,
  IconSearch,
  IconTarget,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/empty-state'
import { useAuth } from '@/hooks/use-auth'
import { useLocationScope } from '@/components/location-scope-provider'
import { useDeleteLead, useLeadOutcomes, useLeads } from '@/hooks/use-leads'
import { istDateOnly, isOpenLead, Lead, LeadStatus, OutcomeChannel } from '@/lib/services/lead.service'
import { cn } from '@/lib/utils'
import { LogOutcomeDialog } from '@/components/leads/log-outcome-dialog'
import { LeadDetailSheet } from '@/components/leads/lead-detail-sheet'
import { LeadAnalytics } from '@/components/leads/lead-analytics'
import {
  FollowUpChip,
  HeatChip,
  StatusChip,
  formatWhen,
  telLink,
  timeAgo,
  waLink,
} from '@/components/leads/lead-ui'
import KanbanColumn from './kanban-column'
import KanbanCard from './kanban-card'
import { LeadFormDialog } from './lead-form-dialog'

const COLUMNS: Array<{ key: LeadStatus; title: string; accent: string; hint?: string }> = [
  { key: 'new', title: 'New', accent: 'bg-sky-500', hint: 'Not spoken to yet' },
  { key: 'contacted', title: 'Contacted', accent: 'bg-amber-500' },
  { key: 'visit_booked', title: 'Visit booked', accent: 'bg-violet-500' },
  { key: 'qualified', title: 'Visited', accent: 'bg-indigo-500', hint: 'Came in, deciding' },
  { key: 'converted', title: 'Joined', accent: 'bg-emerald-500', hint: 'Moves here when the invoice is paid' },
]
const LOST_COLUMN: (typeof COLUMNS)[number] = { key: 'lost', title: 'Lost', accent: 'bg-zinc-400' }

/** What dropping a card on a column asks the person to confirm. */
const DROP_OUTCOME: Partial<Record<LeadStatus, { channel: OutcomeChannel; outcome?: string }>> = {
  contacted: { channel: 'call' },
  visit_booked: { channel: 'call', outcome: 'visit_booked' },
  qualified: { channel: 'visit' },
  lost: { channel: 'call', outcome: 'not_interested' },
}

const byFollowUp = (a: Lead, b: Lead) =>
  new Date(a.followUpDate ?? 0).getTime() - new Date(b.followUpDate ?? 0).getTime()

function QueueRow({
  lead,
  meta,
  outcomeLabel,
  onOpen,
  onCall,
  onWhatsApp,
  onLog,
}: {
  lead: Lead
  meta?: React.ReactNode
  outcomeLabel?: string
  onOpen: () => void
  onCall: () => void
  onWhatsApp: () => void
  onLog: () => void
}) {
  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{lead.name}</span>
          <HeatChip temperature={lead.temperature} compact />
          <StatusChip status={lead.status} />
          {meta}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[lead.phone, lead.source, lead.interestedIn, outcomeLabel, lead.ownerName && `Owner: ${lead.ownerName}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </button>
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="outline" onClick={onCall} disabled={!lead.phone} className="flex-1 sm:flex-none">
          <IconPhone className="mr-1 h-4 w-4 text-blue-600" /> Call
        </Button>
        <Button size="sm" variant="outline" onClick={onWhatsApp} disabled={!lead.phone} className="flex-1 sm:flex-none" aria-label="WhatsApp">
          <IconBrandWhatsapp className="h-4 w-4 text-emerald-600" />
        </Button>
        <Button size="sm" variant="outline" onClick={onLog} className="flex-1 sm:flex-none">
          <IconMessageCircle className="mr-1 h-4 w-4" /> Log
        </Button>
      </div>
    </li>
  )
}

function QueueSection({ title, hint, tone, count, children }: { title: string; hint?: string; tone: string; count: number; children: React.ReactNode }) {
  if (!count) return null
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className={cn('flex items-baseline justify-between gap-2 border-b px-3 py-2', tone)}>
        <h3 className="text-sm font-semibold">
          {title} <span className="font-normal opacity-70">· {count}</span>
        </h3>
        {hint && <span className="text-xs opacity-70">{hint}</span>}
      </header>
      <ul className="divide-y">{children}</ul>
    </section>
  )
}

export default function LeadsPage() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const { selectedLocationId } = useLocationScope()
  const { data: leads = [], isLoading, isError, error, refetch } = useLeads()
  const { data: catalog } = useLeadOutcomes()
  const deleteLead = useDeleteLead()

  const [tab, setTab] = useState('today')
  useEffect(() => {
    try {
      const saved = localStorage.getItem('leads_tab')
      if (saved && ['today', 'board', 'list', 'analytics'].includes(saved)) setTab(saved)
    } catch {}
  }, [])
  const changeTab = (t: string) => {
    setTab(t)
    try {
      localStorage.setItem('leads_tab', t)
    } catch {}
  }

  const [search, setSearch] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)
  const [showLost, setShowLost] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [logFor, setLogFor] = useState<{ lead: Lead; channel: OutcomeChannel; outcome?: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null)
  const [dragging, setDragging] = useState<Lead | null>(null)

  // Keep the open sheet in step with the 10-second refresh.
  const detailLead = useMemo(() => leads.find((l) => l.id === detailId) ?? null, [leads, detailId])
  const outcomeLabel = useMemo(() => {
    const map = new Map((catalog?.outcomes ?? []).map((o) => [o.key, o.label]))
    return (lead: Lead) => lead.lastOutcomeLabel || (lead.lastOutcome ? map.get(lead.lastOutcome) : undefined)
  }, [catalog])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const qDigits = q.replace(/\D/g, '')
    return leads.filter((l) => {
      if (onlyMine && l.ownerId !== user?.id) return false
      if (!q) return true
      return (
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (qDigits.length >= 3 && l.phone.replace(/\D/g, '').includes(qDigits))
      )
    })
  }, [leads, search, onlyMine, user?.id])

  const queue = useMemo(() => {
    const now = Date.now()
    const today = istDateOnly(new Date())
    const open = visible.filter(isOpenLead)
    const overdue = open.filter((l) => l.followUpDate && new Date(l.followUpDate).getTime() < now).sort(byFollowUp)
    const visitsToday = open
      .filter((l) => l.status === 'visit_booked' && istDateOnly(l.visitAt) === today)
      .sort((a, b) => new Date(a.visitAt!).getTime() - new Date(b.visitAt!).getTime())
    const visitIds = new Set(visitsToday.map((l) => l.id))
    const dueToday = open
      .filter((l) => !visitIds.has(l.id) && l.followUpDate && istDateOnly(l.followUpDate) === today && new Date(l.followUpDate).getTime() >= now)
      .sort(byFollowUp)
    const fresh = open
      .filter((l) => l.status === 'new' && l.attemptCount === 0 && !(l.followUpDate && new Date(l.followUpDate).getTime() < now))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    const unpaid = visible.filter((l) => l.pendingInvoiceId && l.status !== 'converted')
    return { overdue, visitsToday, dueToday, fresh, unpaid }
  }, [visible])

  const queueTotal = queue.overdue.length + queue.visitsToday.length + queue.dueToday.length + queue.fresh.length + queue.unpaid.length

  const byColumn = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = { new: [], contacted: [], visit_booked: [], qualified: [], converted: [], lost: [] }
    for (const l of visible) map[l.status].push(l)
    // Most urgent first: overdue/earliest follow-up, leads with none last.
    for (const key of Object.keys(map) as LeadStatus[]) {
      map[key].sort((a, b) => {
        const fa = a.followUpDate ? new Date(a.followUpDate).getTime() : Infinity
        const fb = b.followUpDate ? new Date(b.followUpDate).getTime() : Infinity
        return fa - fb || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
    }
    return map
  }, [visible])

  const call = (lead: Lead) => {
    if (!lead.phone) return
    window.location.href = telLink(lead.phone)
    setLogFor({ lead, channel: 'call' })
  }
  const whatsApp = (lead: Lead) => {
    if (!lead.phone) return
    window.open(waLink(lead.phone, lead.name), '_blank', 'noopener,noreferrer')
    setLogFor({ lead, channel: 'whatsapp' })
  }
  const log = (lead: Lead) => setLogFor({ lead, channel: lead.status === 'visit_booked' ? 'visit' : 'call' })
  const openEdit = (lead: Lead | null) => {
    setEditing(lead)
    setFormOpen(true)
  }

  const handleDragStart = (e: DragStartEvent) => setDragging(leads.find((l) => l.id === e.active.id) ?? null)
  const handleDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const lead = leads.find((l) => l.id === e.active.id)
    const target = e.over?.id as LeadStatus | undefined
    if (!lead || !target || target === lead.status) return
    if (target === 'converted') {
      toast.info('Leads move to Joined when their invoice is paid. Open the lead and use "Sell plan".')
      return
    }
    if (target === 'new') {
      toast.info("A lead can't go back to New once someone has worked it.")
      return
    }
    const drop = DROP_OUTCOME[target]
    if (drop) setLogFor({ lead, ...drop })
  }

  // ── Access ────────────────────────────────────────────────────────────
  const forbidden = (error as any)?.response?.status === 403 || (isTrainer && user?.canAccessLeads === false)
  if (forbidden) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <EmptyState
          icon={<IconLock className="h-10 w-10" />}
          title="No access to leads"
          description="Ask an admin to turn on lead access for your account."
        />
      </div>
    )
  }

  const columns = showLost ? [...COLUMNS, LOST_COLUMN] : COLUMNS

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Leads</h2>
          <p className="text-sm text-muted-foreground">
            {leads.filter(isOpenLead).length} open · {queue.overdue.length} overdue
          </p>
        </div>
        <Button onClick={() => openEdit(null)}>
          <IconPlus className="mr-1.5 h-4 w-4" /> Add lead
        </Button>
      </div>

      <Tabs value={tab} onValueChange={changeTab} className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="today">
              Today{queueTotal ? <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{queueTotal}</span> : null}
            </TabsTrigger>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="list">All leads</TabsTrigger>
            {!isTrainer && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          </TabsList>
          {tab !== 'analytics' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or phone" className="pl-8" />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="only-mine" checked={onlyMine} onCheckedChange={setOnlyMine} />
                <Label htmlFor="only-mine" className="text-sm font-normal">Mine</Label>
              </div>
              {tab === 'board' && (
                <div className="flex items-center gap-2">
                  <Switch id="show-lost" checked={showLost} onCheckedChange={setShowLost} />
                  <Label htmlFor="show-lost" className="text-sm font-normal">Show lost</Label>
                </div>
              )}
            </div>
          )}
        </div>

        {isError && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            Couldn't load leads.
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {/* ── Today: who to deal with now ───────────────────────────────── */}
        <TabsContent value="today" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : queueTotal === 0 ? (
            <EmptyState icon={<IconTarget className="h-10 w-10" />} title="All caught up" description="No follow-ups due and no new leads waiting." />
          ) : (
            <>
              <QueueSection title="Overdue" hint="Follow-up time has passed" tone="bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300" count={queue.overdue.length}>
                {queue.overdue.map((l) => (
                  <QueueRow key={l.id} lead={l} outcomeLabel={outcomeLabel(l)} meta={<FollowUpChip lead={l} />} onOpen={() => setDetailId(l.id)} onCall={() => call(l)} onWhatsApp={() => whatsApp(l)} onLog={() => log(l)} />
                ))}
              </QueueSection>
              <QueueSection title="Visits today" tone="bg-violet-50 text-violet-800 dark:bg-violet-500/10 dark:text-violet-300" count={queue.visitsToday.length}>
                {queue.visitsToday.map((l) => (
                  <QueueRow
                    key={l.id}
                    lead={l}
                    outcomeLabel={outcomeLabel(l)}
                    meta={<span className="text-xs font-medium text-violet-700 dark:text-violet-300">{formatWhen(l.visitAt)}</span>}
                    onOpen={() => setDetailId(l.id)}
                    onCall={() => call(l)}
                    onWhatsApp={() => whatsApp(l)}
                    onLog={() => setLogFor({ lead: l, channel: 'visit' })}
                  />
                ))}
              </QueueSection>
              <QueueSection title="Due today" tone="bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-300" count={queue.dueToday.length}>
                {queue.dueToday.map((l) => (
                  <QueueRow key={l.id} lead={l} outcomeLabel={outcomeLabel(l)} meta={<FollowUpChip lead={l} />} onOpen={() => setDetailId(l.id)} onCall={() => call(l)} onWhatsApp={() => whatsApp(l)} onLog={() => log(l)} />
                ))}
              </QueueSection>
              <QueueSection title="New — not called yet" hint="Oldest first" tone="bg-sky-50 text-sky-900 dark:bg-sky-500/10 dark:text-sky-300" count={queue.fresh.length}>
                {queue.fresh.map((l) => (
                  <QueueRow
                    key={l.id}
                    lead={l}
                    meta={<span className={cn('text-xs', Date.now() - new Date(l.createdAt).getTime() > 3600_000 ? 'font-medium text-red-600' : 'text-muted-foreground')}>came in {timeAgo(l.createdAt)}</span>}
                    onOpen={() => setDetailId(l.id)}
                    onCall={() => call(l)}
                    onWhatsApp={() => whatsApp(l)}
                    onLog={() => log(l)}
                  />
                ))}
              </QueueSection>
              <QueueSection title="Awaiting payment" hint="Sale started, not paid" tone="bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300" count={queue.unpaid.length}>
                {queue.unpaid.map((l) => (
                  <QueueRow key={l.id} lead={l} outcomeLabel={outcomeLabel(l)} onOpen={() => setDetailId(l.id)} onCall={() => call(l)} onWhatsApp={() => whatsApp(l)} onLog={() => log(l)} />
                ))}
              </QueueSection>
            </>
          )}
        </TabsContent>

        {/* ── Board ─────────────────────────────────────────────────────── */}
        <TabsContent value="board">
          {isLoading ? (
            <div className="flex gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-80 flex-1" />)}</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDragging(null)}>
              <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                {columns.map((col) => (
                  <KanbanColumn key={col.key} id={col.key} title={col.title} hint={col.hint} accent={col.accent} count={byColumn[col.key].length} refusesDrop={col.key === 'converted' || col.key === 'new'}>
                    {byColumn[col.key].length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">No leads</p>
                    ) : (
                      byColumn[col.key].map((l) => (
                        <KanbanCard
                          key={l.id}
                          lead={l}
                          lastOutcomeLabel={outcomeLabel(l)}
                          isDragDisabled={l.status === 'converted'}
                          onOpen={() => setDetailId(l.id)}
                          onCall={() => call(l)}
                          onWhatsApp={() => whatsApp(l)}
                          onLog={() => log(l)}
                        />
                      ))
                    )}
                  </KanbanColumn>
                ))}
              </div>
              <DragOverlay>
                {dragging && (
                  <div className="w-64 rotate-2 rounded-lg border bg-card p-3 text-sm font-medium shadow-xl">{dragging.name}</div>
                )}
              </DragOverlay>
            </DndContext>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Drag a card to another column and you'll be asked what happened.</p>
        </TabsContent>

        {/* ── All leads ─────────────────────────────────────────────────── */}
        <TabsContent value="list">
          <div className="overflow-hidden rounded-xl border bg-card">
            {isLoading ? (
              <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : visible.length === 0 ? (
              <EmptyState icon={<IconTarget className="h-10 w-10" />} title="No leads" description={search ? 'Nothing matches that search.' : 'Add your first lead.'} />
            ) : (
              <>
                {/* Phones get rows; wider screens get the table. */}
                <ul className="divide-y md:hidden">
                  {visible.map((l) => (
                    <li key={l.id}>
                      <button type="button" onClick={() => setDetailId(l.id)} className="flex w-full items-center justify-between gap-3 p-3 text-left">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{l.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{[l.phone, outcomeLabel(l)].filter(Boolean).join(' · ')}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusChip status={l.status} />
                          <FollowUpChip lead={l} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Next follow-up</TableHead>
                        <TableHead>Last outcome</TableHead>
                        <TableHead className="text-right">Tries</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((l) => (
                        <TableRow key={l.id} className="cursor-pointer" onClick={() => setDetailId(l.id)}>
                          <TableCell>
                            <div className="flex items-center gap-1.5 font-medium">
                              {l.name} <HeatChip temperature={l.temperature} compact />
                            </div>
                            <div className="text-xs text-muted-foreground">{l.phone}</div>
                          </TableCell>
                          <TableCell><StatusChip status={l.status} /></TableCell>
                          <TableCell>{isOpenLead(l) ? <FollowUpChip lead={l} /> : null}</TableCell>
                          <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">{outcomeLabel(l) ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{l.attemptCount}</TableCell>
                          <TableCell className="text-sm">{l.ownerName || '—'}</TableCell>
                          <TableCell className="text-sm">{l.source}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{timeAgo(l.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {!isTrainer && (
          <TabsContent value="analytics">
            {tab === 'analytics' && <LeadAnalytics locationId={selectedLocationId || undefined} />}
          </TabsContent>
        )}
      </Tabs>

      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        lead={editing}
        leads={leads}
        onOpenExisting={(l) => setDetailId(l.id)}
      />

      <LeadDetailSheet
        lead={detailLead}
        open={!!detailLead}
        onOpenChange={(o) => !o && setDetailId(null)}
        onCall={call}
        onWhatsApp={whatsApp}
        onLogOutcome={log}
        onEdit={(l) => openEdit(l)}
        onDelete={isTrainer ? undefined : (l) => setDeleteTarget(l)}
        canSell={!isTrainer}
      />

      <LogOutcomeDialog
        lead={logFor?.lead ?? null}
        open={!!logFor}
        onOpenChange={(o) => !o && setLogFor(null)}
        channel={logFor?.channel}
        outcome={logFor?.outcome}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The lead and its history go for good. To stop working a lead, log it as Lost instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteLead.mutate(deleteTarget.id)
                setDeleteTarget(null)
                setDetailId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
