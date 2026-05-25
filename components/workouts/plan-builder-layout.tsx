'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { IconArrowLeft, IconDeviceFloppy, IconPlayerPlay, IconLoader2 } from '@tabler/icons-react'
import { useWorkoutStore } from '@/stores/workout-store'
import { PlanConfigPanel } from '@/components/workouts/plan-config-panel'
import { DayBuilderPanel } from '@/components/workouts/day-builder-panel'
import { MobilePreviewPanel } from '@/components/workouts/mobile-preview-panel'
import { AssignUsersDialog } from '@/components/workouts/assign-users-dialog'
import {
  useCreateWorkoutPlan,
  useUpdateWorkoutPlan,
  useAssignPlanUsers,
} from '@/hooks/use-workout-plans'
import { toast } from 'sonner'
import type { WorkoutPlan } from '@/types/workout'
import { useState } from 'react'

export function PlanBuilderLayout({
  mode,
  plan,
}: {
  mode: 'create' | 'edit'
  plan?: WorkoutPlan
}) {
  const router = useRouter()
  const {
    loadPlan,
    resetPlan,
    currentPlan,
    setPlanField,
    getPlanPayload,
    getUpdatePayload,
    assignedUserIds,
    assignmentStartDate,
  } = useWorkoutStore()
  const [assignOpen, setAssignOpen] = useState(false)

  const createMutation = useCreateWorkoutPlan()
  const updateMutation = useUpdateWorkoutPlan()
  const assignMutation = useAssignPlanUsers()
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
      userIds: assignedUserIds,
      startDate: new Date(assignmentStartDate).toISOString(),
    })
  }

  const handleSave = () => {
    if (!currentPlan.name?.trim()) {
      toast.error('Please enter a plan name')
      return
    }

    if (mode === 'create') {
      createMutation.mutate(getPlanPayload(), {
        onSuccess: (saved) => {
          assignAfterCreate(saved._id)
          router.push(`/dashboard/workouts/${saved._id}`)
        },
      })
    } else if (plan?._id) {
      updateMutation.mutate({ id: plan._id, payload: getUpdatePayload() })
    }
  }

  const handlePublish = () => {
    setPlanField('status', 'Published')

    if (mode === 'create') {
      const payload = { ...getPlanPayload(), status: 'Published' as const }
      createMutation.mutate(payload, {
        onSuccess: (saved) => {
          assignAfterCreate(saved._id)
          router.push(`/dashboard/workouts/${saved._id}`)
        },
      })
    } else if (plan?._id) {
      const payload = { ...getUpdatePayload(), status: 'Published' as const }
      updateMutation.mutate({ id: plan._id, payload })
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
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <IconLoader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <IconDeviceFloppy className="w-3.5 h-3.5 mr-1" />
            )}
            Save Draft
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

      <AssignUsersDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        planId={mode === 'edit' ? plan?._id : undefined}
      />
    </div>
  )
}
