'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { IconEye } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuditLogs } from '@/hooks/use-audit-logs'
import { useLocations } from '@/hooks/use-locations'
import type { AuditLog, AuditActor, AuditBranch } from '@/lib/services/audit.service'

// FX-30.4 — render the real actor who performed each action (a person's name),
// never the shared-login label "Frontdesk" or a hardcoded 'admin_operator'. When
// the backend genuinely cannot resolve a name, fall back to the role or
// "Unknown" — honest about missing data rather than inventing an identity.
function actorLabel(actor: AuditActor): string {
  if (actor?.name) return actor.name
  if (actor?.email) return actor.email
  if (actor?.role) return actor.role
  return 'Unknown'
}

// FX-45.1 — show which branch a change happened in. Prefer the name the entry
// carries, fall back to resolving its id against the branch list, then to the
// raw id. A branch-less entry (org-level action, or a legacy unstamped row)
// reads as a dash rather than an invented location.
function branchLabel(
  branch: AuditBranch | null,
  namesById: Map<string, string>
): string {
  if (!branch) return '—'
  if (branch.name) return branch.name
  if (branch.id && namesById.has(branch.id)) return namesById.get(branch.id)!
  return branch.id || '—'
}

function formatTimestamp(ts: string): string {
  if (!ts) return 'N/A'
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString()
}

// Inclusive day-bounded match: the picked `from`/`to` are calendar days, so
// compare against the entry's local date, with the `to` day counted in full.
function withinDateRange(ts: string, from: string, to: string): boolean {
  if (!from && !to) return true
  const t = new Date(ts).getTime()
  if (Number.isNaN(t)) return false
  if (from) {
    const start = new Date(from)
    start.setHours(0, 0, 0, 0)
    if (t < start.getTime()) return false
  }
  if (to) {
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    if (t > end.getTime()) return false
  }
  return true
}

export default function AuditLogsPage() {
  const { data: logs = [], isLoading, isError } = useAuditLogs()
  // Branch names for the column + filter. The feed is already branch-scoped by
  // the backend (X-Location-Id), so for a manager this list is just their own
  // branch and the branch filter stays hidden (nothing to choose between).
  const { data: locations = [] } = useLocations()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('')
  const [filterEntity, setFilterEntity] = useState<string>('')
  const [filterBranch, setFilterBranch] = useState<string>('')
  const [filterFrom, setFilterFrom] = useState<string>('')
  const [filterTo, setFilterTo] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const branchNamesById = useMemo(() => {
    const map = new Map<string, string>()
    for (const l of locations) map.set(l._id, l.name)
    return map
  }, [locations])

  // FX-45.2 — a branch filter only earns its place when more than one branch
  // could appear. With a single branch (every non-super-admin, confined to one
  // branch by the backend) it would be a dropdown with one option.
  const showBranchFilter = locations.length > 1

  const sortedLogs = useMemo(
    () =>
      [...logs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [logs]
  )

  const filteredLogs = sortedLogs.filter((log) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      !term ||
      log.id.toLowerCase().includes(term) ||
      actorLabel(log.actor).toLowerCase().includes(term) ||
      branchLabel(log.branch, branchNamesById).toLowerCase().includes(term) ||
      log.entityId.toLowerCase().includes(term)
    const matchesAction = !filterAction || log.action === filterAction
    const matchesEntity = !filterEntity || log.entityType === filterEntity
    const matchesBranch = !filterBranch || log.branch?.id === filterBranch
    const matchesDate = withinDateRange(log.timestamp, filterFrom, filterTo)
    return matchesSearch && matchesAction && matchesEntity && matchesBranch && matchesDate
  })

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const activePage = Math.max(1, Math.min(currentPage, totalPages || 1))
  const startIndex = (activePage - 1) * itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage)

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-800'
      case 'updated':
        return 'bg-blue-100 text-blue-800'
      // FX-45.1 — a cancellation is a distinct kind of change from a hard delete.
      case 'cancelled':
        return 'bg-amber-100 text-amber-800'
      case 'deleted':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEntityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      user: 'bg-purple-100 text-purple-800',
      membership: 'bg-pink-100 text-pink-800',
      therapy: 'bg-indigo-100 text-indigo-800',
      booking: 'bg-cyan-100 text-cyan-800',
      appointment: 'bg-teal-100 text-teal-800',
      'dna-test': 'bg-lime-100 text-lime-800',
      lead: 'bg-amber-100 text-amber-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">View all system activity and changes (read-only)</p>
      </div>

      {/* Audit Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Audit Trail</CardTitle>
          <CardDescription className="text-blue-800">
            Every create, edit, cancel and delete is logged with who did it, when, which branch,
            and what changed. Records are read-only — they can&apos;t be edited or deleted from
            Frontdesk.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Activity Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.filter((l) => l.action === 'created').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.filter((l) => l.action === 'updated').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.filter((l) => l.action === 'cancelled').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deleted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.filter((l) => l.action === 'deleted').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              placeholder="Search by person, branch, log ID, or entity..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value)
                setCurrentPage(1)
              }}
              className="px-3 py-2 border rounded-md"
            >
              {/* FX-45.2 — kind of change. "Edit" is recorded as updated,
                  "cancel" as cancelled (distinct from a hard delete). */}
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="cancelled">Cancelled</option>
              <option value="deleted">Deleted</option>
            </select>
            <select
              value={filterEntity}
              onChange={(e) => {
                setFilterEntity(e.target.value)
                setCurrentPage(1)
              }}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">All Entity Types</option>
              <option value="user">User</option>
              <option value="membership">Membership</option>
              <option value="therapy">Therapy</option>
              <option value="booking">Booking</option>
              <option value="appointment">Appointment</option>
              <option value="dna-test">DNA Test</option>
              <option value="lead">Lead</option>
            </select>
          </div>

          {/* FX-45.2 — search by branch (admins viewing more than one branch)
              and by date. A manager's feed is a single branch, so the branch
              selector is hidden for them. */}
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {showBranchFilter && (
              <select
                value={filterBranch}
                onChange={(e) => {
                  setFilterBranch(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border rounded-md"
                aria-label="Filter by branch"
              >
                <option value="">All Branches</option>
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="audit-from">
                From
              </label>
              <Input
                id="audit-from"
                type="date"
                value={filterFrom}
                max={filterTo || undefined}
                onChange={(e) => {
                  setFilterFrom(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="audit-to">
                To
              </label>
              <Input
                id="audit-to"
                type="date"
                value={filterTo}
                min={filterFrom || undefined}
                onChange={(e) => {
                  setFilterTo(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Total: {filteredLogs.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Log ID</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={8} className="py-4">
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-red-500 py-8">
                      Failed to load audit logs.
                    </TableCell>
                  </TableRow>
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">{log.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{actorLabel(log.actor)}</span>
                          {log.actor?.role && (
                            <span className="text-xs text-muted-foreground capitalize">
                              {log.actor.role.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                      </TableCell>
                      <TableCell>{branchLabel(log.branch, branchNamesById)}</TableCell>
                      <TableCell>
                        <Badge className={getEntityTypeColor(log.entityType)}>{log.entityType}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
                      <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLog(log)
                            setIsDetailsOpen(true)
                          }}
                        >
                          <IconEye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={activePage === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={activePage === page ? 'default' : 'outline'}
                    size="sm"
                    className="w-9 h-9 p-0 font-medium"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={activePage === totalPages}
                >
                  Next page
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedLog && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Details</DialogTitle>
              <DialogDescription>{selectedLog.id}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Performed By</label>
                  <p className="text-sm">{actorLabel(selectedLog.actor)}</p>
                  {selectedLog.actor?.role && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {selectedLog.actor.role.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Action</label>
                  <p className="text-sm">{selectedLog.action}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Entity Type</label>
                  <p className="text-sm">{selectedLog.entityType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Entity ID</label>
                  <p className="text-sm">{selectedLog.entityId}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Branch</label>
                  <p className="text-sm">{branchLabel(selectedLog.branch, branchNamesById)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Timestamp</label>
                  <p className="text-sm">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Changes</label>
                <div className="bg-gray-50 p-3 rounded text-sm font-mono text-xs max-h-48 overflow-auto">
                  <pre>{JSON.stringify(selectedLog.changes, null, 2)}</pre>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
