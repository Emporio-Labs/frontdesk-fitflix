'use client'

import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  IconSearch,
  IconUser,
  IconFileText,
  IconEye,
  IconUsers,
  IconCalendarEvent,
  IconCheck,
} from '@tabler/icons-react'
import { useAuth } from '@/hooks/use-auth'
import { useMyNutritionistClients } from '@/hooks/use-nutritionist-clients'
import { useUsers } from '@/hooks/use-users'
import { ClinicalUserDialog } from '@/components/nutrition/clinical-user-dialog'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/skeleton-loader'
import { useHighlightRow } from '@/components/highlight-row'

export default function NutritionistMyClientsPage() {
  const { user: currentUser } = useAuth()
  const { data: myClients = [], isLoading: clientsLoading, refetch } = useMyNutritionistClients()
  const { data: allUsers = [], isLoading: allUsersLoading } = useUsers()

  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Consolidate clients: prioritize useMyNutritionistClients, fallback to appointment matches
  const clientsList = useMemo(() => {
    if (Array.isArray(myClients) && myClients.length > 0) {
      return myClients
    }

    // Fallback if backend endpoint /nutritionist/me/members returns empty in dev
    const currentId = currentUser?.id || ''
    const currentName = currentUser?.name?.toLowerCase() || ''
    const currentUserEmail = currentUser?.email?.toLowerCase() || ''

    if (!Array.isArray(allUsers)) return []

    return allUsers.filter((u: any) => {
      // Check appointments assigned to this nutritionist
      const hasAppt = (u.expertAppointments || []).some((a: any) => {
        if (a.expertType !== 'nutritionist') return false
        const nutId = String(a.assignedNutritionistId || a.assignedNutritionist || '')
        const nutName = String(a.assignedNutritionistName || '').toLowerCase()
        if (currentId && nutId === currentId) return true
        if (currentName && nutName.includes(currentName)) return true
        return false
      })
      if (hasAppt) return true

      const assignedNutri = String(u.assignedNutritionistId || u.assignedNutritionist || '')
      if (currentId && assignedNutri === currentId) return true

      return false
    })
  }, [myClients, allUsers, currentUser])

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clientsList

    return clientsList.filter((m: any) => {
      const name = String(m.name || m.username || '').toLowerCase()
      const email = String(m.email || '').toLowerCase()
      const phone = String(m.phone || '')
      return name.includes(q) || email.includes(q) || phone.includes(q)
    })
  }, [clientsList, search])

  const handleOpenClient = (userId: string) => {
    setSelectedUserId(userId)
    setDialogOpen(true)
  }

  const isLoading = clientsLoading && allUsersLoading

  // Calculate stats
  const totalClients = clientsList.length
  const clientsWithReports = clientsList.filter(
    (c: any) => Array.isArray(c.reports) && c.reports.length > 0
  ).length

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            My Clients
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Members assigned to your nutrition roster. Read medical reports and manage clinical care plans.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Assigned Clients</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '…' : totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">Active nutrition consultations</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Uploaded Medical Reports</CardTitle>
            <IconFileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {isLoading ? '…' : clientsWithReports}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Clients with available lab & blood panels
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Consultation Mode</CardTitle>
            <IconCalendarEvent className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              In-Profile
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Read reports in-page without downloading
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar & Client Directory */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Client Directory</CardTitle>
              <CardDescription className="text-xs">
                Select a client to review their uploaded medical reports, health markers, and diet plan.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<IconUsers className="h-10 w-10 text-muted-foreground" />}
                title={search ? 'No matching clients' : 'No assigned clients yet'}
                description={
                  search
                    ? `No clients found matching "${search}".`
                    : 'Members assigned to you for nutrition consultations will appear here.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead>Medical Reports</TableHead>
                    <TableHead className="hidden lg:table-cell">Health Goals</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client: any) => {
                    const cid = client._id || client.id
                    const displayName = client.name || client.username || 'Member'
                    const reports = client.reports || []
                    const reportCount = Array.isArray(reports) ? reports.length : 0
                    const goals = Array.isArray(client.healthGoals) ? client.healthGoals : []

                    return (
                      <HighlightableClientRow
                        key={cid}
                        cid={cid}
                        client={client}
                        displayName={displayName}
                        reportCount={reportCount}
                        goals={goals}
                        onOpen={handleOpenClient}
                      />
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clinical User Dialog containing the medical reports reader */}
      <ClinicalUserDialog
        userId={selectedUserId}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setSelectedUserId(null)
        }}
      />
    </div>
  )
}

function HighlightableClientRow({
  cid,
  client,
  displayName,
  reportCount,
  goals,
  onOpen,
}: {
  cid: string
  client: any
  displayName: string
  reportCount: number
  goals: string[]
  onOpen: (id: string) => void
}) {
  const highlight = useHighlightRow<HTMLTableRowElement>(cid)
  return (
    <TableRow ref={highlight.ref} className={`hover:bg-muted/50 ${highlight.className}`.trim()}>
      <TableCell data-label="Member">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground md:hidden truncate">
              {client.email || client.phone || 'No contact'}
            </p>
          </div>
        </div>
      </TableCell>

      <TableCell
        data-label="Contact"
        className="hidden md:table-cell text-sm text-muted-foreground"
      >
        <div>{client.email || '—'}</div>
        {client.phone && <div className="text-xs">{client.phone}</div>}
      </TableCell>

      <TableCell data-label="Reports">
        {reportCount > 0 ? (
          <Badge
            variant="secondary"
            className="text-xs gap-1.5 font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          >
            <IconFileText className="h-3.5 w-3.5" />
            {reportCount} report{reportCount > 1 ? 's' : ''} available
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">None uploaded</span>
        )}
      </TableCell>

      <TableCell data-label="Goals" className="hidden lg:table-cell">
        {goals.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {goals.slice(0, 2).map((g: string) => (
              <Badge key={g} variant="outline" className="text-[11px]">
                {g}
              </Badge>
            ))}
            {goals.length > 2 && (
              <span className="text-xs text-muted-foreground">+{goals.length - 2}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell data-hide-label className="text-right">
        <Button
          id={`client-profile-btn-${cid}`}
          size="sm"
          variant="default"
          className="text-xs gap-1.5 w-full sm:w-auto sm:h-8"
          onClick={() => onOpen(cid)}
        >
          <IconEye className="h-3.5 w-3.5" />
          Client Profile
        </Button>
      </TableCell>
    </TableRow>
  )
}
