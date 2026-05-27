'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconChevronLeft, IconChevronRight, IconCalendar } from '@tabler/icons-react'
import { useAssignmentSchedule, useBatchUpdateWorkoutSchedule } from '@/hooks/use-workout-plans'
import { toast } from 'sonner'

export function AssignmentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const fromDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const toDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

  const { data: scheduleData, isLoading } = useAssignmentSchedule({
    from: fromDate.toISOString().split('T')[0],
    to: toDate.toISOString().split('T')[0],
  })

  const schedule = scheduleData?.schedule || []
  const batchUpdateMutation = useBatchUpdateWorkoutSchedule()

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-900 border-green-300',
    missed: 'bg-red-100 text-red-900 border-red-300',
    pending: 'bg-blue-100 text-blue-900 border-blue-300',
    rest: 'bg-gray-100 text-gray-900 border-gray-300',
    skipped: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  }

  const statusLabel: Record<string, string> = {
    completed: '✓ Completed',
    missed: '✗ Missed',
    pending: '○ Pending',
    rest: '🛌 Rest',
    skipped: '⊘ Skipped',
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const monthDays = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)
  const weeks = Math.ceil((monthDays + firstDay) / 7)

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const renderCalendar = () => {
    const days: ReactNode[] = []
    const entriesByDate = new Map(
      schedule.map((e) => [
        typeof e.date === 'string' ? e.date.split('T')[0] : new Date(e.date).toISOString().split('T')[0],
        e,
      ])
    )

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square p-2 bg-muted/30 rounded-lg" />
      )
    }

    // Days of the month
    for (let day = 1; day <= monthDays; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const dateStr = date.toISOString().split('T')[0]
      const entry = entriesByDate.get(dateStr)

      days.push(
        <div
          key={dateStr}
          className="aspect-square p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors flex flex-col"
        >
          <div className="text-xs font-medium text-muted-foreground mb-1">{day}</div>
          {entry ? (
            <div className="flex-1 flex flex-col justify-between text-[10px]">
              <div>
                <div className="font-medium truncate">Day {entry.dayNumber}</div>
                <div className="text-muted-foreground truncate">{entry.dayName}</div>
              </div>
              <Badge
                variant="outline"
                className={`text-[9px] py-0.5 ${statusColors[entry.status] || statusColors.pending}`}
              >
                {statusLabel[entry.status] || entry.status}
              </Badge>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center flex items-center justify-center flex-1">
              -
            </div>
          )}
        </div>
      )
    }

    return days
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <IconCalendar className="w-5 h-5" />
            Assignment Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
              className="h-8 w-8 p-0"
            >
              <IconChevronLeft className="w-4 h-4" />
            </Button>
            <Select
              value={`${currentMonth.getFullYear()}-${currentMonth.getMonth()}`}
              onValueChange={(val) => {
                const [year, month] = val.split('-')
                setCurrentMonth(new Date(parseInt(year), parseInt(month)))
              }}
            >
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => {
                  const d = new Date(currentMonth.getFullYear(), m)
                  return (
                    <SelectItem key={m} value={`${d.getFullYear()}-${m}`}>
                      {d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              className="h-8 w-8 p-0"
            >
              <IconChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-7 gap-2">
            {[...Array(35)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>

            {/* Legend */}
            <div className="pt-4 border-t space-y-2">
              <div className="text-sm font-medium">Status Legend</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {Object.entries(statusLabel).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border ${statusColors[key]}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            {schedule.length > 0 && (
              <div className="pt-4 border-t grid grid-cols-4 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-semibold text-blue-600">
                    {schedule.filter((e: any) => e.status === 'pending').length}
                  </div>
                  <div className="text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">
                    {schedule.filter((e: any) => e.status === 'completed').length}
                  </div>
                  <div className="text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-600">
                    {schedule.filter((e: any) => e.status === 'missed').length}
                  </div>
                  <div className="text-muted-foreground">Missed</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-600">
                    {schedule.filter((e: any) => e.status === 'rest').length}
                  </div>
                  <div className="text-muted-foreground">Rest Days</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
