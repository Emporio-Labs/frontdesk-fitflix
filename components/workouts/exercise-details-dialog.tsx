'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IconFlame, IconTarget, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react'
import { ExerciseAnimation } from '@/components/workouts/exercise-animation'
import type { Exercise } from '@/types/workout'

export function ExerciseDetailsDialog({
  open,
  onOpenChange,
  exercise,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  exercise: Exercise | null
}) {
  if (!exercise) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{exercise.name}</DialogTitle>
            {exercise.isSystem && (
              <Badge variant="secondary" className="text-[10px]">System</Badge>
            )}
          </div>
          <DialogDescription className="sr-only">
            Details and instructions for {exercise.name}
          </DialogDescription>
          <div className="flex flex-wrap gap-2 mt-2">
             <Badge variant="outline">{exercise.difficulty}</Badge>
             {exercise.muscleGroups?.map(m => <Badge key={m} variant="secondary">{m}</Badge>)}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {(exercise.imageUrls?.length || exercise.imageUrl) && (
              <ExerciseAnimation
                urls={exercise.imageUrls?.length ? exercise.imageUrls : [exercise.imageUrl!]}
                className="w-full aspect-video rounded-lg overflow-hidden bg-muted"
              />
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Equipment</p>
                <p className="text-sm font-medium">{exercise.equipment || 'Bodyweight'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Calories/Set</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  {exercise.caloriesPerSet > 0 ? (
                    <>
                      <IconFlame className="w-3.5 h-3.5 text-orange-500" />
                      {exercise.caloriesPerSet}
                    </>
                  ) : 'N/A'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                  <IconTarget className="w-3.5 h-3.5" /> Targeted Muscles
                </p>
                <p className="text-sm font-medium">
                  {exercise.targetedMuscles?.length ? exercise.targetedMuscles.join(', ') : 'Not specified'}
                </p>
              </div>
            </div>

            {/* Instructions */}
            {exercise.instructions && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                  <IconInfoCircle className="w-4 h-4 text-blue-500" />
                  Instructions
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {exercise.instructions}
                </p>
              </div>
            )}

            {/* Tips */}
            {exercise.tips && exercise.tips.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Pro Tips</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {exercise.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Common Mistakes */}
            {exercise.commonMistakes && exercise.commonMistakes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                  <IconAlertTriangle className="w-4 h-4 text-orange-500" />
                  Common Mistakes
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {exercise.commonMistakes.map((mistake, i) => (
                    <li key={i}>{mistake}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
