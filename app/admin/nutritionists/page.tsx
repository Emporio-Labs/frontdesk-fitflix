'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { IconPlus, IconEdit, IconRefresh, IconSearch, IconUser, IconPhoto } from '@tabler/icons-react'
import { useNutritionists, useCreateNutritionist, useUpdateNutritionist } from '@/hooks/use-nutritionists'
import { Nutritionist } from '@/lib/services/nutritionist.service'
import { NutritionistAssignmentPanel } from '@/components/nutrition/nutritionist-assignment-panel'

export default function NutritionistsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingNutritionist, setEditingNutritionist] = useState<Nutritionist | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    specialtiesInput: '',
    imageUrl: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  })

  const { data: nutritionists = [], isLoading, isError, refetch } = useNutritionists()
  const createNutritionist = useCreateNutritionist()
  const updateNutritionist = useUpdateNutritionist()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const filtered = nutritionists.filter(
    (n) =>
      n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const resetForm = () => {
    setFormData({
      name: '',
      bio: '',
      specialtiesInput: '',
      imageUrl: '',
      status: 'ACTIVE',
    })
    setFormErrors({})
    setEditingNutritionist(null)
  }

  const handleOpenEdit = (nutritionist: Nutritionist) => {
    setEditingNutritionist(nutritionist)
    setFormData({
      name: nutritionist.name,
      bio: nutritionist.bio || '',
      specialtiesInput: nutritionist.specialties.join(', '),
      imageUrl: nutritionist.imageUrl || '',
      status: nutritionist.status,
    })
    setIsDialogOpen(true)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.specialtiesInput.trim()) errors.specialties = 'At least one specialty/certification is required'
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFormErrors(prev => ({ ...prev, imageUrl: 'Image size must be less than 2MB' }))
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }))
        setFormErrors(prev => {
          const next = { ...prev }
          delete next.imageUrl
          return next
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    const specialties = formData.specialtiesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    
    try {
      if (editingNutritionist) {
        await updateNutritionist.mutateAsync({
          id: editingNutritionist._id || editingNutritionist.id,
          payload: {
            name: formData.name,
            bio: formData.bio,
            specialties,
            imageUrl: formData.imageUrl,
            status: formData.status,
          },
        })
      } else {
        await createNutritionist.mutateAsync({
          name: formData.name,
          bio: formData.bio,
          specialties,
          imageUrl: formData.imageUrl,
          status: formData.status,
        })
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (err: any) {
      console.error(err)
    }
  }

  const handleToggleStatus = async (nutritionist: Nutritionist) => {
    const nextStatus = nutritionist.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await updateNutritionist.mutateAsync({
        id: nutritionist._id || nutritionist.id,
        payload: {
          status: nextStatus,
        },
      })
    } catch (err) {
      console.error(err)
    }
  }

  const isPending = createNutritionist.isPending || updateNutritionist.isPending

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nutritionists</h2>
          <p className="text-muted-foreground">Manage advisor staff profiles, specializations, and booking status.</p>
        </div>
      </div>

      <Tabs defaultValue="profiles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profiles">Staff Profiles</TabsTrigger>
          <TabsTrigger value="assignments">Service Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by name or specialty..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <IconRefresh className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm() }}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setIsDialogOpen(true) }}>
                    <IconPlus className="w-4 h-4 mr-2" /> Add Nutritionist
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
                  <DialogHeader className="p-6 pb-0">
                    <DialogTitle>{editingNutritionist ? 'Edit Nutritionist Profile' : 'Add New Nutritionist'}</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium">Name *</label>
                      <Input 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        placeholder="Dr. Sarah Jenkins"
                        className={formErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium">Bio</label>
                      <Textarea 
                        value={formData.bio} 
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                        placeholder="Clinical nutritionist specializing in sports recovery and weight management plans..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Certifications / Specialties * (comma-separated)</label>
                      <Input 
                        value={formData.specialtiesInput} 
                        onChange={(e) => setFormData({ ...formData, specialtiesInput: e.target.value })} 
                        placeholder="Sports Nutrition, Weight Loss, Keto, Gut Health"
                        className={formErrors.specialties ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {formErrors.specialties && <p className="text-xs text-red-500 mt-1">{formErrors.specialties}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium">Profile Image</label>
                      <div className="mt-1 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
                          {formData.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <IconUser className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="image-file-upload"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('image-file-upload')?.click()}
                            >
                              <IconPhoto className="w-4 h-4 mr-1" /> Upload Image
                            </Button>
                            {formData.imageUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                className="text-red-500 hover:text-red-600"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">Supported: JPEG, PNG. Max size: 2MB</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Input 
                          value={formData.imageUrl} 
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} 
                          placeholder="Or paste profile image URL directly"
                          className="text-xs mt-1"
                        />
                        {formErrors.imageUrl && <p className="text-xs text-red-500 mt-1">{formErrors.imageUrl}</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium">Active Status</label>
                        <p className="text-xs text-muted-foreground">Active nutritionists can accept client appointments.</p>
                      </div>
                      <Switch 
                        checked={formData.status === 'ACTIVE'} 
                        onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'ACTIVE' : 'INACTIVE' })} 
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end p-6 pt-0 border-t mt-auto">
                    <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm() }}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                      {isPending ? 'Saving...' : editingNutritionist ? 'Save Changes' : 'Add Nutritionist'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Nutritionists</CardTitle>
              <CardDescription>{isLoading ? 'Loading records...' : `${filtered.length} nutritionists registered`}</CardDescription>
            </CardHeader>
            <CardContent>
              {isError && <div className="text-center py-8 text-red-500">Failed to load nutritionists from live server.</div>}
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nutritionist</TableHead>
                        <TableHead>Specialties & Certifications</TableHead>
                        <TableHead>Session Volume</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No nutritionists found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((nutritionist) => (
                          <TableRow key={nutritionist._id || nutritionist.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
                                  {nutritionist.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={nutritionist.imageUrl} alt={nutritionist.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-sm font-bold text-muted-foreground">
                                      {nutritionist.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-sm">{nutritionist.name}</div>
                                  {nutritionist.bio && (
                                    <div className="text-xs text-muted-foreground max-w-[280px] truncate" title={nutritionist.bio}>
                                      {nutritionist.bio}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {nutritionist.specialties.map((s) => (
                                  <Badge key={s} variant="secondary" className="text-xs font-normal">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              <span className="bg-muted px-2.5 py-1 rounded-md text-xs border">
                                {nutritionist.sessionVolume || 0} sessions
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch 
                                  checked={nutritionist.status === 'ACTIVE'} 
                                  onCheckedChange={() => handleToggleStatus(nutritionist)}
                                  disabled={updateNutritionist.isPending}
                                />
                                <Badge 
                                  variant={nutritionist.status === 'ACTIVE' ? "default" : "secondary"}
                                  className="text-[10px] uppercase font-bold"
                                >
                                  {nutritionist.status}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleOpenEdit(nutritionist)}
                                className="h-8 w-8 p-0"
                              >
                                <IconEdit className="w-4 h-4" />
                                <span className="sr-only">Edit</span>
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
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <NutritionistAssignmentPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
