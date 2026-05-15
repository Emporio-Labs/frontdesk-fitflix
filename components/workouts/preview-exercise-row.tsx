'use client'

import type { WorkoutExercise } from '@/types/workout'

const MUSCLE_COLORS: Record<string, string> = {
  Chest: 'bg-rose-500',
  Back: 'bg-blue-500',
  Legs: 'bg-emerald-500',
  Shoulders: 'bg-amber-500',
  Arms: 'bg-violet-500',
  Core: 'bg-teal-500',
}

export function PreviewExerciseRow({ exercise }: { exercise: WorkoutExercise }) {
  const color = MUSCLE_COLORS[exercise.exercise?.muscleGroup ?? ''] ?? 'bg-zinc-500'

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <span className="text-white text-[10px] font-bold">
          {(exercise.exercise?.muscleGroup ?? '?')[0]}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-[11px] font-medium truncate">
          {exercise.exercise?.name ?? 'Exercise'}
        </p>
        <p className="text-zinc-500 text-[9px]">
          {exercise.exercise?.equipment || 'No equipment'}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-white text-[11px] font-semibold">
          {exercise.targetSets}×{exercise.targetReps}
        </p>
        <p className="text-zinc-500 text-[9px]">{exercise.targetWeightKg}kg</p>
      </div>
    </div>
  )
}
