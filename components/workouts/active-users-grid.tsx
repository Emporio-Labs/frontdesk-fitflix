import { useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { IconChevronRight, IconFlame, IconSearch } from '@tabler/icons-react'
import { useUsers } from '@/hooks/use-users'
import { useMyMembers } from '@/hooks/use-my-members'
import { useAuth } from '@/hooks/use-auth'
import { useWorkoutPlans } from '@/hooks/use-workout-plans'
import { useMemberAssignment } from '@/hooks/use-member-workout'
import { isActiveAssignment, summarizeAssignment } from '@/lib/workout-assignment-summary'

type RosterEntry = {
  userId: string
  displayName: string
  email?: string
  phone?: string
}

const PAGE = 30

/** Normalise an assignedUsers item — may be a string ID or a populated object. */
function toUserId(item: any): string {
  if (typeof item === 'string') return item
  return item?._id?.toString() ?? item?.id?.toString() ?? ''
}

function toUserDisplayName(item: any): string | null {
  if (typeof item === 'string') return null // only an ID, no name available inline
  return item?.username || item?.name || item?.email || null
}

/**
 * Trainers: their roster. Admins: everyone who has been assigned a plan.
 * Each row loads the member's real assignment (plan, day, progress).
 */
export function ActiveUsersGrid() {
  const { user: currentUser } = useAuth()
  const isTrainer = currentUser?.role === 'trainer'
  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(PAGE)

  const { data: users = [], isLoading: usersLoading } = useUsers()
  const { data: myMembers = [], isLoading: myMembersLoading } = useMyMembers()
  const { data: plansData, isLoading: plansLoading } = useWorkoutPlans()
  const plans = plansData?.plans ?? []

  const isLoading = isTrainer ? myMembersLoading : usersLoading || plansLoading

  const entries: RosterEntry[] = []
  if (isTrainer) {
    for (const member of myMembers as any[]) {
      const userId = member._id?.toString() ?? member.id?.toString()
      if (!userId) continue
      entries.push({
        userId,
        displayName: member.name || member.username || member.email || 'Member',
        email: member.email,
        phone: member.phone,
      })
    }
  } else {
    const userMap = new Map<string, any>(
      (users as any[]).map((u) => [u._id?.toString() ?? u.id?.toString(), u])
    )
    const seen = new Set<string>()
    for (const plan of plans) {
      for (const item of plan.assignedUsers ?? []) {
        const userId = toUserId(item)
        if (!userId || seen.has(userId)) continue
        seen.add(userId)
        const record = userMap.get(userId)
        entries.push({
          userId,
          displayName:
            toUserDisplayName(item) || record?.username || record?.name || record?.email || userId.slice(-6),
          email: record?.email,
          phone: record?.phone,
        })
      }
    }
  }

  const term = search.trim().toLowerCase()
  const filtered = entries.filter(
    (e) =>
      !term ||
      e.displayName.toLowerCase().includes(term) ||
      (e.email ?? '').toLowerCase().includes(term) ||
      (e.phone ?? '').includes(term)
  )

  return (
    <div className="space-y-3">
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setShown(PAGE)
          }}
          placeholder="Search members by name, email or phone"
          className="pl-9 h-11"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {entries.length === 0
            ? isTrainer
              ? 'No members on your roster yet.'
              : 'No members have been assigned a workout plan yet.'
            : 'No members match your search.'}
        </p>
      ) : (
        <>
          <div className="rounded-lg border divide-y bg-card overflow-hidden md:grid md:grid-cols-2 md:divide-y-0 md:gap-px md:bg-border">
            {filtered.slice(0, shown).map((entry) => (
              <MemberRow key={entry.userId} entry={entry} />
            ))}
          </div>
          {filtered.length > shown && (
            <Button variant="outline" className="w-full" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({filtered.length - shown} more)
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function MemberRow({ entry }: { entry: RosterEntry }) {
  const { data: assignment, isLoading } = useMemberAssignment(entry.userId)
  const active = isActiveAssignment(assignment) ? assignment : null
  const stats = active ? summarizeAssignment(active) : null

  return (
    <div className="flex items-center gap-2 bg-card pr-2">
      <Link
        href={`/dashboard/workouts/members/${entry.userId}`}
        className="flex flex-1 min-w-0 items-center gap-3 p-3 hover:bg-muted/40 active:bg-muted/60 transition-colors"
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="text-xs font-medium bg-primary/10">
            {entry.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{entry.displayName}</p>
          {isLoading ? (
            <Skeleton className="h-3 w-32 mt-1.5" />
          ) : active && stats ? (
            <>
              <p className="text-xs text-muted-foreground truncate">
                {active.planId?.name ?? 'Workout plan'}
                {stats.today
                  ? ` · Today: Day ${stats.today.dayNumber}`
                  : stats.next
                    ? ` · Next: Day ${stats.next.dayNumber}`
                    : ' · Finished'}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <Progress
                  value={stats.total ? (stats.completed / stats.total) * 100 : 0}
                  className="h-1 flex-1"
                />
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {stats.completed}/{stats.total}
                </span>
              </div>
            </>
          ) : (
            <p className="text-xs text-amber-600">No active plan — tap to assign</p>
          )}
        </div>
        <IconChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>
      <Button
        variant="ghost"
        size="icon"
        asChild
        className="h-10 w-10 shrink-0"
        title="Live workout session"
      >
        <Link href={`/dashboard/workouts/members/${entry.userId}/live`} aria-label={`Live session with ${entry.displayName}`}>
          <IconFlame className="h-5 w-5 text-amber-500" />
        </Link>
      </Button>
    </div>
  )
}
