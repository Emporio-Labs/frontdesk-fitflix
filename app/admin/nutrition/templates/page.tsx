'use client'

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
import {
  IconToolsKitchen2,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react'
import { useNutritionTemplates, useDeleteTemplate } from '@/hooks/use-nutrition'
import { useCanAccess } from '@/hooks/use-auth'
import type { NutritionTemplate } from '@/lib/types/nutrition'

export default function TemplatesPage() {
  const { data: templates = [], isLoading, isError, refetch } = useNutritionTemplates()
  const deleteTemplate = useDeleteTemplate()
  const canCreate = useCanAccess('nutrition', 'create')
  const canDelete = useCanAccess('nutrition', 'delete')

  const handleDelete = (t: NutritionTemplate) => {
    if (confirm(`Delete template "${t.name}"?`)) deleteTemplate.mutate(t._id)
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nutrition Templates</h2>
          <p className="text-muted-foreground">
            Reusable meal plans assignable to members
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4" />
          </Button>
          {canCreate && (
            <Link href="/admin/nutrition/templates/create">
              <Button>
                <IconPlus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : isError ? (
            <div className="text-center py-8 text-red-500">
              Failed to load templates.{' '}
              <button className="underline" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={<IconToolsKitchen2 className="w-10 h-10" />}
              title="No templates yet"
              description="Create a reusable nutrition template to assign to members."
              action={
                canCreate ? (
                  <Link href="/admin/nutrition/templates/create">
                    <Button>
                      <IconPlus className="w-4 h-4 mr-2" />
                      New Template
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Meals</TableHead>
                    <TableHead>Calories</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/nutrition/templates/${t._id}`}
                          className="hover:underline"
                        >
                          {t.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {t.goal.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.meals?.length ?? 0}</TableCell>
                      <TableCell>{t.totalCalories} kcal</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Link href={`/admin/nutrition/templates/${t._id}`}>
                          <Button variant="outline" size="sm">
                            View / Edit
                          </Button>
                        </Link>
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500"
                            onClick={() => handleDelete(t)}
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
    </div>
  )
}
