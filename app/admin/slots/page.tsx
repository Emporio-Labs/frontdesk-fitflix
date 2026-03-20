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

export default function SlotsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ date: '', startTime: '', endTime: '' })

  const { data: slots = [], isLoading, isError, refetch } = useSlots()
  const createSlot = useCreateSlot()
  const deleteSlot = useDeleteSlot()

  const handleCreate = async () => {
    if (!formData.date || !formData.startTime || !formData.endTime) return
    await createSlot.mutateAsync({
      date: new Date(formData.date).toISOString(),
      startTime: formData.startTime,
      endTime: formData.endTime,
    })
    setIsDialogOpen(false)
    setFormData({ date: '', startTime: '', endTime: '' })
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Time Slots</h2>
          <p className="text-muted-foreground">Create and manage appointment time slots</p>
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
                <DialogTitle>Create Time Slot</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Start Time</label>
                  <Input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">End Time</label>
                  <Input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
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
                    <TableHead>Date</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No slots found. Create your first slot.</TableCell></TableRow>
                  ) : (
                    slots.map((slot) => (
                      <TableRow key={slot._id}>
                        <TableCell>{new Date(slot.date).toLocaleDateString()}</TableCell>
                        <TableCell>{slot.startTime}</TableCell>
                        <TableCell>{slot.endTime}</TableCell>
                        <TableCell>
                          <Badge className={slot.isBooked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                            {slot.isBooked ? 'Booked' : 'Available'}
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
