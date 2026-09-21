'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { IconAlertTriangle, IconGripVertical, IconLoader2, IconTrash } from '@tabler/icons-react'
import { MuscleGroupIcon } from '@/components/workouts/muscle-group-icon'
import { ExerciseDetailsDialog } from '@/components/workouts/exercise-details-dialog'
import { useExercise } from '@/hooks/use-exercises'
import type { WorkoutExercise, MuscleGroup } from '@/types/workout'

export function ExerciseCard({
  exercise,
  index,
  onUpdate,
  onRemove,
}: {
  exercise: WorkoutExercise
  index: number
  onUpdate: (index: number, updates: Partial<WorkoutExercise>) => void
  onRemove: (index: number) => void
}) {
  // Either the backend flagged the reference as dangling, or populate() left no
  // nested exercise at all — both mean the library row is gone.
  const isMissing = exercise.exerciseMissing === true || !exercise.exercise
  const sortableId = `exercise-${exercise.orderIndex}`
  const [infoOpen, setInfoOpen] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group"
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <IconGripVertical className="w-4 h-4" />
      </button>

      {/* Icon + name open the full exercise details */}
      <button
        type="button"
        disabled={isMissing}
        onClick={() => setInfoOpen(true)}
        className="flex items-center gap-2 flex-1 min-w-0 text-left rounded-md -m-1 p-1 enabled:cursor-pointer enabled:hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={isMissing ? undefined : 'View exercise details'}
      >
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 ${
          isMissing ? 'bg-destructive/10' : 'bg-muted'
        }`}
      >
        {isMissing ? (
          <IconAlertTriangle className="w-4 h-4 text-destructive" />
        ) : (
          <MuscleGroupIcon
            group={(exercise.exercise?.muscleGroup as MuscleGroup) ?? 'Chest'}
            className="w-4 h-4"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isMissing ? 'text-destructive' : ''
          }`}
        >
          {exercise.exercise?.name ?? 'Deleted exercise'}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {isMissing
            ? 'No longer in the library — remove it or pick a replacement'
            : [exercise.exercise?.muscleGroup, exercise.exercise?.equipment]
                .filter(Boolean)
                .join(' · ')}
        </p>
      </div>
      </button>

      <div className="flex items-center gap-1.5">
        <InlineInput
          label="Sets"
          value={exercise.targetSets}
          onChange={(v) => onUpdate(index, { targetSets: v })}
        />
        <span className="text-muted-foreground text-xs">×</span>
        <InlineInput
          label="Reps"
          value={exercise.targetReps}
          onChange={(v) => onUpdate(index, { targetReps: v })}
        />
        <InlineInput
          label="kg"
          value={exercise.targetWeightKg}
          onChange={(v) => onUpdate(index, { targetWeightKg: v })}
        />
        <InlineInput
          label="rest"
          value={exercise.restSeconds}
          onChange={(v) => onUpdate(index, { restSeconds: v })}
          suffix="s"
        />
      </div>

      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
        onClick={() => onRemove(index)}
      >
        <IconTrash className="w-3.5 h-3.5" />
      </Button>

      {infoOpen && (
        <PlanExerciseDetails
          exerciseId={exercise.exerciseId}
          onClose={() => setInfoOpen(false)}
        />
      )}
    </div>
  )
}

// Plan rows only carry a trimmed exercise summary, so fetch the full library
// record (images, instructions, tips) when the details are opened.
function PlanExerciseDetails({
  exerciseId,
  onClose,
}: {
  exerciseId: string
  onClose: () => void
}) {
  const { data, isLoading, isError } = useExercise(exerciseId)

  if (data) {
    return <ExerciseDetailsDialog open onOpenChange={(o) => !o && onClose()} exercise={data} />
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="sr-only">Exercise details</DialogTitle>
        <DialogDescription className="text-sm text-center py-6">
          {isLoading ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <IconLoader2 className="w-4 h-4 animate-spin" /> Loading exercise…
            </span>
          ) : isError ? (
            <span className="text-destructive">Couldn&apos;t load this exercise.</span>
          ) : null}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  )
}

function InlineInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
        {label}
      </span>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-14 h-7 text-center text-xs px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  )
}
