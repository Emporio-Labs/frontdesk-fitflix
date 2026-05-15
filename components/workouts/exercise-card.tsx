'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { IconGripVertical, IconTrash } from '@tabler/icons-react'
import { MuscleGroupIcon } from '@/components/workouts/muscle-group-icon'
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
  const sortableId = `exercise-${exercise.orderIndex}`
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

      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0">
        <MuscleGroupIcon
          group={(exercise.exercise?.muscleGroup as MuscleGroup) ?? 'Chest'}
          className="w-4 h-4"
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {exercise.exercise?.name ?? 'Unknown Exercise'}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {exercise.exercise?.muscleGroup}
          {exercise.exercise?.equipment ? ` · ${exercise.exercise.equipment}` : ''}
        </p>
      </div>

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
    </div>
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
