'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  IconPlus,
  IconSearch,
  IconCheck,
  IconX,
  IconClock,
} from '@tabler/icons-react'
import { useWorkoutPlans, useAssignWorkoutPlan } from '@/hooks/use-workout-plans'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import type { WorkoutPlan } from '@/types/workout'

interface User {
  id: string
  name: string
  email: string
}

interface PlanAssignment {
  planId: string
  planName: string
  assignedUsers: string[]
  status: 'active' | 'draft' | 'paused' | 'completed'
  createdAt: string
}

export function AssignmentManager() {
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string>('')

  const { data: plans, isLoading: plansLoading } = useWorkoutPlans({
    status: 'Active',
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get('/users')
      return response.data as User[]
    },
  })

  const assignMutation = useAssignWorkoutPlan()

  const filteredPlans = (plans?.plans || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleAssignPlan = async () => {
    if (!selectedPlan || selectedUsers.length === 0) {
      toast.error('Please select a plan and at least one user')
      return
    }

    try {
      await assignMutation.mutateAsync({
        id: selectedPlan.id,
        payload: {
          userIds: selectedUsers,
          startDate: startDate || undefined,
        },
      })

      setDialogOpen(false)
      setSelectedPlan(null)
      setSelectedUsers([])
      setStartDate('')
    } catch (error) {
      toast.error('Failed to assign plan')
    }
  }

  return (
    <div className="space-y-6">
      {/* Assignments Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Active Plans</span>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <IconPlus className="w-4 h-4" />
                  Assign Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Workout Plan</DialogTitle>
                  <DialogDescription>
                    Select a plan and choose users to assign it to
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Plan Selection */}
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Workout Plan
                    </label>
                    <div className="relative">
                      <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search plans..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 mb-2"
                      />
                    </div>

                    {plansLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-12" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {filteredPlans.map((plan) => (
                          <Button
                            key={plan.id}
                            variant={
                              selectedPlan?.id === plan.id ? 'default' : 'outline'
                            }
                            className="justify-start h-auto py-2 px-3 text-left"
                            onClick={() => setSelectedPlan(plan)}
                          >
                            <div>
                              <div className="font-medium text-sm">
                                {plan.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {plan.duration} days · {plan.goal}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* User Selection */}
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Assign to Users
                    </label>
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                      {users?.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.id])
                              } else {
                                setSelectedUsers(
                                  selectedUsers.filter((id) => id !== user.id)
                                )
                              }
                            }}
                            className="rounded"
                          />
                          <div>
                            <div className="text-sm font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Start Date (Optional)
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAssignPlan}
                      disabled={!selectedPlan || selectedUsers.length === 0}
                    >
                      Assign Plan
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {plansLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPlans.map((plan) => (
                <Card key={plan.id} className="bg-muted/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {plan.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">{plan.goal}</Badge>
                          <Badge variant="outline">{plan.duration} days</Badge>
                          <span className="text-xs text-muted-foreground">
                            {plan.assignedUsers?.length || 0} assigned
                          </span>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant={
                            plan.status === 'Active' ? 'default' : 'secondary'
                          }
                          className="gap-1"
                        >
                          {plan.status === 'Active' ? (
                            <>
                              <IconCheck className="w-3 h-3" />
                              Active
                            </>
                          ) : plan.status === 'Draft' ? (
                            <>
                              <IconClock className="w-3 h-3" />
                              Draft
                            </>
                          ) : (
                            <>
                              <IconX className="w-3 h-3" />
                              {plan.status}
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredPlans.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No active plans found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
