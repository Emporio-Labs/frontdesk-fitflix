'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { IconPlus, IconTrash, IconRefresh } from '@tabler/icons-react'
import { useBookings, useCreateBooking, useDeleteBooking, useChangeBookingStatus } from '@/hooks/use-bookings'
import { useSlots } from '@/hooks/use-slots'
import { BOOKING_STATUS, BookingStatusValue } from '@/lib/services/booking.service'

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-blue-100 text-blue-800',
  1: 'bg-green-100 text-green-800',
  2: 'bg-red-100 text-red-800',
  3: 'bg-emerald-100 text-emerald-800',
  4: 'bg-gray-100 text-gray-800',
}

export default function BookingsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    bookingDate: '',
    userId: '',
    slotId: '',
    serviceId: '',
  })

  const { data: bookings = [], isLoading, isError, refetch } = useBookings()
  const { data: slots = [] } = useSlots()
  const createBooking = useCreateBooking()
  const deleteBooking = useDeleteBooking()
  const changeStatus = useChangeBookingStatus()

  const filtered = bookings.filter(
    (b) =>
      b._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.user.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreate = async () => {
    if (!formData.bookingDate || !formData.slotId || !formData.serviceId) return
    await createBooking.mutateAsync(formData)
    setIsDialogOpen(false)
    setFormData({ bookingDate: '', userId: '', slotId: '', serviceId: '' })
  }

  const handleStatusChange = (id: string, status: string) => {
    changeStatus.mutate({ id, status: Number(status) as BookingStatusValue })
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">Manage all service bookings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <IconPlus className="w-4 h-4 mr-2" /> New Booking
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Booking</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">Booking Date</label>
                  <Input
                    type="datetime-local"
                    value={formData.bookingDate}
                    onChange={(e) => setFormData({ ...formData, bookingDate: new Date(e.target.value).toISOString() })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">User ID</label>
                  <Input
                    placeholder="MongoDB ObjectId of the user"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Slot</label>
                  <Select onValueChange={(v) => setFormData({ ...formData, slotId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {slots.filter(s => !s.isBooked).map((slot) => (
                        <SelectItem key={slot._id} value={slot._id}>
                          {new Date(slot.date).toLocaleDateString()} — {slot.startTime} to {slot.endTime}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Service ID</label>
                  <Input
                    placeholder="MongoDB ObjectId of the service"
                    value={formData.serviceId}
                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createBooking.isPending}>
                    {createBooking.isPending ? 'Creating...' : 'Create Booking'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <Input
            placeholder="Search by booking ID or user ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `${filtered.length} bookings`}</CardDescription>
        </CardHeader>
        <CardContent>
          {isError && (
            <div className="text-center py-8 text-red-500">
              Failed to load bookings. Check credentials and API connectivity.
            </div>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Change Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No bookings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((booking) => (
                      <TableRow key={booking._id}>
                        <TableCell className="font-mono text-xs">{booking._id.slice(-8)}</TableCell>
                        <TableCell className="font-mono text-xs">{booking.user.slice(-8)}</TableCell>
                        <TableCell>{new Date(booking.bookingDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[booking.status as number] || 'bg-gray-100 text-gray-800'}>
                            {BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS] ?? booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select onValueChange={(v) => handleStatusChange(booking._id, v)}>
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue placeholder="Change status" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(BOOKING_STATUS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteBooking.mutate(booking._id)}
                            disabled={deleteBooking.isPending}
                          >
                            <IconTrash className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
