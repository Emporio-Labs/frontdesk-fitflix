'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { IconPlus, IconTrash, IconRefresh } from '@tabler/icons-react'
import { useSlots, useCreateSlot, useDeleteSlot } from '@/hooks/use-slots'
import { useServices } from '@/hooks/use-services'
import { useTherapies } from '@/hooks/use-therapies'
import { useBookings } from '@/hooks/use-bookings'
import { toUtcDateKey } from '@/lib/utils'
import { getUserDisplayName } from '@/lib/populated'
import { toast } from 'sonner'

function timeToMinutes(value: string): number | null {
  const [hoursRaw, minutesRaw] = value.split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return hours * 60 + minutes
}

function formatSlotSchedule(date?: string, isDaily?: boolean) {
  if (isDaily || !date) {
    return 'Daily'
  }

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return 'Daily'
  }

  return parsed.toLocaleDateString()
}

export default function SlotsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ startTime: '', endTime: '', capacity: 1 })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  const { data: slots = [], isLoading, isError, refetch } = useSlots()
  const { data: services = [] } = useServices()
  const { data: therapies = [] } = useTherapies()
  const { data: bookings = [] } = useBookings()
  const createSlot = useCreateSlot()
  const deleteSlot = useDeleteSlot()

  const totalPages = Math.ceil(slots.length / itemsPerPage)
  const activePage = Math.max(1, Math.min(currentPage, totalPages || 1))
  const startIndex = (activePage - 1) * itemsPerPage
  const paginatedSlots = slots.slice(startIndex, startIndex + itemsPerPage)

  const getLinkedItems = (slotId: string) => {
    const linked: string[] = []
    services.forEach((service) => {
      if (service.slots.includes(slotId)) {
        linked.push(`${service.name} (Service)`)
      }
    })
    therapies.forEach((therapy) => {
      if (therapy.slots.includes(slotId)) {
        linked.push(`${therapy.name} (Therapy)`)
      }
    })
    return linked
  }

  const getSlotBookings = (slotId: string, slotDate?: string, isDaily?: boolean) => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    const todayDateKey = local.toISOString().slice(0, 10)

    const targetDateKey = isDaily || !slotDate ? todayDateKey : toUtcDateKey(slotDate)
    return bookings.filter((booking) => {
      const bookingSlotId = booking.slot?._id ?? booking.slot
      const bookingDateKey = toUtcDateKey(booking.bookingDate)
      const isSameSlot = bookingSlotId === slotId
      const isSameDate = bookingDateKey === targetDateKey
      const isActiveStatus =
        Number(booking.status) === 0 || Number(booking.status) === 1 || Number(booking.status) === 3

      return isSameSlot && isSameDate && isActiveStatus
    })
  }

  const handleCreate = async () => {
    if (!formData.startTime || !formData.endTime) {
      toast.error('Start and end time are required')
      return
    }

    if (!Number.isInteger(formData.capacity) || formData.capacity <= 0) {
      toast.error('Capacity must be at least 1')
      return
    }

    const startMinutes = timeToMinutes(formData.startTime)
    const endMinutes = timeToMinutes(formData.endTime)

    if (startMinutes === null || endMinutes === null) {
      toast.error('Please enter a valid start and end time')
      return
    }

    if (startMinutes >= endMinutes) {
      toast.error('End time must be after start time')
      return
    }

    await createSlot.mutateAsync({
      startTime: formData.startTime,
      endTime: formData.endTime,
      capacity: formData.capacity,
      isDaily: true,
    })
    setIsDialogOpen(false)
    setFormData({ startTime: '', endTime: '', capacity: 1 })
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Time Slots</h2>
          <p className="text-muted-foreground">Create and manage daily recurring appointment slots</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><IconPlus className="w-4 h-4 mr-2" /> Create Slot</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Daily Time Slot</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">Start Time</label>
                  <Input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">End Time</label>
                  <Input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Capacity</label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number.parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createSlot.isPending}>
                    {createSlot.isPending ? 'Creating...' : 'Create Slot'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Slots</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `${slots.length} total slots`}</CardDescription>
        </CardHeader>
        <CardContent>
          {isError && <div className="text-center py-8 text-red-500">Failed to load slots.</div>}
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Linked Services / Therapies</TableHead>
                      <TableHead>Today's Bookings</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No slots found. Create your first slot.</TableCell></TableRow>
                    ) : (
                      paginatedSlots.map((slot) => {
                        const linkedItems = getLinkedItems(slot._id)
                        const slotBookings = getSlotBookings(slot._id, slot.date ?? undefined, slot.isDaily)
                        return (
                          <TableRow key={slot._id}>
                            <TableCell>{formatSlotSchedule(slot.date, slot.isDaily)}</TableCell>
                            <TableCell>{slot.startTime}</TableCell>
                            <TableCell>{slot.endTime}</TableCell>
                            <TableCell>
                              {slot.remainingCapacity} / {slot.capacity}
                            </TableCell>
                            <TableCell>
                              <Badge className={slot.remainingCapacity <= 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                                {slot.remainingCapacity <= 0 ? 'Full' : 'Open'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {linkedItems.length === 0 ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {linkedItems.map((name) => (
                                    <Badge
                                      key={name}
                                      variant="outline"
                                      className="text-xs whitespace-nowrap"
                                    >
                                      {name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {slotBookings.length === 0 ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  {slotBookings.map((booking) => (
                                    <span key={booking._id} className="text-xs font-medium">
                                      {getUserDisplayName(booking.user)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm" variant="outline" className="text-red-600"
                                onClick={() => deleteSlot.mutate(slot._id)} disabled={deleteSlot.isPending}
                              >
                                <IconTrash className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, slots.length)} of {slots.length} slots
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
