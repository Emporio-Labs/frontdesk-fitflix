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

  useEffect(() => {
    if (mode === 'edit' && plan) {
      loadPlan(plan)
    } else if (mode === 'create') {
      resetPlan()
    }
  }, [mode, plan?.id])

  const handleSave = () => {
    if (!currentPlan.name?.trim()) {
      toast.error('Please enter a plan name')
      return
    }
    const saved = savePlan()
    toast.success(mode === 'create' ? 'Plan created!' : 'Plan updated!')
    if (mode === 'create') {
      router.push(`/dashboard/workouts/${saved.id}`)
    }
  }

  const handlePublish = () => {
    setPlanField('status', 'active')
    setTimeout(() => {
      const saved = savePlan()
      toast.success('Plan published!')
      if (mode === 'create') {
        router.push(`/dashboard/workouts/${saved.id}`)
      }
    }, 0)
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
