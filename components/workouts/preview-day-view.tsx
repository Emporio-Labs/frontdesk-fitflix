'use client'

import { PreviewExerciseRow } from '@/components/workouts/preview-exercise-row'
import type { WorkoutDay } from '@/types/workout'

export function PreviewDayView({
  day,
  planName,
}: {
  day: WorkoutDay | undefined
  planName: string
}) {
  if (!day) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-600 text-xs">Add a day to preview</p>
      </div>
    )
  }

  if (day.isRestDay) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <span className="text-3xl mb-2">😴</span>
        <p className="text-white text-sm font-semibold">Rest Day</p>
        <p className="text-zinc-500 text-[10px] mt-1">
          Your muscles need time to recover and grow stronger
        </p>
      </div>
    )
  }

  const totalCalories = day.exercises.reduce(
    (sum, ex) => sum + (ex.exercise?.caloriesPerSet ?? 0) * ex.targetSets,
    0
  )
  const totalSets = day.exercises.reduce((sum, ex) => sum + ex.targetSets, 0)
  const estMinutes = Math.round(
    day.exercises.reduce(
      (sum, ex) => sum + ex.targetSets * (30 + ex.restSeconds),
      0
    ) / 60
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-10 pb-3">
        <p className="text-zinc-500 text-[9px] uppercase tracking-widest">{planName || 'Workout'}</p>
        <h3 className="text-white text-lg font-bold mt-0.5">{day.name}</h3>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-3 px-4 pb-3">
        <StatPill label="Exercises" value={String(day.exercises.length)} />
        <StatPill label="Sets" value={String(totalSets)} />
        <StatPill label="~Min" value={String(estMinutes)} />
        <StatPill label="Cal" value={String(totalCalories)} />
      </div>

      {/* Progress Ring */}
      <div className="flex items-center justify-center py-3">
        <div className="relative w-16 h-16">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#27272a"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray="0, 100"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">0%</span>
          </div>
        </div>
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto px-1">
        <div className="space-y-0.5">
          {day.exercises.map((ex, i) => (
            <PreviewExerciseRow key={i} exercise={ex} />
          ))}
        </div>
      </div>

      {/* Start Button */}
      <div className="px-4 py-3">
        <div className="w-full h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
          <span className="text-white text-xs font-semibold">Start Workout</span>
        </div>
      </div>
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center bg-zinc-900 rounded-lg px-3 py-1.5">
      <span className="text-white text-xs font-bold">{value}</span>
      <span className="text-zinc-500 text-[8px] uppercase tracking-wider">{label}</span>
    </div>
  )
}
