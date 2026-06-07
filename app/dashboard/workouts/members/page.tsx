'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { IconChevronLeft } from '@tabler/icons-react'
import { ActiveUsersGrid } from '@/components/workouts/active-users-grid'

export default function MembersPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 px-2">
              <Link href="/dashboard/workouts">
                <IconChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">Workouts / Members</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Assigned Members</h2>
          <p className="text-muted-foreground text-sm">
            All gym members currently assigned to workout plans and their active progress
          </p>
        </div>
      </div>

      <ActiveUsersGrid />
    </div>
  )
}
