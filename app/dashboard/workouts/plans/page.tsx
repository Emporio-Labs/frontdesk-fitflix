'use client'

import { useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { IconChevronLeft, IconPlus, IconSearch } from '@tabler/icons-react'
import { useWorkoutPlans } from '@/hooks/use-workout-plans'
import { PlanStatusBadge } from '@/components/workouts/plan-status-badge'
import { DifficultyBadge } from '@/components/workouts/difficulty-badge'
import type { WorkoutPlan } from '@/types/workout'

function PlansContent() {
  const searchParams = useSearchParams()
  const initialStatusFilter = searchParams.get('status') ?? 'All'

  const [search, setSearch] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter)

  const { data: plansData, isLoading, isError, refetch } = useWorkoutPlans()
  const plans = plansData?.plans ?? []

  const filteredPlans = useMemo(() => {
    return plans.filter((plan: WorkoutPlan) => {
      // 1. Search name
      const matchesSearch = plan.name.toLowerCase().includes(search.toLowerCase())

      // 2. Filter status
      const matchesStatus =
        statusFilter === 'All' ||
        plan.status?.toLowerCase() === statusFilter.toLowerCase()

      // 3. Filter difficulty
      const matchesDifficulty =
        difficultyFilter === 'All' ||
        plan.difficulty?.toLowerCase() === difficultyFilter.toLowerCase()

      return matchesSearch && matchesStatus && matchesDifficulty
    })
  }, [plans, search, statusFilter, difficultyFilter])

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 px-2">
              <Link href="/dashboard/workouts">
                <IconChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">Workouts / Plans</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Workout Plans</h2>
          <p className="text-muted-foreground text-sm">
            All workout plans created for members and templates
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/workouts/create">
            <IconPlus className="mr-2 h-4 w-4" />
            Create Plan
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter Plans</CardTitle>
          <CardDescription>Search by name, status, or difficulty</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search plans by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Difficulties</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isError && (
            <div className="text-center py-8 text-red-500">
              Failed to load workout plans.
              <button className="underline ml-1" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground border rounded-lg">
              No workout plans found matching the filters.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Split Type</TableHead>
                    <TableHead>Weeks</TableHead>
                    <TableHead>Assigned Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.map((plan: WorkoutPlan) => (
                    <TableRow key={plan._id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/workouts/${plan._id}`}
                          className="hover:underline text-primary font-semibold"
                        >
                          {plan.name || 'Untitled Plan'}
                        </Link>
                        {plan.isTemplate && (
                          <span className="ml-2 bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 text-[10px] px-1.5 py-0.5 rounded font-semibold">
                            TEMPLATE
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DifficultyBadge difficulty={plan.difficulty} />
                      </TableCell>
                      <TableCell className="capitalize">{plan.splitType || '—'}</TableCell>
                      <TableCell>{plan.duration || '—'}</TableCell>
                      <TableCell>{plan.assignedUsers?.length ?? 0}</TableCell>
                      <TableCell>
                        <PlanStatusBadge status={plan.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {plan.createdAt
                          ? new Date(plan.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/workouts/${plan._id}`}>View/Edit</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function PlansPage() {
  return (
    <Suspense fallback={<div className="flex-1 p-8 pt-6 text-muted-foreground text-sm">Loading plans...</div>}>
      <PlansContent />
    </Suspense>
  )
}
