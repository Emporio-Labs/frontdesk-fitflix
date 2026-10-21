'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { IconArrowLeft, IconDeviceFloppy, IconPlayerPlay, IconLoader2 } from '@tabler/icons-react'
import { useWorkoutStore } from '@/stores/workout-store'
import { PlanConfigPanel } from '@/components/workouts/plan-config-panel'
import { DayBuilderPanel } from '@/components/workouts/day-builder-panel'
import { MobilePreviewPanel } from '@/components/workouts/mobile-preview-panel'
import { AssignUsersDialog } from '@/components/workouts/assign-users-dialog'
import {
  useCreateWorkoutPlan,
  useUpdateWorkoutPlan,
  useAssignWorkoutPlan,
} from '@/hooks/use-workout-plans'
import { toast } from 'sonner'
import type { WorkoutPlan } from '@/types/workout'
import type { CreateWorkoutPlanPayload } from '@/lib/services/workout-plan.service'

const isMongoId = (id?: string): boolean => !!id && /^[0-9a-f]{24}$/i.test(id)

// 'Published' is a legacy status that only ever existed client-side — the backend
// PlanStatus enum has never accepted it. Drafts persisted in localStorage by older
// builds can still carry it, so normalise before it reaches the API.
const toApiStatus = (status?: string): string | undefined =>
  status === 'Published' ? 'Active' : status

function buildApiPayload(plan: Partial<WorkoutPlan>, statusOverride?: string): CreateWorkoutPlanPayload {
  return {
    name: plan.name || 'Untitled Plan',
    description: plan.description ?? undefined,
    difficulty: plan.difficulty || 'Intermediate',
    duration: plan.duration || 4,
    goal: plan.goal || 'Custom',
    splitType: plan.splitType,
    status: statusOverride ?? toApiStatus(plan.status),
    isTemplate: plan.isTemplate,
    templateCategory: plan.templateCategory ?? undefined,
    days: (plan.days || []).map((day) => ({
      dayNumber: day.dayNumber,
      name: day.name,
      isRestDay: day.isRestDay,
      exercises: day.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        orderIndex: ex.orderIndex,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        targetWeightKg: ex.targetWeightKg,
        restSeconds: ex.restSeconds,
        section: ex.section,
        durationSeconds: ex.durationSeconds,
        notes: ex.notes,
      })),
    })),
  }
}

export function PlanBuilderLayout({
  mode,
  plan,
}: {
  mode: 'create' | 'edit'
  plan?: WorkoutPlan
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const {
    loadPlan,
    resetPlan,
    currentPlan,
    setPlanField,
    savePlan,
    assignedUserIds,
    assignmentStartDate,
  } = useWorkoutStore()
  const [assignOpen, setAssignOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<'plan' | 'days' | 'preview'>('days')
  const createMutation = useCreateWorkoutPlan()
  const updateMutation = useUpdateWorkoutPlan()
  const assignMutation = useAssignWorkoutPlan()
  const isSaving = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (mode === 'edit' && plan) {
      loadPlan(plan)
    } else if (mode === 'create') {
      resetPlan()
    }
  }, [mode, plan?._id])

  const assignAfterCreate = (savedId: string) => {
    if (assignedUserIds.length === 0) return
    assignMutation.mutate({
      id: savedId,
      payload: {
        userIds: assignedUserIds,
        startDate: new Date(assignmentStartDate).toISOString(),
      },
    })
  }

  const handleSave = async () => {
    if (!currentPlan.name?.trim()) {
      toast.error('Please enter a plan name')
      return
    }

    const payload = buildApiPayload(currentPlan)
    const id = currentPlan._id || currentPlan.id
    try {
      if (isMongoId(id)) {
        await updateMutation.mutateAsync({ id: id!, payload })
        savePlan()
        toast.success('Draft saved successfully')
      } else {
        const result = await createMutation.mutateAsync(payload)
        const savedId = (result as any)._id ?? result.id
        setPlanField('_id', savedId)
        setPlanField('id', savedId)
        savePlan()
        assignAfterCreate(savedId)
        router.push(`/dashboard/workouts/${savedId}`)
      }
    } catch {
      // errors surfaced via mutation's onError toast
    }
  }

  const handlePublish = async () => {
    if (!currentPlan.name?.trim()) {
      toast.error('Please enter a plan name')
      return
    }
    const payload = buildApiPayload(currentPlan, 'Active')
    const id = currentPlan._id || currentPlan.id
    try {
      if (isMongoId(id)) {
        await updateMutation.mutateAsync({ id: id!, payload })
        setPlanField('status', 'Active')
        savePlan()
        toast.success('Plan published successfully')
      } else {
        const result = await createMutation.mutateAsync(payload)
        const savedId = (result as any)._id ?? result.id
        setPlanField('_id', savedId)
        setPlanField('id', savedId)
        setPlanField('status', 'Active')
        savePlan()
        assignAfterCreate(savedId)
        router.push(`/dashboard/workouts/${savedId}`)
      }
    } catch {
      // errors surfaced via mutation's onError toast
    }
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Toolbar */}
      <div className="border-b px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/dashboard/workouts">
              <IconArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">
              {mode === 'create' ? 'New Workout Plan' : currentPlan.name || 'Edit Plan'}
            </h3>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              {mode === 'create' ? 'Design a new workout plan' : 'Editing plan'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-2.5 sm:px-3"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <IconLoader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <IconDeviceFloppy className="w-3.5 h-3.5 mr-1" />
            )}
            <span className="sm:hidden">Save</span>
            <span className="hidden sm:inline">Save Draft</span>
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handlePublish}
            disabled={isSaving}
          >
            {isSaving ? (
              <IconLoader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <IconPlayerPlay className="w-3.5 h-3.5 mr-1" />
            )}
            Publish
          </Button>
        </div>
      </div>

      {isMobile ? (
        // Phones: one panel at a time behind a segmented switcher
        <>
          <div className="grid grid-cols-3 gap-1 p-1 m-2 rounded-lg bg-muted shrink-0">
            {(
              [
                ['plan', 'Plan'],
                ['days', 'Exercises'],
                ['preview', 'Preview'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMobileTab(key)}
                className={cn(
                  'h-8 rounded-md text-xs font-medium transition-colors',
                  mobileTab === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0">
            {mobileTab === 'plan' && <PlanConfigPanel onOpenAssign={() => setAssignOpen(true)} />}
            {mobileTab === 'days' && <DayBuilderPanel />}
            {mobileTab === 'preview' && <MobilePreviewPanel />}
          </div>
        </>
      ) : (
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={25} minSize={18} maxSize={35}>
          <PlanConfigPanel onOpenAssign={() => setAssignOpen(true)} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={45} minSize={30}>
          <DayBuilderPanel />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={30} minSize={20}>
          <MobilePreviewPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
      )}

      <AssignUsersDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        planId={mode === 'edit' ? plan?._id : undefined}
      />
    </div>
  )
}
