'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mockMemberships, Membership } from '@/lib/mock-data'
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
import { IconPlus, IconEdit, IconTrash, IconEye } from '@tabler/icons-react'

export default function MembershipsPage() {
  const [memberships, setMemberships] = useState<Membership[]>(mockMemberships)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [formData, setFormData] = useState({
    userId: '',
    planType: 'standard' as const,
    price: 199.99,
    startDate: '',
    endDate: '',
    notes: '',
  })

  const filteredMemberships = memberships.filter(m =>
    m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.notes.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddMembership = () => {
    if (formData.userId && formData.startDate) {
      const newMembership: Membership = {
        id: `m${memberships.length + 1}`,
        userId: formData.userId,
        planType: formData.planType,
        price: formData.price,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: 'active',
        notes: formData.notes,
      }
      setMemberships([...memberships, newMembership])
      resetForm()
      setIsAddDialogOpen(false)
    }
  }

  const handleDeleteMembership = (id: string) => {
    setMemberships(memberships.filter(m => m.id !== id))
  }

  const resetForm = () => {
    setFormData({
      userId: '',
      planType: 'standard',
      price: 199.99,
      startDate: '',
      endDate: '',
      notes: '',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic':
        return 'bg-blue-100 text-blue-800'
      case 'standard':
        return 'bg-purple-100 text-purple-800'
      case 'premium':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Memberships</h2>
                <p className="text-muted-foreground">Manage member subscriptions and plans</p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <IconPlus className="w-4 h-4 mr-2" />
                    Add Membership
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Membership</DialogTitle>
                    <DialogDescription>Add a new membership plan for a member</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Member ID</label>
                      <Input
                        value={formData.userId}
                        onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                        placeholder="member123"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Plan Type</label>
                        <select
                          value={formData.planType}
                          onChange={(e) => setFormData({ ...formData, planType: e.target.value as any })}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="basic">Basic</option>
                          <option value="standard">Standard</option>
                          <option value="premium">Premium</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Price</label>
                        <Input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                          placeholder="199.99"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Start Date</label>
                        <Input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">End Date</label>
                        <Input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes..."
                        className="w-full px-3 py-2 border rounded-md h-20 resize-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false)
                          resetForm()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddMembership}>Add Membership</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search Bar */}
            <Card>
              <CardHeader>
                <Input
                  placeholder="Search memberships..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </CardHeader>
            </Card>

            {/* Memberships Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Memberships</CardTitle>
                <CardDescription>Total: {filteredMemberships.length} active memberships</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Member ID</TableHead>
                        <TableHead>Plan Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMemberships.map((membership) => (
                        <TableRow key={membership.id}>
                          <TableCell className="font-medium">{membership.id}</TableCell>
                          <TableCell>{membership.userId}</TableCell>
                          <TableCell>
                            <Badge className={getPlanColor(membership.planType)}>
                              {membership.planType}
                            </Badge>
                          </TableCell>
                          <TableCell>${membership.price.toFixed(2)}</TableCell>
                          <TableCell>{membership.startDate}</TableCell>
                          <TableCell>{membership.endDate}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(membership.status)}>
                              {membership.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedMembership(membership)
                                  setIsDetailsOpen(true)
                                }}
                              >
                                <IconEye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteMembership(membership.id)}
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

            {/* Details Dialog */}
            {selectedMembership && (
              <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Membership Details</DialogTitle>
                    <DialogDescription>{selectedMembership.id}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Member ID</label>
                        <p className="text-sm">{selectedMembership.userId}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Plan Type</label>
                        <p className="text-sm">{selectedMembership.planType}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Start Date</label>
                        <p className="text-sm">{selectedMembership.startDate}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">End Date</label>
                        <p className="text-sm">{selectedMembership.endDate}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Price</label>
                        <p className="text-sm">${selectedMembership.price.toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <p className="text-sm">{selectedMembership.status}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Notes</label>
                      <p className="text-sm">{selectedMembership.notes}</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
    </div>
  )
}
