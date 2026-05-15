'use client'

import { PhoneFrame } from '@/components/workouts/phone-frame'
import { PreviewDayView } from '@/components/workouts/preview-day-view'
import { useWorkoutStore } from '@/stores/workout-store'

export function MobilePreviewPanel() {
  const { currentPlan, selectedDayIndex } = useWorkoutStore()
  const days = currentPlan.days || []
  const currentDay = days[selectedDayIndex]

  return (
    <div className="h-full bg-muted/30 overflow-hidden">
      <div className="px-3 py-2 border-b">
        <span className="text-xs font-medium text-muted-foreground">Mobile Preview</span>
      </div>
      <PhoneFrame>
        <PreviewDayView day={currentDay} planName={currentPlan.name || ''} />
      </PhoneFrame>
    </div>
  )
}
