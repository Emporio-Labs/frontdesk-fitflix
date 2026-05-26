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
import { IconArrowLeft, IconDeviceFloppy, IconPlayerPlay } from '@tabler/icons-react'
import { useWorkoutStore } from '@/stores/workout-store'
import { PlanConfigPanel } from '@/components/workouts/plan-config-panel'
import { DayBuilderPanel } from '@/components/workouts/day-builder-panel'
import { MobilePreviewPanel } from '@/components/workouts/mobile-preview-panel'
import { AssignUsersDialog } from '@/components/workouts/assign-users-dialog'
import { toast } from 'sonner'
import type { WorkoutPlan } from '@/types/workout'
import { useCreateWorkoutPlan, useUpdateWorkoutPlan } from '@/hooks/use-workout-plans'
import type { CreateWorkoutPlanPayload } from '@/lib/services/workout-plan.service'

const isMongoId = (id?: string): boolean => !!id && /^[0-9a-f]{24}$/i.test(id)

function buildApiPayload(plan: Partial<WorkoutPlan>, statusOverride?: string): CreateWorkoutPlanPayload {
  return {
    name: plan.name || 'Untitled Plan',
    description: plan.description ?? undefined,
    difficulty: plan.difficulty || 'Intermediate',
    duration: plan.duration || 4,
    goal: plan.goal || 'Custom',
    splitType: plan.splitType,
    status: statusOverride ?? plan.status,
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
  const { loadPlan, resetPlan, savePlan, currentPlan, setPlanField } = useWorkoutStore()
  const [assignOpen, setAssignOpen] = useState(false)
  const createPlanMutation = useCreateWorkoutPlan()
  const updatePlanMutation = useUpdateWorkoutPlan()

  useEffect(() => {
    if (mode === 'edit' && plan) {
      loadPlan(plan)
    } else if (mode === 'create') {
      resetPlan()
    }
  }, [mode, plan?.id])

  const handleSave = async () => {
    if (!currentPlan.name?.trim()) {
      toast.error('Please enter a plan name')
      return
    }
    const payload = buildApiPayload(currentPlan)
    try {
      if (isMongoId(currentPlan.id)) {
        await updatePlanMutation.mutateAsync({ id: currentPlan.id!, payload })
        savePlan()
      } else {
        const result = await createPlanMutation.mutateAsync(payload)
        // Store the real MongoDB _id so subsequent saves and assigns use it
        setPlanField('id', (result as any)._id ?? result.id)
        savePlan()
        router.push(`/dashboard/workouts/${(result as any)._id ?? result.id}`)
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
    try {
      if (isMongoId(currentPlan.id)) {
        await updatePlanMutation.mutateAsync({ id: currentPlan.id!, payload })
        setPlanField('status', 'Active')
        savePlan()
      } else {
        const result = await createPlanMutation.mutateAsync(payload)
        const mongoId = (result as any)._id ?? result.id
        setPlanField('id', mongoId)
        setPlanField('status', 'Active')
        savePlan()
        router.push(`/dashboard/workouts/${mongoId}`)
      }
    } catch {
      // errors surfaced via mutation's onError toast
    }
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Toolbar */}
      <div className="border-b px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/dashboard/workouts">
              <IconArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h3 className="text-sm font-semibold">
              {mode === 'create' ? 'New Workout Plan' : currentPlan.name || 'Edit Plan'}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {mode === 'create' ? 'Design a new workout plan' : 'Editing plan'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSave}>
            <IconDeviceFloppy className="w-3.5 h-3.5 mr-1" />
            Save Draft
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={handlePublish}>
            <IconPlayerPlay className="w-3.5 h-3.5 mr-1" />
            Publish
          </Button>
        </div>
      </div>

      {/* 3-Panel Layout */}
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

      <AssignUsersDialog open={assignOpen} onOpenChange={setAssignOpen} />
    </div>
  )
}
