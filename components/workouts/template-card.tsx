'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DifficultyBadge } from '@/components/workouts/difficulty-badge'
import {
  IconBarbell,
  IconCalendar,
  IconCopy,
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconTrash,
  IconUser,
  IconUsers,
  IconUsersPlus,
} from '@tabler/icons-react'
import type { WorkoutPlan } from '@/types/workout'
import { PLAN_GOALS, SPLIT_TYPES } from '@/types/workout'

function createdByLabel(createdBy: WorkoutPlan['createdBy']): string {
  if (!createdBy) return '—'
  if (typeof createdBy === 'string') return createdBy === 'frontdesk' ? 'Front Desk' : '—'
  return createdBy.name || createdBy.email || '—'
}

function formatDate(value?: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TemplateCard({
  template,
  onUseTemplate,
  onDuplicate,
  onDelete,
}: {
  template: WorkoutPlan
  onUseTemplate: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const goalLabel = PLAN_GOALS.find((g) => g.value === template.goal)?.label ?? template.goal
  const splitLabel =
    SPLIT_TYPES.find((s) => s.value === template.splitType)?.label ?? template.splitType
  const exerciseCount = template.days.reduce((sum, d) => sum + d.exercises.length, 0)

  return (
    <Card className="hover:shadow-md transition-shadow group flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">
            {template.name || 'Untitled Template'}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1 -mt-1">
                <IconDotsVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/workouts/${template._id}`}>
                  <IconEye className="w-4 h-4 mr-2" />
                  View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/workouts/${template._id}`}>
                  <IconEdit className="w-4 h-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <IconCopy className="w-4 h-4 mr-2" />
                Duplicate &amp; customize
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <IconTrash className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {template.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {template.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col">
        <div className="flex flex-wrap gap-1.5">
          <DifficultyBadge difficulty={template.difficulty} />
          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border text-muted-foreground">
            {goalLabel}
          </span>
          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border text-muted-foreground">
            {splitLabel}
          </span>
          {template.templateCategory && (
            <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border text-muted-foreground">
              {template.templateCategory}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <IconCalendar className="w-3.5 h-3.5" />
            {template.days.length} days
          </span>
          <span className="flex items-center gap-1">
            <IconBarbell className="w-3.5 h-3.5" />
            {exerciseCount} exercises
          </span>
          <span className="flex items-center gap-1">
            <IconUsers className="w-3.5 h-3.5" />
            {template.assignedUsers.length} assigned
          </span>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground border-t pt-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <IconUser className="w-3.5 h-3.5" />
              {createdByLabel(template.createdBy)}
            </span>
            <span>Created {formatDate(template.createdAt)}</span>
          </div>
          <div className="text-right">Updated {formatDate(template.updatedAt)}</div>
        </div>

        <div className="flex gap-2 pt-1 mt-auto">
          <Button size="sm" className="flex-1" onClick={onUseTemplate}>
            <IconUsersPlus className="w-3.5 h-3.5 mr-1.5" />
            Use Template
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/dashboard/workouts/${template._id}`}>View</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
