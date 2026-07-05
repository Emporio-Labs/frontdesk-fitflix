'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  IconChevronLeft,
  IconPlus,
  IconSearch,
  IconTemplate,
} from '@tabler/icons-react'
import { EmptyState } from '@/components/empty-state'
import { useWorkoutStore } from '@/stores/workout-store'
import {
  useWorkoutPlans,
  useDuplicateWorkoutPlan,
  useDeleteWorkoutPlan,
} from '@/hooks/use-workout-plans'
import { TemplateCard } from '@/components/workouts/template-card'
import { TemplateCategoryFilter } from '@/components/workouts/template-category-filter'
import { AssignUsersDialog } from '@/components/workouts/assign-users-dialog'
import type { WorkoutPlan } from '@/types/workout'

export default function TemplatesPage() {
  const router = useRouter()
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [assignPlanId, setAssignPlanId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkoutPlan | null>(null)

  const setAssignedUsers = useWorkoutStore((s) => s.setAssignedUsers)
  const { data: plansData, isLoading, isError, refetch } = useWorkoutPlans({
    isTemplate: true,
    limit: 100,
  })
  const duplicateMutation = useDuplicateWorkoutPlan()
  const deleteMutation = useDeleteWorkoutPlan()

  const templates = plansData?.plans ?? []

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory =
        category === 'All' ||
        t.templateCategory?.toLowerCase() === category.toLowerCase() ||
        t.goal
          ?.replace(/([A-Z])/g, ' $1')
          .trim()
          .toLowerCase()
          .includes(category.toLowerCase())
      return matchesSearch && matchesCategory
    })
  }, [templates, search, category])

  const handleUseTemplate = (template: WorkoutPlan) => {
    // Start with a clean member selection — assignment clones the plan
    // server-side, so the template itself is never modified.
    setAssignedUsers([])
    setAssignPlanId(template._id)
  }

  const handleDuplicate = async (template: WorkoutPlan) => {
    try {
      const copy = await duplicateMutation.mutateAsync(template._id)
      router.push(`/dashboard/workouts/${(copy as any)._id ?? copy.id}`)
    } catch {
      // error toast handled by the mutation
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget._id)
    } finally {
      setDeleteTarget(null)
    }
  }

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
            <span className="text-xs text-muted-foreground">Workouts / Templates</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Workout Templates</h2>
          <p className="text-muted-foreground text-sm">
            Reusable workout plans — assign them to any member, as many times as you need
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/workouts/create">
            <IconPlus className="mr-2 h-4 w-4" />
            Create Plan
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <TemplateCategoryFilter value={category} onValueChange={setCategory} />
      </div>

      {isError ? (
        <div className="text-center py-16 text-sm text-red-500">
          Failed to load templates.
          <button className="underline ml-1" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconTemplate className="w-10 h-10" />}
          title={templates.length === 0 ? 'No templates yet' : 'No matching templates'}
          description={
            templates.length === 0
              ? 'Create a workout plan and switch on "Save as Template" to make it reusable here.'
              : 'Try a different search term or category filter.'
          }
          action={
            templates.length === 0 ? (
              <Button asChild size="sm">
                <Link href="/dashboard/workouts/create">
                  <IconPlus className="mr-2 h-4 w-4" />
                  Create Plan
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <TemplateCard
              key={template._id}
              template={template}
              onUseTemplate={() => handleUseTemplate(template)}
              onDuplicate={() => handleDuplicate(template)}
              onDelete={() => setDeleteTarget(template)}
            />
          ))}
        </div>
      )}

      <AssignUsersDialog
        open={!!assignPlanId}
        onOpenChange={(open) => {
          if (!open) setAssignPlanId(null)
        }}
        planId={assignPlanId ?? undefined}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently removed. Members already assigned keep
              their own copy of the workout, but the template will no longer be reusable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
