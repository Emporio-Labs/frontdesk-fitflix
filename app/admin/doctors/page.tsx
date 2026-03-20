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
import { IconPlus, IconEdit, IconTrash, IconRefresh } from '@tabler/icons-react'
import { useDoctors, useCreateDoctor, useUpdateDoctor, useDeleteDoctor } from '@/hooks/use-doctors'
import { Doctor } from '@/lib/services/doctor.service'

export default function DoctorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [formData, setFormData] = useState({
    doctorName: '', email: '', phone: '', password: '',
    description: '', specialitiesInput: '',
  })

  const { data: doctors = [], isLoading, isError, refetch } = useDoctors()
  const createDoctor = useCreateDoctor()
  const updateDoctor = useUpdateDoctor()
  const deleteDoctor = useDeleteDoctor()

  const filtered = doctors.filter(
    (d) =>
      d.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData({ doctorName: '', email: '', phone: '', password: '', description: '', specialitiesInput: '' })
    setEditingDoctor(null)
  }

  const handleOpenEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor)
    setFormData({
      doctorName: doctor.doctorName, email: doctor.email, phone: doctor.phone,
      password: '', description: doctor.description,
      specialitiesInput: doctor.specialities.join(', '),
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    const specialities = formData.specialitiesInput.split(',').map(s => s.trim()).filter(Boolean)
    if (editingDoctor) {
      await updateDoctor.mutateAsync({
        id: editingDoctor._id,
        payload: { doctorName: formData.doctorName, description: formData.description, specialities },
      })
    } else {
      if (!formData.password) return
      await createDoctor.mutateAsync({
        doctorName: formData.doctorName, email: formData.email, phone: formData.phone,
        password: formData.password, description: formData.description, specialities,
      })
    }
    setIsDialogOpen(false)
    resetForm()
  }

  const isPending = createDoctor.isPending || updateDoctor.isPending

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Doctors</h2>
          <p className="text-muted-foreground">Manage clinic doctors and specialists</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm() }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true) }}>
                <IconPlus className="w-4 h-4 mr-2" /> Add Doctor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDoctor ? 'Edit Doctor' : 'Add Doctor'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input value={formData.doctorName} onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })} placeholder="Dr. Smith" />
                </div>
                {!editingDoctor && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="smith@hybridhuman.com" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1234567890" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief bio or specialty description" />
                </div>
                <div>
                  <label className="text-sm font-medium">Specialities (comma-separated)</label>
                  <Input value={formData.specialitiesInput} onChange={(e) => setFormData({ ...formData, specialitiesInput: e.target.value })} placeholder="Cardiology, Preventive Medicine" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm() }}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={isPending}>
                    {isPending ? 'Saving...' : editingDoctor ? 'Save Changes' : 'Add Doctor'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <Input placeholder="Search doctors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Doctors</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `${filtered.length} doctors`}</CardDescription>
        </CardHeader>
        <CardContent>
          {isError && <div className="text-center py-8 text-red-500">Failed to load doctors.</div>}
          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Specialities</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No doctors found</TableCell></TableRow>
                  ) : (
                    filtered.map((doctor) => (
                      <TableRow key={doctor._id}>
                        <TableCell className="font-medium">{doctor.doctorName}</TableCell>
                        <TableCell>{doctor.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {doctor.specialities.map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(doctor.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleOpenEdit(doctor)}><IconEdit className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteDoctor.mutate(doctor._id)} disabled={deleteDoctor.isPending}><IconTrash className="w-4 h-4" /></Button>
                          </div>
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
