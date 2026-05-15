'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IconPlus, IconMoodEmpty } from '@tabler/icons-react'
import { useWorkoutStore } from '@/stores/workout-store'
import { DayTabBar } from '@/components/workouts/day-tab-bar'
import { ExerciseCard } from '@/components/workouts/exercise-card'
import { ExerciseLibrarySidebar } from '@/components/workouts/exercise-library-sidebar'

export function DayBuilderPanel() {
  const [libraryOpen, setLibraryOpen] = useState(false)

  const {
    currentPlan,
    selectedDayIndex,
    updateExerciseInDay,
    removeExerciseFromDay,
    reorderExercisesInDay,
  } = useWorkoutStore()

  const days = currentPlan.days || []
  const currentDay = days[selectedDayIndex]
  const exercises = currentDay?.exercises || []

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = exercises.findIndex((e) => `exercise-${e.orderIndex}` === active.id)
    const newIndex = exercises.findIndex((e) => `exercise-${e.orderIndex}` === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderExercisesInDay(selectedDayIndex, oldIndex, newIndex)
    }
  }

  if (days.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <IconMoodEmpty className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No days added yet</p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Add your first training day to get started
          </p>
          <Button size="sm" onClick={() => useWorkoutStore.getState().addDay()}>
            <IconPlus className="w-4 h-4 mr-1" />
            Add First Day
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <DayTabBar />

      {currentDay?.isRestDay ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <span className="text-4xl mb-3">🛌</span>
          <p className="text-sm font-medium">Rest Day</p>
          <p className="text-xs text-muted-foreground mt-1">
            Recovery is essential for muscle growth
          </p>
        </div>
      ) : (
        <>
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setLibraryOpen(true)}
            >
              <IconPlus className="w-3.5 h-3.5 mr-1" />
              Add Exercise
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {exercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    No exercises yet
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLibraryOpen(true)}
                  >
                    Browse Exercise Library
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={exercises.map((e) => `exercise-${e.orderIndex}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {exercises.map((ex, i) => (
                      <ExerciseCard
                        key={`exercise-${ex.orderIndex}`}
                        exercise={ex}
                        index={i}
                        onUpdate={(idx, updates) =>
                          updateExerciseInDay(selectedDayIndex, idx, updates)
                        }
                        onRemove={(idx) =>
                          removeExerciseFromDay(selectedDayIndex, idx)
                        }
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </ScrollArea>
        </>
      )}

      <ExerciseLibrarySidebar open={libraryOpen} onOpenChange={setLibraryOpen} />
    </div>
  )
}
