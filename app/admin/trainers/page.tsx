'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { IconPlus, IconEdit, IconTrash, IconRefresh, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useTrainers, useCreateTrainer, useUpdateTrainer, useDeleteTrainer } from '@/hooks/use-trainers'
import { Trainer } from '@/lib/services/trainer.service'

const TRAINER_DRAFT_KEY = 'add_trainer_form_draft'

type TrainerFormState = {
  trainerName: string
  email: string
  phone: string
  password: string
  description: string
  specialitiesInput: string
  imageUrl: string
  keySentence: string
  isActive: boolean
}

function defaultTrainerForm(): TrainerFormState {
  return {
    trainerName: '',
    email: '',
    phone: '',
    password: '',
    description: '',
    specialitiesInput: '',
    imageUrl: '',
    keySentence: '',
    isActive: true,
  }
}

function saveTrainerDraft(data: TrainerFormState) {
  try {
    sessionStorage.setItem(TRAINER_DRAFT_KEY, JSON.stringify(data))
  } catch (e) {}
}

function loadTrainerDraft(): TrainerFormState | null {
  try {
    const item = sessionStorage.getItem(TRAINER_DRAFT_KEY)
    return item ? JSON.parse(item) : null
  } catch (e) {
    return null
  }
}

function clearTrainerDraft() {
  try {
    sessionStorage.removeItem(TRAINER_DRAFT_KEY)
  } catch (e) {}
}

export default function TrainersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
  const [formData, setFormData] = useState<TrainerFormState>(defaultTrainerForm())

  // Auto-persist form draft to sessionStorage while filling in Create mode
  useEffect(() => {
    if (isDialogOpen && !editingTrainer) {
      saveTrainerDraft(formData)
    }
  }, [formData, isDialogOpen, editingTrainer])

  const isTrainerFormDirty = useMemo(() => {
    if (editingTrainer) {
      return (
        formData.trainerName !== (editingTrainer.trainerName || '') ||
        formData.email !== (editingTrainer.email || '') ||
        formData.phone !== (editingTrainer.phone || '') ||
        formData.password !== '' ||
        formData.description !== (editingTrainer.description || '') ||
        formData.specialitiesInput !== (editingTrainer.specialities?.join(', ') || '') ||
        formData.imageUrl !== (editingTrainer.imageUrl || '') ||
        formData.keySentence !== (editingTrainer.keySentence || '') ||
        formData.isActive !== (editingTrainer.isActive !== false)
      )
    }
    return Boolean(
      formData.trainerName.trim() ||
      formData.email.trim() ||
      formData.phone.trim() ||
      formData.password.trim() ||
      formData.description.trim() ||
      formData.specialitiesInput.trim() ||
      formData.imageUrl.trim() ||
      formData.keySentence.trim() ||
      !formData.isActive
    )
  }, [formData, editingTrainer])

  const { data: trainers = [], isLoading, isError, refetch } = useTrainers()
  const createTrainer = useCreateTrainer()
  const updateTrainer = useUpdateTrainer()
  const deleteTrainer = useDeleteTrainer()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const filtered = trainers.filter(
    (t) =>
      t.trainerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData(defaultTrainerForm())
    setFormErrors({})
    setEditingTrainer(null)
    setShowPassword(false)
    setShowUnsavedConfirm(false)
  }

  const handleCloseTrainerDialog = () => {
    if (isTrainerFormDirty) {
      setShowUnsavedConfirm(true)
    } else {
      if (!editingTrainer) {
        clearTrainerDraft()
      }
      setIsDialogOpen(false)
      resetForm()
    }
  }

  const openCreateTrainerModal = () => {
    setEditingTrainer(null)
    setFormErrors({})
    setShowPassword(false)
    setShowUnsavedConfirm(false)
    const draft = loadTrainerDraft()
    if (draft) {
      setFormData(draft)
    } else {
      setFormData(defaultTrainerForm())
    }
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (trainer: Trainer) => {
    setEditingTrainer(trainer)
    setFormData({
      trainerName: trainer.trainerName, email: trainer.email, phone: trainer.phone,
      password: '', description: trainer.description,
      specialitiesInput: trainer.specialities.join(', '),
      imageUrl: trainer.imageUrl || '',
      keySentence: trainer.keySentence || '',
      isActive: trainer.isActive !== false,
    })
    setIsDialogOpen(true)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.trainerName.trim()) errors.trainerName = 'Name is required'
    if (!editingTrainer && !formData.email.trim()) errors.email = 'Email is required'
    if (!editingTrainer && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format'
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone is required'
    } else {
      const cleanPhone = formData.phone.replace(/[\s\-()]/g, '')
      const indianPhoneRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/
      if (!indianPhoneRegex.test(cleanPhone)) {
        errors.phone = 'Please enter a valid Indian mobile number (e.g. +91 98765 43210 or 9876543210)'
      }
    }
    
    if (!editingTrainer && !formData.password) errors.password = 'Password is required'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    const specialities = formData.specialitiesInput.split(',').map(s => s.trim()).filter(Boolean)
    const cleanPhone = formData.phone.replace(/[\s\-()]/g, '')
    
    try {
      if (editingTrainer) {
        await updateTrainer.mutateAsync({
          id: editingTrainer._id,
          payload: {
            trainerName: formData.trainerName,
            description: formData.description,
            specialities,
            imageUrl: formData.imageUrl,
            keySentence: formData.keySentence,
            isActive: formData.isActive,
          },
        })
      } else {
        await createTrainer.mutateAsync({
          trainerName: formData.trainerName, email: formData.email, phone: cleanPhone,
          password: formData.password, description: formData.description, specialities,
          imageUrl: formData.imageUrl, keySentence: formData.keySentence, isActive: formData.isActive,
        })
        clearTrainerDraft()
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (err: any) {
      console.error(err)
    }
  }

  const isPending = createTrainer.isPending || updateTrainer.isPending

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trainers</h2>
          <p className="text-muted-foreground">Manage fitness and wellness trainers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o) handleCloseTrainerDialog() }}>
            <DialogTrigger asChild>
              <Button onClick={openCreateTrainerModal}>
                <IconPlus className="w-4 h-4 mr-2" /> Add Trainer
              </Button>
            </DialogTrigger>
            <DialogContent
              onPointerDownOutside={(e) => {
                if (isTrainerFormDirty) {
                  e.preventDefault()
                  handleCloseTrainerDialog()
                }
              }}
              onInteractOutside={(e) => {
                if (isTrainerFormDirty) {
                  e.preventDefault()
                  handleCloseTrainerDialog()
                }
              }}
              onEscapeKeyDown={(e) => {
                if (isTrainerFormDirty) {
                  e.preventDefault()
                  handleCloseTrainerDialog()
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>{editingTrainer ? 'Edit Trainer' : 'Add Trainer'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input value={formData.trainerName} onChange={(e) => setFormData({ ...formData, trainerName: e.target.value })} placeholder="Coach John" />
                  {formErrors.trainerName && <p className="text-xs text-red-500 mt-1">{formErrors.trainerName}</p>}
                </div>
                {!editingTrainer && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Phone *</label>
                      <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 98765 43210" />
                      {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email *</label>
                      <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="smith@fitflix.com" />
                      {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password *</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          tabIndex={-1}
                        >
                          {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formErrors.password && <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>}
                    </div>
                  </>
                )}
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Specializes in HIIT and strength training" />
                </div>
                <div>
                  <label className="text-sm font-medium">Specialities (comma-separated)</label>
                  <Input value={formData.specialitiesInput} onChange={(e) => setFormData({ ...formData, specialitiesInput: e.target.value })} placeholder="HIIT, Yoga, Strength Training" />
                </div>
                <div>
                  <label className="text-sm font-medium">Image URL</label>
                  <Input value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://images.unsplash.com/photo-..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Key Sentence</label>
                  <Input value={formData.keySentence} onChange={(e) => setFormData({ ...formData, keySentence: e.target.value })} placeholder="Dedicated to helping you reach your peak performance." />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Active publicly</label>
                    <p className="text-xs text-muted-foreground">Show this trainer on the public directory page.</p>
                  </div>
                  <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={handleCloseTrainerDialog}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={isPending}>
                    {isPending ? 'Saving...' : editingTrainer ? 'Save Changes' : 'Add Trainer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog open={showUnsavedConfirm} onOpenChange={setShowUnsavedConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                <AlertDialogDescription>
                  You have unsaved changes. Do you want to leave?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowUnsavedConfirm(false)}>
                  Stay
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowUnsavedConfirm(false)
                    if (!editingTrainer) {
                      clearTrainerDraft()
                    }
                    setIsDialogOpen(false)
                    resetForm()
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Leave
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <Input placeholder="Search trainers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Trainers</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `${filtered.length} trainers`}</CardDescription>
        </CardHeader>
        <CardContent>
          {isError && <div className="text-center py-8 text-red-500">Failed to load trainers.</div>}
          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Specialities</TableHead>
                    <TableHead>Public Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No trainers found</TableCell></TableRow>
                  ) : (
                    filtered.map((trainer) => (
                      <TableRow key={trainer._id}>
                        <TableCell className="font-medium flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
                            {trainer.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={trainer.imageUrl} alt={trainer.trainerName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-muted-foreground">
                                {trainer.trainerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{trainer.trainerName}</div>
                            {trainer.keySentence && (
                              <div className="text-xs text-muted-foreground max-w-[200px] truncate">{trainer.keySentence}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{trainer.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {trainer.specialities.map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={trainer.isActive !== false ? "default" : "destructive"}>
                            {trainer.isActive !== false ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(trainer.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleOpenEdit(trainer)}><IconEdit className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => { if (confirm(`Delete ${trainer.trainerName}?`)) deleteTrainer.mutate(trainer._id) }} disabled={deleteTrainer.isPending}><IconTrash className="w-4 h-4" /></Button>
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
