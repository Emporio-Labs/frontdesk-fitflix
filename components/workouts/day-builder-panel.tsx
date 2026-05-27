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
import { Badge } from '@/components/ui/badge'
import { IconPlus, IconMoodEmpty, IconChevronDown } from '@tabler/icons-react'
import { useWorkoutStore } from '@/stores/workout-store'
import { DayTabBar } from '@/components/workouts/day-tab-bar'
import { ExerciseCard } from '@/components/workouts/exercise-card'
import { ExerciseLibrarySidebar } from '@/components/workouts/exercise-library-sidebar'
import type { WorkoutSection } from '@/types/workout'

const SECTIONS: Array<{ key: WorkoutSection; label: string; emoji: string }> = [
  { key: 'warmup', label: 'Warm Up', emoji: '🔥' },
  { key: 'workout', label: 'Workout', emoji: '💪' },
  { key: 'stretching', label: 'Stretching', emoji: '🧘' },
]

export function DayBuilderPanel() {
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [targetSection, setTargetSection] = useState<WorkoutSection | undefined>()
  const [expandedSections, setExpandedSections] = useState<Record<WorkoutSection, boolean>>({
    warmup: true,
    workout: true,
    stretching: true,
  })

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

  const getExercisesBySection = (section: WorkoutSection) =>
    exercises.filter((e) => (e.section || 'workout') === section)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = exercises.findIndex((e) => `exercise-${e.orderIndex}` === active.id)
    const newIndex = exercises.findIndex((e) => `exercise-${e.orderIndex}` === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderExercisesInDay(selectedDayIndex, oldIndex, newIndex)
    }
  }

  const toggleSection = (section: WorkoutSection) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
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
              onClick={() => {
                setTargetSection(undefined)
                setLibraryOpen(true)
              }}
            >
              <IconPlus className="w-3.5 h-3.5 mr-1" />
              Add Exercise
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {exercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  No exercises yet
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTargetSection(undefined)
                    setLibraryOpen(true)
                  }}
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
                <div className="p-3 space-y-4">
                  {SECTIONS.map((section) => {
                    const sectionExercises = getExercisesBySection(section.key)
                    const isExpanded = expandedSections[section.key]

                    return (
                      <div key={section.key} className="space-y-2">
                        {/* Section Header */}
                        <div
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors group"
                          onClick={() => toggleSection(section.key)}
                        >
                          <IconChevronDown
                            className={`w-4 h-4 transition-transform ${
                              isExpanded ? '' : '-rotate-90'
                            }`}
                          />
                          <span className="text-lg">{section.emoji}</span>
                          <span className="text-sm font-medium flex-1">
                            {section.label}
                          </span>
                          <Badge variant="secondary" className="text-xs h-6">
                            {sectionExercises.length}
                          </Badge>
                        </div>

                        {/* Section Exercises */}
                        {isExpanded && (
                          <>
                            {sectionExercises.length === 0 ? (
                              <div className="text-center py-4">
                                <p className="text-xs text-muted-foreground mb-2">
                                  No exercises in this section
                                </p>
                              </div>
                            ) : (
                              <SortableContext
                                items={sectionExercises.map((e) => `exercise-${e.orderIndex}`)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {sectionExercises.map((ex) => {
                                    const globalIndex = exercises.findIndex(
                                      (e) => e.orderIndex === ex.orderIndex
                                    )
                                    return (
                                      <ExerciseCard
                                        key={`exercise-${ex.orderIndex}`}
                                        exercise={ex}
                                        index={globalIndex}
                                        onUpdate={(idx, updates) =>
                                          updateExerciseInDay(selectedDayIndex, idx, updates)
                                        }
                                        onRemove={(idx) =>
                                          removeExerciseFromDay(selectedDayIndex, idx)
                                        }
                                      />
                                    )
                                  })}
                                </div>
                              </SortableContext>
                            )}
                            {/* Always-visible add button for this section */}
                            <div className="flex justify-center pt-1 pb-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setTargetSection(section.key)
                                  setLibraryOpen(true)
                                }}
                              >
                                <IconPlus className="w-3 h-3 mr-1" />
                                Add to {section.label}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </DndContext>
            )}
          </ScrollArea>
        </>
      )}

      <ExerciseLibrarySidebar
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        targetSection={targetSection}
      />
    </div>
  )
}
