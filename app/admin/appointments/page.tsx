'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { IconPlus, IconTrash, IconRefresh } from '@tabler/icons-react'
import { useAppointments, useCreateAppointment, useDeleteAppointment, useChangeAppointmentStatus } from '@/hooks/use-appointments'
import { useDoctors } from '@/hooks/use-doctors'
import { useServices } from '@/hooks/use-services'
import { useTherapies } from '@/hooks/use-therapies'
import { useSlots } from '@/hooks/use-slots'
import { useUsers } from '@/hooks/use-users'
import { APPOINTMENT_STATUS, AppointmentStatusValue } from '@/lib/services/appointment.service'
import { toUtcDateKey } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-blue-100 text-blue-800',
  1: 'bg-green-100 text-green-800',
  2: 'bg-red-100 text-red-800',
  3: 'bg-emerald-100 text-emerald-800',
  4: 'bg-gray-100 text-gray-800',
}

function formatSlotWindowLabel(slot: {
  date?: string
  isDaily?: boolean
  startTime: string
  endTime: string
  remainingCapacity: number
  capacity: number
}) {
  const scheduleLabel =
    slot.isDaily || !slot.date
      ? 'Daily'
      : (() => {
          const parsed = new Date(slot.date)
          return Number.isNaN(parsed.getTime()) ? 'Daily' : parsed.toLocaleDateString()
        })()

  return `${scheduleLabel} - ${slot.startTime} to ${slot.endTime} (${slot.remainingCapacity}/${slot.capacity})`
}

export default function AppointmentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    appointmentDate: '', userId: '', slotId: '', doctorId: '', serviceId: '', bypassCredits: false,
  })

  const { data: appointments = [], isLoading, isError, refetch } = useAppointments()
  const { data: doctors = [] } = useDoctors()
  const { data: services = [] } = useServices()
  const { data: therapies = [] } = useTherapies()
  const { data: slots = [] } = useSlots()
  const { data: users = [] } = useUsers()
  const createAppointment = useCreateAppointment()
  const deleteAppointment = useDeleteAppointment()
  const changeStatus = useChangeAppointmentStatus()

  const selectedDateKey = useMemo(
    () => toUtcDateKey(formData.appointmentDate),
    [formData.appointmentDate]
  )

  const selectedBookableSlotRefs = useMemo(() => {
    if (!formData.serviceId) return [] as string[]

    const fromService = services.find((service) => service.id === formData.serviceId)
    if (fromService) return fromService.slots

    const fromTherapy = therapies.find((therapy) => therapy.id === formData.serviceId)
    if (fromTherapy) return fromTherapy.slots

    return [] as string[]
  }, [formData.serviceId, services, therapies])

  const filteredSlotOptions = useMemo(() => {
    if (!selectedDateKey) return [] as typeof slots

    const byDay = slots.filter((slot) => {
      const slotDateKey = toUtcDateKey(slot.date)
      return slot.isDaily || slotDateKey === selectedDateKey
    })

    const byBookableItem =
      formData.serviceId.length > 0
        ? byDay.filter((slot) => {
            if (selectedBookableSlotRefs.length === 0) return false
            return (
              selectedBookableSlotRefs.includes(slot._id) ||
              (slot.parentTemplate ? selectedBookableSlotRefs.includes(slot.parentTemplate) : false)
            )
          })
        : byDay

    return byBookableItem.filter((slot) => slot.remainingCapacity > 0)
  }, [selectedDateKey, formData.serviceId, selectedBookableSlotRefs, slots])

  const filtered = appointments.filter(
    (a) =>
      a._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.user.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreate = async () => {
    if (!formData.appointmentDate || !formData.userId || !formData.slotId || !formData.doctorId) return

    const selectedSlot = slots.find((slot) => slot._id === formData.slotId)
    if (selectedSlot && selectedSlot.remainingCapacity <= 0) {
      toast.error('Selected slot is already full. Please choose another slot.')
      return
    }

    const payload = {
      appointmentDate: formData.appointmentDate,
      userId: formData.userId.trim(),
      slotId: formData.slotId,
      doctorId: formData.doctorId,
      bypassCredits: formData.bypassCredits,
      ...(formData.serviceId ? { serviceId: formData.serviceId } : {}),
    }
    try {
      await createAppointment.mutateAsync(payload)
      setIsDialogOpen(false)
      setFormData({ appointmentDate: '', userId: '', slotId: '', doctorId: '', serviceId: '', bypassCredits: false })
    } catch {
      // Error states are handled by mutation hooks.
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Appointments</h2>
          <p className="text-muted-foreground">Manage doctor–patient appointments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><IconPlus className="w-4 h-4 mr-2" /> New Appointment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Appointment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">Appointment Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={formData.appointmentDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        appointmentDate: e.target.value ? new Date(e.target.value).toISOString() : '',
                        slotId: '',
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">User ID</label>
                  {users.length > 0 ? (
                    <Select onValueChange={(v) => setFormData({ ...formData, userId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a member" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.username} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="MongoDB ObjectId"
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    />
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Doctor</label>
                  <Select onValueChange={(v) => setFormData({ ...formData, doctorId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                    <SelectContent>
                      {doctors.map((d) => (
                        <SelectItem key={d._id} value={d._id}>{d.doctorName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Slot</label>
                  <Select
                    value={formData.slotId || undefined}
                    onValueChange={(v) => setFormData({ ...formData, slotId: v })}
                    disabled={!selectedDateKey || filteredSlotOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedDateKey
                            ? 'Select appointment date first'
                            : filteredSlotOptions.length === 0
                              ? 'No available slots for this selection'
                              : 'Select slot'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSlotOptions.map((slot) => (
                        <SelectItem key={slot._id} value={slot._id}>
                          {formatSlotWindowLabel(slot)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Service / Therapy (optional)</label>
                  <Select
                    value={formData.serviceId || '__none__'}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        serviceId: v === '__none__' ? '' : v,
                        slotId: '',
                      })
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="No service (default 1 credit)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No service (default 1 credit)</SelectItem>
                      {services.length > 0 && (
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Services</div>
                      )}
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} ({service.creditCost} credit{service.creditCost > 1 ? 's' : ''})
                        </SelectItem>
                      ))}
                      {therapies.length > 0 && (
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Therapies</div>
                      )}
                      {therapies.map((therapy) => (
                        <SelectItem key={therapy.id} value={therapy.id}>
                          {therapy.name} ({therapy.time} mins, {therapy.creditCost} credit{therapy.creditCost > 1 ? 's' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Bypass Credits</p>
                    <p className="text-xs text-muted-foreground">Admin-only override for special cases.</p>
                  </div>
                  <Switch
                    checked={formData.bypassCredits}
                    onCheckedChange={(checked) => setFormData({ ...formData, bypassCredits: checked })}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createAppointment.isPending}>
                    {createAppointment.isPending ? 'Creating...' : 'Create Appointment'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <Input placeholder="Search by ID or user..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `${filtered.length} appointments`}</CardDescription>
        </CardHeader>
        <CardContent>
          {isError && <div className="text-center py-8 text-red-500">Failed to load appointments.</div>}
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Change Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No appointments found</TableCell></TableRow>
                  ) : (
                    filtered.map((appt) => (
                      <TableRow key={appt._id}>
                        <TableCell className="font-mono text-xs">{appt._id.slice(-8)}</TableCell>
                        <TableCell className="font-mono text-xs">{appt.user.slice(-8)}</TableCell>
                        <TableCell className="font-mono text-xs">{appt.doctor.slice(-8)}</TableCell>
                        <TableCell>{new Date(appt.appointmentDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">
                              {typeof appt.creditCostSnapshot === 'number'
                                ? `${appt.creditCostSnapshot} cr`
                                : '-'}
                            </span>
                            {appt.creditsBypassed ? (
                              <Badge variant="outline" className="text-[10px]">
                                Bypassed
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[appt.status as number] || 'bg-gray-100 text-gray-800'}>
                            {APPOINTMENT_STATUS[appt.status as keyof typeof APPOINTMENT_STATUS] ?? appt.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select onValueChange={(v) => changeStatus.mutate({ id: appt._id, status: Number(v) as AppointmentStatusValue })}>
                            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Change" /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(APPOINTMENT_STATUS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteAppointment.mutate(appt._id)} disabled={deleteAppointment.isPending}>
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
