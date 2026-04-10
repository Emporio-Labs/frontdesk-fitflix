'use client'

import { useMemo, useState } from 'react'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { IconPlus, IconEdit, IconTrash, IconRefresh } from '@tabler/icons-react'
import { toast } from 'sonner'
import {
  useCreateService,
  useDeleteService,
  useServices,
  useUpdateService,
} from '@/hooks/use-services'

type CatalogItem = {
  id: string
  name: string
  time: number
  creditCost: number
  description: string
  tags: string[]
  slots: string[]
}

export default function ServicesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    time: 60,
    creditCost: 1,
    description: '',
    tags: '',
    slots: '',
  })

  const {
    data: services = [],
    isLoading,
    isError,
    refetch: refetchServices,
  } = useServices()

  const createService = useCreateService()
  const updateService = useUpdateService()
  const deleteService = useDeleteService()

  const items = services

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const query = searchTerm.toLowerCase()
        return (
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query))
        )
      }),
    [items, searchTerm]
  )

  const parseCsvInput = (value: string) =>
    value
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean)

  const resetForm = () => {
    setFormData({
      name: '',
      time: 60,
      creditCost: 1,
      description: '',
      tags: '',
      slots: '',
    })
  }

  const openCreateDialog = () => {
    setEditingItem(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (item: CatalogItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      time: item.time,
      creditCost: item.creditCost,
      description: item.description,
      tags: item.tags.join(', '),
      slots: item.slots.join(', '),
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    if (!Number.isFinite(formData.time) || formData.time <= 0) {
      toast.error('Please enter a valid duration greater than 0')
      return
    }

    if (!Number.isFinite(formData.creditCost) || formData.creditCost <= 0) {
      toast.error('Please enter a valid credit cost greater than 0')
      return
    }

    const payload = {
      name: formData.name.trim(),
      time: formData.time,
      creditCost: formData.creditCost,
      description: formData.description.trim(),
      tags: parseCsvInput(formData.tags),
      slots: parseCsvInput(formData.slots),
    }

    if (editingItem) {
      await updateService.mutateAsync({ id: editingItem.id, payload })
    } else {
      await createService.mutateAsync(payload)
    }

    setEditingItem(null)
    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    deleteService.mutate(id)
  }

  const handleRefresh = () => {
    refetchServices()
  }

  const isPending = createService.isPending || updateService.isPending || deleteService.isPending

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Services</h2>
          <p className="text-muted-foreground">Manage all services from one screen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <IconRefresh className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <IconPlus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Service' : 'Create Service'}</DialogTitle>
                <DialogDescription>Fill in the catalog details required by the updated API.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Body Composition Analysis"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Time (minutes)</label>
                  <Input
                    type="number"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: Number.parseInt(e.target.value, 10) || 0 })}
                    placeholder="60"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Credit Cost</label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.creditCost}
                    onChange={(e) => setFormData({ ...formData, creditCost: Number.parseInt(e.target.value, 10) || 0 })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this item"
                    className="h-20 w-full resize-none rounded-md border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tags (comma separated)</label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="assessment, baseline"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Slot IDs (comma separated)</label>
                  <Input
                    value={formData.slots}
                    onChange={(e) => setFormData({ ...formData, slots: e.target.value })}
                    placeholder="507f1f77bcf86cd799439020"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setEditingItem(null)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? 'Saving...' : editingItem ? 'Save Changes' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services Catalog</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `${filteredItems.length} services found`}</CardDescription>
        </CardHeader>
        <CardContent>
          {isError && (
            <div className="py-8 text-center text-red-500">
              Failed to load services. Please check API connectivity.
            </div>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Credit Cost</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Slots</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        No services found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.time} mins</TableCell>
                        <TableCell>{item.creditCost}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.tags.length ? (
                              item.tags.map((tag) => (
                                <Badge key={tag} variant="outline">{tag}</Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.description || '-'}</TableCell>
                        <TableCell>{item.slots.length}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                              <IconEdit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(item.id)}
                              disabled={isPending}
                            >
                              <IconTrash className="h-4 w-4" />
                            </Button>
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
