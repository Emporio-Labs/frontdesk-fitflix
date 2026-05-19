'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { SkeletonTable } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import { FoodForm } from '@/components/nutrition/food-form'
import {
  IconApple,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react'
import { useFoods, useDeleteFood } from '@/hooks/use-nutrition'
import { useCanAccess } from '@/hooks/use-auth'
import type { FoodItem } from '@/lib/types/nutrition'

export default function FoodCatalogPage() {
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FoodItem | null>(null)

  const { data: foods = [], isLoading, isError, refetch } = useFoods(search || undefined)
  const deleteFood = useDeleteFood()

  const canCreate = useCanAccess('nutrition', 'create')
  const canUpdate = useCanAccess('nutrition', 'update')
  const canDelete = useCanAccess('nutrition', 'delete')

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (food: FoodItem) => {
    setEditing(food)
    setDialogOpen(true)
  }
  const handleDelete = (food: FoodItem) => {
    if (confirm(`Delete "${food.name}" from the food catalog?`)) {
      deleteFood.mutate(food._id)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Food Catalog</h2>
          <p className="text-muted-foreground">
            Reusable foods with per-serving macros for nutrition templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <IconRefresh className="w-4 h-4" />
          </Button>
          {canCreate && (
            <Button onClick={openCreate}>
              <IconPlus className="w-4 h-4 mr-2" />
              Add Food
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foods</CardTitle>
          <Input
            placeholder="Search foods…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm mt-2"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable />
          ) : isError ? (
            <div className="text-center py-8 text-red-500">
              Failed to load food catalog.{' '}
              <button className="underline" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : foods.length === 0 ? (
            <EmptyState
              icon={<IconApple className="w-10 h-10" />}
              title="No foods yet"
              description="Add foods to build reusable nutrition templates."
              action={
                canCreate ? (
                  <Button onClick={openCreate}>
                    <IconPlus className="w-4 h-4 mr-2" />
                    Add Food
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Serving</TableHead>
                    <TableHead>Cal</TableHead>
                    <TableHead>P</TableHead>
                    <TableHead>C</TableHead>
                    <TableHead>F</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {foods.map((food) => (
                    <TableRow key={food._id}>
                      <TableCell className="font-medium">{food.name}</TableCell>
                      <TableCell>{food.category || '—'}</TableCell>
                      <TableCell>
                        {food.servingSize} {food.unit}
                      </TableCell>
                      <TableCell>{food.calories}</TableCell>
                      <TableCell>{food.protein}g</TableCell>
                      <TableCell>{food.carbs}g</TableCell>
                      <TableCell>{food.fat}g</TableCell>
                      <TableCell className="text-right space-x-2">
                        {canUpdate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(food)}
                          >
                            <IconEdit className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500"
                            onClick={() => handleDelete(food)}
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

      <FoodForm open={dialogOpen} onOpenChange={setDialogOpen} food={editing} />
    </div>
  )
}
