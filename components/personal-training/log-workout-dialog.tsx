'use client'

import { useEffect, useState } from 'react'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCompletePtBooking } from '@/hooks/use-personal-training'
import type { UnifiedBookingDto } from '@/lib/services/personal-training.service'

type ExerciseDraft = {
  name: string
  sets: number
  reps: number
  weight: number
  notes?: string
}

const emptyExercise: ExerciseDraft = { name: '', sets: 3, reps: 10, weight: 0, notes: '' }

interface LogWorkoutDialogProps {
  booking: UnifiedBookingDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: (booking: UnifiedBookingDto) => void
}

export function LogWorkoutDialog({
  booking,
  open,
  onOpenChange,
  onCompleted,
}: LogWorkoutDialogProps) {
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [exercises, setExercises] = useState<ExerciseDraft[]>([{ ...emptyExercise }])
  const completeBookingMutation = useCompletePtBooking()

  // Reset form when a new booking is opened.
  useEffect(() => {
    if (open) {
      setWorkoutNotes('')
      setExercises([{ ...emptyExercise }])
    }
  }, [open, booking?._id])

  const handleAddExercise = () => setExercises((prev) => [...prev, { ...emptyExercise }])

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleExerciseChange = (
    index: number,
    field: keyof ExerciseDraft,
    value: string | number
  ) => {
    setExercises((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value } as ExerciseDraft
      return next
    })
  }

  const handleSave = async () => {
    if (!booking) return
    const validExercises = exercises.filter((e) => e.name.trim().length > 0)
    const result = await completeBookingMutation.mutateAsync({
      bookingId: booking._id,
      data: { workoutNotes, exercisesCompleted: validExercises },
    })
    onOpenChange(false)
    onCompleted?.(result)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Workout & Complete Session</DialogTitle>
          <DialogDescription>
            Record exercises completed, sets, repetitions, and performance notes for the member&apos;s history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-sm font-medium">Session Overview Notes</label>
            <Textarea
              placeholder="e.g. Great intensity on compound lifts. Focused on eccentric control."
              value={workoutNotes}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">Exercises Completed</label>
              <Button size="sm" variant="ghost" onClick={handleAddExercise}>
                <IconPlus className="h-3.5 w-3.5 mr-1" />
                Add Exercise
              </Button>
            </div>

            {exercises.map((ex, idx) => (
              <div
                key={idx}
                className="grid grid-cols-4 sm:grid-cols-12 gap-2 items-end sm:items-center bg-muted/40 p-2.5 rounded-md"
              >
                <div className="col-span-4 sm:col-span-5">
                  <Input
                    placeholder="Exercise Name (e.g. Barbell Squat)"
                    value={ex.name}
                    onChange={(e) => handleExerciseChange(idx, 'name', e.target.value)}
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <span className="mb-0.5 block text-[10px] text-muted-foreground sm:hidden">Sets</span>
                  <Input
                    type="number"
                    aria-label="Sets"
                    placeholder="Sets"
                    value={ex.sets}
                    onChange={(e) => handleExerciseChange(idx, 'sets', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <span className="mb-0.5 block text-[10px] text-muted-foreground sm:hidden">Reps</span>
                  <Input
                    type="number"
                    aria-label="Reps"
                    placeholder="Reps"
                    value={ex.reps}
                    onChange={(e) => handleExerciseChange(idx, 'reps', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <span className="mb-0.5 block text-[10px] text-muted-foreground sm:hidden">Weight (kg)</span>
                  <Input
                    type="number"
                    aria-label="Weight (kg)"
                    placeholder="Weight (kg)"
                    value={ex.weight}
                    onChange={(e) => handleExerciseChange(idx, 'weight', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveExercise(idx)}
                    disabled={exercises.length === 1}
                    aria-label="Remove exercise"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={completeBookingMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={completeBookingMutation.isPending || !booking}
          >
            {completeBookingMutation.isPending ? 'Saving…' : 'Save & Complete Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
