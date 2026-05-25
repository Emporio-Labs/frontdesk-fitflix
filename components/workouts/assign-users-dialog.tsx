'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { IconSearch, IconCalendar, IconLoader2 } from '@tabler/icons-react'
import { useUsers } from '@/hooks/use-users'
import { useWorkoutStore } from '@/stores/workout-store'
import { useAssignPlanUsers } from '@/hooks/use-workout-plans'
import { cn } from '@/lib/utils'

export function AssignUsersDialog({
  open,
  onOpenChange,
  planId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, "Assign Now" sends to the server immediately. Otherwise selections are stored locally for create flow. */
  planId?: string
}) {
  const [search, setSearch] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const { data: users = [], isLoading } = useUsers()
  const {
    assignedUserIds,
    toggleUserAssignment,
    assignmentStartDate,
    setAssignmentStartDate,
  } = useWorkoutStore()
  const assignMutation = useAssignPlanUsers()

  const filtered = users.filter((u: any) => {
    const term = search.toLowerCase()
    return (
      (u.username || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term)
    )
  })

  const startDateAsDate = (() => {
    const [y, m, d] = assignmentStartDate.split('-').map(Number)
    if (!y || !m || !d) return new Date()
    return new Date(y, m - 1, d)
  })()

  const handleDone = () => {
    if (!planId) {
      // Create flow: just stash selections; PlanBuilderLayout will POST /assign after create.
      onOpenChange(false)
      return
    }
    if (assignedUserIds.length === 0) {
      onOpenChange(false)
      return
    }
    assignMutation.mutate(
      {
        id: planId,
        userIds: assignedUserIds,
        startDate: new Date(assignmentStartDate).toISOString(),
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    )
  }

  const isPending = assignMutation.isPending
  const ctaLabel = planId
    ? isPending
      ? 'Assigning…'
      : 'Assign Now'
    : 'Done'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Users to Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Start date</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !assignmentStartDate && 'text-muted-foreground',
                )}
              >
                <IconCalendar className="mr-2 h-4 w-4" />
                {startDateAsDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDateAsDate}
                onSelect={(d) => {
                  if (!d) return
                  const y = d.getFullYear()
                  const m = String(d.getMonth() + 1).padStart(2, '0')
                  const day = String(d.getDate()).padStart(2, '0')
                  setAssignmentStartDate(`${y}-${m}-${day}`)
                  setCalendarOpen(false)
                }}
                disabled={(d) => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  return d < today
                }}
              />
            </PopoverContent>
          </Popover>
          <p className="text-[11px] text-muted-foreground">
            Day 1 is scheduled for this date. Missed days roll forward automatically.
          </p>
        </div>

        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[280px] -mx-2 px-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No users found
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((user: any) => {
                const isSelected = assignedUserIds.includes(user._id)
                return (
                  <label
                    key={user._id}
                    className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleUserAssignment(user._id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10">
                        {(user.username || user.email || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.username || 'Unnamed User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {assignedUserIds.length} user{assignedUserIds.length !== 1 ? 's' : ''} selected
          </span>
          <Button size="sm" onClick={handleDone} disabled={isPending}>
            {isPending && <IconLoader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {ctaLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
