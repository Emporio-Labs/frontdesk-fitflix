'use client'

import { useState } from 'react'
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
import { IconPlus, IconTrash, IconEye, IconRefresh } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Membership, MembershipPlanType } from '@/lib/services/membership.service'
import {
  useMemberships,
  useCreateMembership,
  useDeleteMembership,
} from '@/hooks/use-memberships'

export default function MembershipsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [formData, setFormData] = useState({
    userId: '',
    planType: 'standard' as MembershipPlanType,
    price: 199.99,
    startDate: '',
    endDate: '',
    notes: '',
  })

  const { data: memberships = [], isLoading, isError, refetch } = useMemberships()
  const createMembership = useCreateMembership()
  const deleteMembership = useDeleteMembership()

  const filteredMemberships = memberships.filter(m =>
    m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.planType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.notes.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddMembership = async () => {
    if (!formData.userId.trim() || !formData.startDate || !formData.endDate) {
      toast.error('Member ID, start date, and end date are required')
      return
    }

    if (!Number.isFinite(formData.price) || formData.price <= 0) {
      toast.error('Please enter a valid price greater than 0')
      return
    }

    await createMembership.mutateAsync({
      userId: formData.userId.trim(),
      planType: formData.planType,
      price: formData.price,
      startDate: formData.startDate,
      endDate: formData.endDate,
      notes: formData.notes,
    })

    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleDeleteMembership = (id: string) => {
    deleteMembership.mutate(id)
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4 mr-1" /> Refresh
          </Button>
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
                      onChange={(e) => setFormData({ ...formData, planType: e.target.value as MembershipPlanType })}
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
                      onChange={(e) =>
                        setFormData({ ...formData, price: Number.parseFloat(e.target.value) || 0 })
                      }
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
                  <Button onClick={handleAddMembership} disabled={createMembership.isPending}>
                    {createMembership.isPending ? 'Adding...' : 'Add Membership'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
          <CardDescription>
            {isLoading ? 'Loading memberships...' : `Total: ${filteredMemberships.length} memberships`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError && (
            <div className="text-center py-8 text-red-500">
              Failed to load memberships. Please check API connectivity.
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
                  {filteredMemberships.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No memberships found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMemberships.map((membership) => (
                      <TableRow key={membership.id}>
                        <TableCell className="font-medium">{membership.id}</TableCell>
                        <TableCell>{membership.userId}</TableCell>
                        <TableCell>
                          <Badge className={getPlanColor(membership.planType)}>{membership.planType}</Badge>
                        </TableCell>
                        <TableCell>${membership.price.toFixed(2)}</TableCell>
                        <TableCell>{membership.startDate}</TableCell>
                        <TableCell>{membership.endDate}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(membership.status)}>{membership.status}</Badge>
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
                              disabled={deleteMembership.isPending}
                            >
                              <IconTrash className="w-4 h-4" />
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
