'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconPlus, IconSearch } from '@tabler/icons-react'
import { useExercises } from '@/hooks/use-exercises'
import { useWorkoutStore } from '@/stores/workout-store'
import { MuscleGroupIcon } from '@/components/workouts/muscle-group-icon'
import { DifficultyBadge } from '@/components/workouts/difficulty-badge'
import { MUSCLE_GROUPS, DIFFICULTIES } from '@/types/workout'
import type { Exercise, MuscleGroup, Difficulty } from '@/types/workout'

export function ExerciseLibrarySidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all')

  const { addExerciseToDay, selectedDayIndex } = useWorkoutStore()

  const { data, isLoading } = useExercises({
    search: search || undefined,
    muscleGroup: muscleFilter !== 'all' ? muscleFilter : undefined,
    difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
    limit: 50,
  })

  const exercises = data?.exercises ?? []

  const handleAdd = (exercise: Exercise) => {
    addExerciseToDay(selectedDayIndex, exercise)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>Exercise Library</SheetTitle>
        </SheetHeader>

        <div className="px-4 py-3 space-y-3 border-b">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={muscleFilter}
              onValueChange={(v) => setMuscleFilter(v as MuscleGroup | 'all')}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Muscle Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Muscles</SelectItem>
                {MUSCLE_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={difficultyFilter}
              onValueChange={(v) => setDifficultyFilter(v as Difficulty | 'all')}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No exercises found. Try adjusting your filters.
              </p>
            ) : (
              exercises.map((ex) => (
                <ExerciseRow key={ex._id} exercise={ex} onAdd={handleAdd} />
              ))
            )}
          </div>
        </ScrollArea>

        {data?.pagination && (
          <div className="px-4 py-2 border-t text-xs text-muted-foreground text-center">
            Showing {exercises.length} of {data.pagination.total} exercises
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function ExerciseRow({
  exercise,
  onAdd,
}: {
  exercise: Exercise
  onAdd: (ex: Exercise) => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted">
        <MuscleGroupIcon group={exercise.muscleGroup} className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{exercise.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{exercise.muscleGroup}</span>
          {exercise.equipment && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground truncate">
                {exercise.equipment}
              </span>
            </>
          )}
          {exercise.caloriesPerSet > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">
                {exercise.caloriesPerSet} cal/set
              </span>
            </>
          )}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onAdd(exercise)}
      >
        <IconPlus className="w-4 h-4" />
      </Button>
    </div>
  )
}
