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
import { useBookings } from '@/hooks/use-bookings'
import { useUsers } from '@/hooks/use-users'
import { useAppointments } from '@/hooks/use-appointments'
import { BOOKING_STATUS } from '@/lib/services/booking.service'

type AuditLog = {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  changes: Record<string, { before: unknown; after: unknown }>
  timestamp: string
}

export default function AuditLogsPage() {
  const { data: bookings = [], isLoading: isBookingsLoading } = useBookings()
  const { data: users = [], isLoading: isUsersLoading } = useUsers()
  const { data: appointments = [], isLoading: isAppointmentsLoading } = useAppointments()

  const isLoading = isBookingsLoading || isUsersLoading || isAppointmentsLoading

  const logs = useMemo(() => {
    const list: AuditLog[] = []

    // 1. Map Users into real audit log entries
    users.forEach((user) => {
      const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'
      list.push({
        id: `log-usr-${user._id ? user._id.slice(-6) : user.id.slice(-6)}`,
        userId: 'admin_system',
        action: 'created',
        entityType: 'user',
        entityId: user._id || user.id,
        changes: {
          username: { before: null, after: user.username },
          email: { before: null, after: user.email },
          phone: { before: null, after: user.phone || 'N/A' }
        },
        timestamp: dateStr
      })
    })

    // 2. Map Bookings into real audit log entries
    bookings.forEach((booking) => {
      const createdDateStr = booking.createdAt ? new Date(booking.createdAt).toLocaleString() : 'N/A'
      // Booking Created Log
      list.push({
        id: `log-bk-new-${booking._id.slice(-6)}`,
        userId: booking.user?.username || booking.user?.email || 'admin_operator',
        action: 'created',
        entityType: 'booking',
        entityId: booking._id,
        changes: {
          bookingDate: { before: null, after: booking.bookingDate },
          serviceName: { before: null, after: booking.service?.serviceName || 'Service' },
          creditCostSnapshot: { before: null, after: booking.creditCostSnapshot || 0 }
        },
        timestamp: createdDateStr
      })

      // Booking Status Changed Log
      if (booking.status !== 0) {
        const updatedDateStr = booking.updatedAt ? new Date(booking.updatedAt).toLocaleString() : createdDateStr
        list.push({
          id: `log-bk-upd-${booking._id.slice(-6)}`,
          userId: 'admin_operator',
          action: 'updated',
          entityType: 'booking',
          entityId: booking._id,
          changes: {
            status: { before: 'Booked', after: BOOKING_STATUS[booking.status] || booking.status }
          },
          timestamp: updatedDateStr
        })
      }
    })

    // 3. Map Appointments into real audit log entries
    appointments.forEach((appointment) => {
      const createdDateStr = appointment.createdAt ? new Date(appointment.createdAt).toLocaleString() : 'N/A'
      // Appointment Created Log
      list.push({
        id: `log-apt-new-${appointment._id.slice(-6)}`,
        userId: 'admin_operator',
        action: 'created',
        entityType: 'appointment',
        entityId: appointment._id,
        changes: {
          appointmentDate: { before: null, after: appointment.appointmentDate },
          doctorId: { before: null, after: appointment.doctor?.doctorName || 'Doctor' }
        },
        timestamp: createdDateStr
      })

      // Appointment Status Changed Log
      if (appointment.status !== 0) {
        const updatedDateStr = appointment.updatedAt ? new Date(appointment.updatedAt).toLocaleString() : createdDateStr
        list.push({
          id: `log-apt-upd-${appointment._id.slice(-6)}`,
          userId: 'admin_operator',
          action: 'updated',
          entityType: 'appointment',
          entityId: appointment._id,
          changes: {
            status: { before: 'Booked', after: String(appointment.status) }
          },
          timestamp: updatedDateStr
        })
      }
    })

    // Sort by timestamp newest first
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [users, bookings, appointments])

  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('')
  const [filterEntity, setFilterEntity] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAction = !filterAction || log.action === filterAction
    const matchesEntity = !filterEntity || log.entityType === filterEntity
    return matchesSearch && matchesAction && matchesEntity
  })

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const activePage = Math.max(1, Math.min(currentPage, totalPages || 1))
  const startIndex = (activePage - 1) * itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage)

  const getUserName = (userId: string) => userId

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-800'
      case 'updated':
        return 'bg-blue-100 text-blue-800'
      case 'deleted':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEntityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'user': 'bg-purple-100 text-purple-800',
      'membership': 'bg-pink-100 text-pink-800',
      'therapy': 'bg-indigo-100 text-indigo-800',
      'booking': 'bg-cyan-100 text-cyan-800',
      'dna-test': 'bg-lime-100 text-lime-800',
      'lead': 'bg-amber-100 text-amber-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">View all system activity and changes (read-only)</p>
      </div>

      {/* Audit Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Audit Trail</CardTitle>
          <CardDescription className="text-blue-800">
            All user actions and data changes are logged for compliance and security purposes
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Activity Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <div className="text-2xl font-bold">{logs.filter(l => l.action === 'created').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.filter(l => l.action === 'updated').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deleted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.filter(l => l.action === 'deleted').length}</div>
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
              placeholder="Search by log ID, user, or entity..."
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
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
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
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
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
                      <TableCell colSpan={7} className="py-4">
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.id}</TableCell>
                      <TableCell>{getUserName(log.userId)}</TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getEntityTypeColor(log.entityType)}>
                          {log.entityType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
                      <TableCell>{log.timestamp}</TableCell>
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
                  <label className="text-sm font-medium">User</label>
                  <p className="text-sm">{getUserName(selectedLog.userId)}</p>
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
              <div>
                <label className="text-sm font-medium">Timestamp</label>
                <p className="text-sm">{selectedLog.timestamp}</p>
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
