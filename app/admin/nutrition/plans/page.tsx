'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SkeletonTable } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import { NutritionStatusCell } from '@/components/nutrition/nutrition-status-cell'
import { AssignPlanForm } from '@/components/nutrition/assign-plan-form'
import {
  IconClipboardList,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react'
import { useNutritionPlans, useDeletePlan } from '@/hooks/use-nutrition'
import { useCanAccess } from '@/hooks/use-auth'
import type { UserNutritionPlan } from '@/lib/types/nutrition'

export default function NutritionPlansPage() {
  const [assignOpen, setAssignOpen] = useState(false)
  const { data: plans = [], isLoading, isError, refetch } = useNutritionPlans()
  const deletePlan = useDeletePlan()
  const canCreate = useCanAccess('nutrition', 'create')
  const canDelete = useCanAccess('nutrition', 'delete')

  const handleDelete = (p: UserNutritionPlan) => {
    if (confirm(`Remove plan "${p.name}" from ${p.userName ?? 'member'}?`)) {
      deletePlan.mutate(p._id)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assigned Plans</h2>
          <p className="text-muted-foreground">
            Nutrition plans assigned to members (deep-snapshotted from templates)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4" />
          </Button>
          {canCreate && (
            <Button onClick={() => setAssignOpen(true)}>
              <IconPlus className="w-4 h-4 mr-2" />
              Assign Plan
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : isError ? (
            <div className="text-center py-8 text-red-500">
              Failed to load plans.{' '}
              <button className="underline" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : plans.length === 0 ? (
            <EmptyState
              icon={<IconClipboardList className="w-10 h-10" />}
              title="No plans assigned"
              description="Assign a nutrition template to a member to get started."
              action={
                canCreate ? (
                  <Button onClick={() => setAssignOpen(true)}>
                    <IconPlus className="w-4 h-4 mr-2" />
                    Assign Plan
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="font-medium">
                        {p.userName ?? p.userId}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/nutrition/plans/${p._id}`}
                          className="hover:underline"
                        >
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {p.goal.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <NutritionStatusCell status={p.status} />
                      </TableCell>
                      <TableCell>
                        {p.startDate
                          ? new Date(p.startDate).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Link href={`/admin/nutrition/plans/${p._id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500"
                            onClick={() => handleDelete(p)}
                          >
                            <IconTrash className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AssignPlanForm open={assignOpen} onOpenChange={setAssignOpen} />
    </div>
  )
}
