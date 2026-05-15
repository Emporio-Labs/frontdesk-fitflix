'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { IconPlus, IconX } from '@tabler/icons-react'
import { useWorkoutStore } from '@/stores/workout-store'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function DayTabBar() {
  const {
    currentPlan,
    selectedDayIndex,
    setSelectedDay,
    addDay,
    removeDay,
    updateDay,
  } = useWorkoutStore()

  const days = currentPlan.days || []
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const handleStartRename = (index: number, name: string) => {
    setEditingIndex(index)
    setEditName(name)
  }

  const handleFinishRename = () => {
    if (editingIndex !== null && editName.trim()) {
      updateDay(editingIndex, { name: editName.trim() })
    }
    setEditingIndex(null)
  }

  return (
    <div className="border-b">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1 px-3 py-2">
          {days.map((day, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors shrink-0',
                i === selectedDayIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              )}
              onClick={() => setSelectedDay(i)}
            >
              {editingIndex === i ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                  className="h-5 w-24 text-xs px-1 bg-transparent border-none"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="text-xs font-medium"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    handleStartRename(i, day.name)
                  }}
                >
                  {day.isRestDay ? `🛌 ${day.name}` : day.name}
                </span>
              )}
              {days.length > 1 && (
                <button
                  className={cn(
                    'ml-1 rounded-full p-0.5 transition-opacity',
                    i === selectedDayIndex
                      ? 'opacity-60 hover:opacity-100'
                      : 'opacity-0 group-hover:opacity-60'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeDay(i)
                  }}
                >
                  <IconX className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={addDay}
          >
            <IconPlus className="w-3.5 h-3.5 mr-1" />
            Add Day
          </Button>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {days[selectedDayIndex] && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-t bg-muted/30">
          <Switch
            checked={days[selectedDayIndex].isRestDay}
            onCheckedChange={(checked) =>
              updateDay(selectedDayIndex, { isRestDay: checked })
            }
            className="scale-75"
          />
          <span className="text-xs text-muted-foreground">Rest Day</span>
        </div>
      )}
    </div>
  )
}
