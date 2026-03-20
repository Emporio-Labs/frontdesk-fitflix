'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { mockAuditLogs, mockUsers, AuditLog } from '@/lib/mock-data'
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

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>(mockAuditLogs)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('')
  const [filterEntity, setFilterEntity] = useState<string>('')
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

  const getUserName = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId)
    return user ? user.name : 'Unknown'
  }

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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
            </select>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">All Entity Types</option>
              <option value="user">User</option>
              <option value="membership">Membership</option>
              <option value="therapy">Therapy</option>
              <option value="booking">Booking</option>
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
                {filteredLogs.map((log) => (
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
                    <TableCell>{log.entityId}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </div>
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
