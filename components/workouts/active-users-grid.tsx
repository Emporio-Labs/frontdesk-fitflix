'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsers } from '@/hooks/use-users'
import { useWorkoutPlans } from '@/hooks/use-workout-plans'

export function ActiveUsersGrid() {
  const { data: users = [], isLoading } = useUsers()
  const { data: plansData } = useWorkoutPlans()
  const plans = plansData?.plans ?? []

  const assignedUserIds = new Set(plans.flatMap((p) => p.assignedUsers))
  const assignedUsers = users.filter((u: any) => assignedUserIds.has(u._id))

  const getUserPlan = (userId: string) =>
    plans.find((p) => p.assignedUsers.includes(userId) && p.status === 'Published')

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
        ) : assignedUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No users assigned to workout plans yet
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assignedUsers.map((user: any) => {
              const plan = getUserPlan(user._id)
              return (
                <div
                  key={user._id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs font-medium bg-primary/10">
                      {(user.username || user.email || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.username || user.email}
                    </p>
                    {plan ? (
                      <>
                        <p className="text-xs text-muted-foreground truncate">{plan.name}</p>
                        <Progress value={Math.random() * 100} className="h-1 mt-1.5" />
                      </>
                    ) : (
                      <Badge variant="outline" className="text-[10px] mt-1">
                        No active plan
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
