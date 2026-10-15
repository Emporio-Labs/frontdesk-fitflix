'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { IconBarbell, IconCalendarEvent, IconEdit, IconPlus, IconRefresh } from '@tabler/icons-react'
import { StatusBadge } from '@/components/status-badge'
import { useMemberAssignment } from '@/hooks/use-member-workout'
import { AssignPlanSheet, type AssignPlanMember } from '@/components/workouts/assign-plan-sheet'
import {
  formatScheduledDay as formatDay,
  isActiveAssignment,
  summarizeAssignment as summarize,
} from '@/lib/workout-assignment-summary'

/** Member profile card: the current workout plan, with assign / change / edit-schedule actions. */
export function MemberWorkoutPlanCard({ member }: { member: AssignPlanMember }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const { data: assignment, isLoading, isError } = useMemberAssignment(member._id)
  const active = isActiveAssignment(assignment) ? assignment : null
  const stats = active ? summarize(active) : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <IconBarbell className="h-5 w-5" />
            Workout Plan
          </CardTitle>
          <CardDescription>The plan this member follows in the app.</CardDescription>
        </div>
        {active && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/workouts/members/${member._id}`}>
                <IconEdit className="h-4 w-4 mr-1.5" />
                Edit schedule
              </Link>
            </Button>
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <IconRefresh className="h-4 w-4 mr-1.5" />
              Change plan
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Couldn&apos;t load the workout plan.</p>
        ) : active && stats ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">{active.planId?.name ?? 'Workout plan'}</span>
              <StatusBadge status="active" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {stats.completed} of {stats.total} days done
                  {stats.missed > 0 && ` · ${stats.missed} missed`}
                </span>
                <span>
                  {formatDay(active.startDate)}
                  {stats.end && ` → ${formatDay(stats.end)}`}
                </span>
              </div>
              <Progress value={stats.total ? (stats.completed / stats.total) * 100 : 0} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Today</p>
                <p className="font-medium">
                  {stats.today
                    ? `Day ${stats.today.dayNumber} · ${stats.today.name}`
                    : 'Nothing scheduled'}
                </p>
                {stats.today && stats.today.status !== 'pending' && (
                  <p className="text-xs text-muted-foreground capitalize">{stats.today.status}</p>
                )}
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Next up</p>
                <p className="font-medium">
                  {stats.next ? `Day ${stats.next.dayNumber} · ${stats.next.name}` : 'Plan finished'}
                </p>
                {stats.next && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <IconCalendarEvent className="h-3.5 w-3.5" />
                    {formatDay(stats.next.scheduledDate)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <div>
              <p className="font-medium">No active workout plan</p>
              <p className="text-sm text-muted-foreground">
                {assignment?.planId?.name
                  ? `Last plan: ${assignment.planId.name} (${assignment.status}).`
                  : 'Assign a template to put workouts on their calendar.'}
              </p>
            </div>
            <Button onClick={() => setSheetOpen(true)}>
              <IconPlus className="h-4 w-4 mr-1.5" />
              Assign plan
            </Button>
          </div>
        )}
      </CardContent>

      <AssignPlanSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        member={member}
        currentAssignment={assignment}
      />
    </Card>
  )
}
