import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { IconFlame } from '@tabler/icons-react'
import { useUsers } from '@/hooks/use-users'
import { useMyMembers } from '@/hooks/use-my-members'
import { useAuth } from '@/hooks/use-auth'
import { useWorkoutPlans } from '@/hooks/use-workout-plans'

type AssignedEntry = {
  userId: string
  displayName: string
  planName: string
  planStatus: string
  email?: string
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
  const { user: currentUser } = useAuth()
  const isTrainer = currentUser?.role === 'trainer'
  const { data: users = [], isLoading: usersLoading } = useUsers()
  const { data: myMembers = [], isLoading: myMembersLoading } = useMyMembers()
  const { data: plansData, isLoading: plansLoading } = useWorkoutPlans()
  const plans = plansData?.plans ?? []

  const isLoading = isTrainer ? myMembersLoading || plansLoading : usersLoading || plansLoading

  // Build a lookup map from userId -> User for the cross-join fallback
  const userMap = new Map<string, any>(
    (users as any[]).map((u) => [u._id?.toString() ?? u.id?.toString(), u])
  )

  // Collect unique assigned entries across all plans
  const entriesMap = new Map<string, AssignedEntry>()

  if (isTrainer) {
    for (const member of myMembers) {
      const uid = member._id?.toString() ?? member.id?.toString()
      if (!uid) continue
      const displayName = member.name || member.username || member.email || 'Member'
      
      // Find active plan assigned to this member
      const memberPlan = plans.find((p: any) =>
        (p.assignedUsers ?? []).some((item: any) => toUserId(item) === uid)
      )

      entriesMap.set(uid, {
        userId: uid,
        displayName,
        email: member.email,
        planName: memberPlan?.name ?? 'No active plan',
        planStatus: memberPlan?.status ?? '',
      })
    }
  } else {
    for (const plan of plans) {
      for (const item of plan.assignedUsers ?? []) {
        const userId = toUserId(item)
        if (!userId) continue

        if (entriesMap.has(userId)) continue // already recorded

        const inlineDisplayName = toUserDisplayName(item)
        const userRecord = userMap.get(userId)
        const displayName =
          inlineDisplayName ||
          userRecord?.username ||
          userRecord?.name ||
          userRecord?.email ||
          userId.slice(-6)

        entriesMap.set(userId, {
          userId,
          displayName,
          email: userRecord?.email,
          planName: plan.name ?? 'Unnamed Plan',
          planStatus: plan.status ?? '',
        })
      }
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
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>{isTrainer ? 'My Assigned Roster' : 'Assigned Members'}</CardTitle>
          <CardDescription>
            {isTrainer
              ? 'Members currently assigned to your personal training roster'
              : 'Users with active workout plans'}
          </CardDescription>
        </div>
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
            {isTrainer ? 'No members currently assigned to your roster' : 'No users assigned to workout plans yet'}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assignedEntries.map((entry) => (
              <div
                key={entry.userId}
                className="flex flex-col justify-between p-3.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors gap-3"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10">
                      {entry.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{entry.displayName}</p>
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

                {isTrainer && (
                  <Button variant="secondary" size="sm" asChild className="w-full h-8 text-xs font-medium mt-1">
                    <Link href={`/dashboard/workouts/members/${entry.userId}/live`}>
                      <IconFlame className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                      Live Workout Session
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
