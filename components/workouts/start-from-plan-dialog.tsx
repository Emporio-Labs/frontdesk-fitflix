'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useWorkoutPlans } from '@/hooks/use-workout-plans'
import { useCreateWorkoutSession } from '@/hooks/use-workouts'
import type { WorkoutPlan } from '@/types/workout'

export function StartFromPlanDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null)

  const { data: plansData } = useWorkoutPlans({ status: 'Published', limit: 100 })
  const createMutation = useCreateWorkoutSession()

  const plans = plansData?.plans ?? []
  const activePlans = plans.filter((p) => p.status === 'Published')

  const handleStart = () => {
    if (!selectedPlan) return

    createMutation.mutate(
      {
        planId: selectedPlan._id,
        date: new Date().toISOString(),
      },
      {
        onSuccess: (session) => {
          onOpenChange(false)
          setSelectedPlan(null)
          router.push(`/dashboard/workouts/session/${session._id}`)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Workout from Plan</DialogTitle>
          <DialogDescription>
            Select a plan to start a workout with its exercises
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] border rounded-md p-4">
          {activePlans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active plans available
            </p>
          ) : (
            <div className="space-y-2">
              {activePlans.map((plan) => (
                <button
                  key={plan._id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedPlan?._id === plan._id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.days.length} days · {plan.days.reduce((sum, d) => sum + d.exercises.length, 0)} exercises
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {plan.difficulty}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            disabled={!selectedPlan || createMutation.isPending}
          >
            {createMutation.isPending ? 'Starting...' : 'Start Workout'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
