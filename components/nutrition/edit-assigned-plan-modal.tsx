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
import { UserNutritionPlan } from '@/lib/types/nutrition'
import { TargetedMealEditor } from './targeted-meal-editor'
import { IconClipboardList, IconClockEdit } from '@tabler/icons-react'

interface EditAssignedPlanModalProps {
  plan: UserNutritionPlan | null
  onClose: () => void
}

export function EditAssignedPlanModal({ plan, onClose }: EditAssignedPlanModalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'select' | 'targeted'>('select')

  if (!plan) return null

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setMode('select')
      onClose()
    }
  }

  return (
    <Dialog open={!!plan} onOpenChange={handleOpenChange}>
      <DialogContent className={mode === 'targeted' ? 'max-w-2xl' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle>Edit Assigned Plan</DialogTitle>
          <DialogDescription>
            {mode === 'select' 
              ? 'How would you like to update this plan?'
              : `Updating specific meal for ${plan.name}`
            }
          </DialogDescription>
        </DialogHeader>

        {mode === 'select' ? (
          <div className="flex flex-col gap-4 py-4">
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 p-4"
              onClick={() => router.push(`/admin/nutrition/diet-plans/${plan._id}/edit`)}
            >
              <div className="flex items-center gap-2 font-semibold">
                <IconClipboardList className="h-5 w-5 text-primary" />
                Update Entire Plan
              </div>
              <div className="text-sm font-normal text-muted-foreground text-left whitespace-normal">
                Edit full nutrition structure, targets, and days
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 p-4"
              onClick={() => setMode('targeted')}
            >
              <div className="flex items-center gap-2 font-semibold">
                <IconClockEdit className="h-5 w-5 text-primary" />
                Update Specific Meal / Day
              </div>
              <div className="text-sm font-normal text-muted-foreground text-left whitespace-normal">
                Quickly adjust a single meal or schedule without affecting the rest
              </div>
            </Button>
          </div>
        ) : (
          <TargetedMealEditor
            plan={plan}
            onSuccess={() => handleOpenChange(false)}
            onCancel={() => setMode('select')}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
