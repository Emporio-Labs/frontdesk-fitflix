'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconPlus, IconSearch, IconLock, IconInfoCircle, IconCheck } from '@tabler/icons-react'
import { toast } from 'sonner'
import { useExercises } from '@/hooks/use-exercises'
import { useWorkoutStore } from '@/stores/workout-store'
import { MuscleGroupIcon } from '@/components/workouts/muscle-group-icon'
import { ExerciseDetailsDialog } from '@/components/workouts/exercise-details-dialog'
import { MUSCLE_GROUPS, DIFFICULTIES } from '@/types/workout'
import type { Exercise, MuscleGroup, Difficulty, ExerciseType, WorkoutSection } from '@/types/workout'

type CategoryTab = 'all' | 'workout' | 'stretching' | 'warmup'

const CATEGORY_TABS: { label: string; value: CategoryTab; exerciseType?: ExerciseType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Workout', value: 'workout', exerciseType: 'Main' },
  { label: 'Stretching', value: 'stretching', exerciseType: 'Stretching' },
  { label: 'Warmup', value: 'warmup', exerciseType: 'Warmup' },
]

function sectionToCategory(section?: WorkoutSection): CategoryTab {
  if (section === 'stretching') return 'stretching'
  if (section === 'warmup') return 'warmup'
  if (section === 'workout') return 'workout'
  return 'all'
}

// Centered picker: the dialog stays open so several exercises can be added in
// one go (like adding items to a cart); "Done" closes it.
export function ExerciseLibraryDialog({
  open,
  onOpenChange,
  targetSection,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetSection?: WorkoutSection
}) {
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all')
  const [activeTab, setActiveTab] = useState<CategoryTab>(() => sectionToCategory(targetSection))
  const [addedCounts, setAddedCounts] = useState<Record<string, number>>({})

  const { addExerciseToDay, selectedDayIndex, currentPlan } = useWorkoutStore()
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null)

  // The dialog stays mounted between opens, so re-sync the tab with the section
  useEffect(() => {
    setActiveTab(sectionToCategory(targetSection))
  }, [targetSection])

  // Reset search, filters and the added tally when the dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('')
      setMuscleFilter('all')
      setDifficultyFilter('all')
      setAddedCounts({})
    }
  }, [open])

  // Lock to the section type when opened from a specific section button
  const locked = targetSection !== undefined
  const activeTabDef = CATEGORY_TABS.find((t) => t.value === activeTab)

  const { data, isLoading, isError } = useExercises({
    search: search || undefined,
    muscleGroup: muscleFilter !== 'all' ? muscleFilter : undefined,
    difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
    exerciseType: activeTabDef?.exerciseType,
    limit: 50,
  })

  const exercises = data?.exercises ?? []
  const totalAdded = Object.values(addedCounts).reduce((a, b) => a + b, 0)
  const dayName = currentPlan.days?.[selectedDayIndex]?.name

  // Auto-route to the matching section based on exerciseType when no targetSection
  const handleAdd = (exercise: Exercise) => {
    if (!currentPlan.days?.[selectedDayIndex]) {
      toast.error('Add a day to the plan before adding exercises')
      return
    }
    const section: WorkoutSection =
      targetSection ??
      (exercise.exerciseType === 'Warmup'
        ? 'warmup'
        : exercise.exerciseType === 'Stretching'
        ? 'stretching'
        : 'workout')
    addExerciseToDay(selectedDayIndex, exercise, section)
    setAddedCounts((c) => ({ ...c, [exercise._id]: (c[exercise._id] ?? 0) + 1 }))
    toast.success(`${exercise.name} added to ${section}`)
  }

  const sectionLabel =
    targetSection === 'warmup'
      ? 'Warmup'
      : targetSection === 'stretching'
      ? 'Stretching'
      : targetSection === 'workout'
      ? 'Workout'
      : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-0 sm:p-0 gap-0 flex flex-col h-[85vh] overflow-hidden">
          <DialogHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <DialogTitle>Exercise Library</DialogTitle>
            <DialogDescription>
              {dayName ? `Adding to ${dayName}` : 'Pick exercises to add'}
              {sectionLabel && ` · ${sectionLabel} section`}
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 sm:px-5 pb-3 space-y-3 border-b">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {locked ? (
                <div className="flex items-center gap-1.5 text-xs flex-1">
                  <IconLock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Showing {sectionLabel} exercises only
                  </span>
                </div>
              ) : (
                <div className="flex gap-1.5 flex-wrap flex-1">
                  {CATEGORY_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        activeTab === tab.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 sm:w-[320px]">
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
          </div>

          {/* Plain overflow container: Radix ScrollArea's table-layout viewport
              let long rows grow past the panel and pushed the add button off-screen. */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
                ))}
              </div>
            ) : isError ? (
              <p className="text-sm text-destructive text-center py-8">
                Failed to load exercises. Check your connection and try again.
              </p>
            ) : exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No exercises found. Try adjusting your filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {exercises.map((ex) => (
                  <ExerciseCard
                    key={ex._id}
                    exercise={ex}
                    addedCount={addedCounts[ex._id] ?? 0}
                    onAdd={handleAdd}
                    onView={setViewingExercise}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="px-4 sm:px-5 py-3 border-t flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {totalAdded > 0
                ? `${totalAdded} exercise${totalAdded !== 1 ? 's' : ''} added`
                : data?.pagination
                ? `Showing ${exercises.length} of ${data.pagination.total} exercises`
                : ''}
            </span>
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ExerciseDetailsDialog
        open={!!viewingExercise}
        onOpenChange={(o) => !o && setViewingExercise(null)}
        exercise={viewingExercise}
      />
    </>
  )
}

function ExerciseCard({
  exercise,
  addedCount,
  onAdd,
  onView,
}: {
  exercise: Exercise
  addedCount: number
  onAdd: (ex: Exercise) => void
  onView: (ex: Exercise) => void
}) {
  const added = addedCount > 0
  const meta = [exercise.muscleGroups?.join(', '), exercise.difficulty, exercise.equipment]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-lg border min-w-0 transition-colors ${
        added ? 'border-primary/50 bg-primary/5' : 'hover:bg-muted/50'
      }`}
    >
      <div className="relative flex items-center justify-center w-11 h-11 rounded-md bg-muted flex-shrink-0 overflow-hidden">
        <MuscleGroupIcon group={exercise.muscleGroups?.[0] || 'Chest'} className="w-5 h-5" />
        {exercise.imageUrl && (
          <img
            src={exercise.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={exercise.name}>{exercise.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{meta}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onView(exercise)}
          aria-label={`View ${exercise.name}`}
        >
          <IconInfoCircle className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={added ? 'default' : 'outline'}
          className="h-8 px-2.5 text-xs"
          onClick={() => onAdd(exercise)}
          aria-label={`Add ${exercise.name}`}
        >
          {added ? (
            <>
              <IconCheck className="w-3.5 h-3.5 mr-1" />
              {addedCount > 1 ? `×${addedCount}` : 'Added'}
            </>
          ) : (
            <>
              <IconPlus className="w-3.5 h-3.5 mr-1" />
              Add
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
