'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mockTherapies, Therapy } from '@/lib/mock-data'
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
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react'

export default function TherapiesPage() {
  const [therapies, setTherapies] = useState<Therapy[]>(mockTherapies)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTherapy, setEditingTherapy] = useState<Therapy | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: 100,
    duration: 60,
  })

  const filteredTherapies = therapies.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddTherapy = () => {
    if (formData.name && formData.category) {
      const newTherapy: Therapy = {
        id: `th${therapies.length + 1}`,
        name: formData.name,
        category: formData.category,
        description: formData.description,
        price: formData.price,
        duration: formData.duration,
        status: 'active',
      }
      setTherapies([...therapies, newTherapy])
      resetForm()
      setIsAddDialogOpen(false)
    }
  }

  const handleEditTherapy = (therapy: Therapy) => {
    setEditingTherapy(therapy)
    setFormData({
      name: therapy.name,
      category: therapy.category,
      description: therapy.description,
      price: therapy.price,
      duration: therapy.duration,
    })
    setIsAddDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (editingTherapy && formData.name && formData.category) {
      setTherapies(therapies.map(t =>
        t.id === editingTherapy.id
          ? {
            ...t,
            name: formData.name,
            category: formData.category,
            description: formData.description,
            price: formData.price,
            duration: formData.duration,
          }
          : t
      ))
      setEditingTherapy(null)
      resetForm()
      setIsAddDialogOpen(false)
    }
  }

  const handleDeleteTherapy = (id: string) => {
    setTherapies(therapies.filter(t => t.id !== id))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      description: '',
      price: 100,
      duration: 60,
    })
  }

  const getStatusColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Therapies</h2>
                <p className="text-muted-foreground">Manage available therapy services</p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingTherapy(null)}>
                    <IconPlus className="w-4 h-4 mr-2" />
                    Add Therapy
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingTherapy ? 'Edit Therapy' : 'Add New Therapy'}</DialogTitle>
                    <DialogDescription>
                      {editingTherapy ? 'Update therapy service information' : 'Create a new therapy service'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Therapy name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="Mental Health, Physical Wellness, etc."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Therapy description"
                        className="w-full px-3 py-2 border rounded-md h-20 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Price ($)</label>
                        <Input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                          placeholder="100"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Duration (mins)</label>
                        <Input
                          type="number"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                          placeholder="60"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false)
                          setEditingTherapy(null)
                          resetForm()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={editingTherapy ? handleSaveEdit : handleAddTherapy}>
                        {editingTherapy ? 'Save Changes' : 'Add Therapy'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search Bar */}
            <Card>
              <CardHeader>
                <Input
                  placeholder="Search by name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </CardHeader>
            </Card>

            {/* Therapies Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Therapies</CardTitle>
                <CardDescription>Total: {filteredTherapies.length} therapies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTherapies.map((therapy) => (
                        <TableRow key={therapy.id}>
                          <TableCell className="font-medium">{therapy.name}</TableCell>
                          <TableCell>{therapy.category}</TableCell>
                          <TableCell className="max-w-xs truncate">{therapy.description}</TableCell>
                          <TableCell>${therapy.price}</TableCell>
                          <TableCell>{therapy.duration} mins</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(therapy.status)}>
                              {therapy.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditTherapy(therapy)}
                              >
                                <IconEdit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteTherapy(therapy.id)}
                              >
                                <IconTrash className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
    </div>
  )
}
