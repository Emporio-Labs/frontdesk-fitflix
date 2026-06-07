'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsers } from '@/hooks/use-users'
import { useWorkoutPlans } from '@/hooks/use-workout-plans'

type AssignedEntry = {
  userId: string
  displayName: string
  planName: string
  planStatus: string
}

/** Normalise an assignedUsers item — may be a string ID or a populated object. */
function toUserId(item: any): string {
  if (typeof item === 'string') return item
  return item?._id?.toString() ?? item?.id?.toString() ?? ''
}

function toUserDisplayName(item: any): string | null {
  if (typeof item === 'string') return null // only an ID, no name available inline
  return item?.username || item?.name || item?.email || null
}

export function ActiveUsersGrid() {
  const { data: users = [], isLoading: usersLoading } = useUsers()
  const { data: plansData, isLoading: plansLoading } = useWorkoutPlans()
  const plans = plansData?.plans ?? []

  const isLoading = usersLoading || plansLoading

  // Build a lookup map from userId -> User for the cross-join fallback
  const userMap = new Map<string, any>(
    (users as any[]).map((u) => [u._id?.toString() ?? u.id?.toString(), u])
  )

  // Collect unique assigned entries across all plans
  const entriesMap = new Map<string, AssignedEntry>()

  for (const plan of plans) {
    for (const item of plan.assignedUsers ?? []) {
      const userId = toUserId(item)
      if (!userId) continue

      if (entriesMap.has(userId)) continue // already recorded

      // Try to get the display name from the populated object first,
      // then fall back to the user list cross-join
      const inlineDisplayName = toUserDisplayName(item)
      const userRecord = userMap.get(userId)
      const displayName =
        inlineDisplayName ||
        userRecord?.username ||
        userRecord?.name ||
        userRecord?.email ||
        userId.slice(-6) // last 6 chars of the ID as a fallback label

      entriesMap.set(userId, {
        userId,
        displayName,
        planName: plan.name ?? 'Unnamed Plan',
        planStatus: plan.status ?? '',
      })
    }
  }

  const assignedEntries = Array.from(entriesMap.values())

  // Fake-but-stable progress: deterministic from userId string
  const getProgress = (uid: string) => {
    let hash = 0
    for (let i = 0; i < uid.length; i++) {
      hash = (hash * 31 + uid.charCodeAt(i)) >>> 0
    }
    return (hash % 71) + 10 // range: 10–80
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Members</CardTitle>
        <CardDescription>Users with active workout plans</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : assignedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No users assigned to workout plans yet
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assignedEntries.map((entry) => (
              <div
                key={entry.userId}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs font-medium bg-primary/10">
                    {entry.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{entry.planName}</p>
                  {entry.planStatus ? (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={getProgress(entry.userId)} className="h-1 flex-1" />
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1 shrink-0 ${
                          entry.planStatus === 'Active'
                            ? 'border-emerald-500 text-emerald-600'
                            : entry.planStatus === 'Draft'
                            ? 'border-amber-500 text-amber-600'
                            : ''
                        }`}
                      >
                        {entry.planStatus}
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-[10px] mt-1">
                      No active plan
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
