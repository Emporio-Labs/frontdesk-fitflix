'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useWorkoutStore } from '@/stores/workout-store'
import { cn } from '@/lib/utils'

/**
 * Day tabs ("D1 · Push") plus a bar for the selected day: rename, rest day,
 * delete (confirmed). Rename/delete used to be a double-click and a hover ✕ on
 * the tab — neither works on a phone, and the ✕ was easy to hit by accident.
 */
export function DayTabBar() {
  const { currentPlan, selectedDayIndex, setSelectedDay, addDay, removeDay, updateDay } =
    useWorkoutStore()

  const days = currentPlan.days || []
  const selected = days[selectedDayIndex]

  return (
    <div className="border-b">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1 px-3 py-2">
          {days.map((day, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDay(i)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 max-w-[10rem]',
                i === selectedDayIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              <span className="font-semibold">D{day.dayNumber}</span>
              <span className="truncate">· {day.isRestDay ? 'Rest' : day.name}</span>
            </button>
          ))}
          <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={addDay}>
            <IconPlus className="w-3.5 h-3.5 mr-1" />
            Add Day
          </Button>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {selected && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t bg-muted/30">
          <Input
            key={selectedDayIndex}
            defaultValue={selected.name}
            onBlur={(e) => {
              const name = e.target.value.trim()
              if (name && name !== selected.name) updateDay(selectedDayIndex, { name })
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label={`Day ${selected.dayNumber} name`}
            className="h-8 flex-1 min-w-0 text-xs"
          />
          <label className="flex items-center gap-1.5 shrink-0">
            <Switch
              checked={selected.isRestDay}
              onCheckedChange={(checked) => updateDay(selectedDayIndex, { isRestDay: checked })}
              className="scale-75"
            />
            <span className="text-xs text-muted-foreground">Rest</span>
          </label>
          {days.length > 1 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive"
                  aria-label={`Delete day ${selected.dayNumber}`}
                >
                  <IconTrash className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Day {selected.dayNumber}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &ldquo;{selected.name}&rdquo; and its {selected.exercises.length} exercise
                    {selected.exercises.length === 1 ? '' : 's'} will be removed, and later days move up
                    one.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => removeDay(selectedDayIndex)}
                  >
                    Delete day
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </div>
  )
}
