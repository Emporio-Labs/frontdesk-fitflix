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

  const { data: slots = [], isLoading, isError, refetch } = useSlots()
  const createSlot = useCreateSlot()
  const deleteSlot = useDeleteSlot()

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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No slots found. Create your first slot.</TableCell></TableRow>
                  ) : (
                    slots.map((slot) => (
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
                        <TableCell className="text-right">
                          <Button
                            size="sm" variant="outline" className="text-red-600"
                            onClick={() => deleteSlot.mutate(slot._id)} disabled={deleteSlot.isPending}
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
