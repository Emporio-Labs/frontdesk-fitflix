'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SkeletonCard } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import { AdherenceChart } from '@/components/nutrition/adherence-chart'
import { AdherenceBar } from '@/components/nutrition/adherence-bar'
import { IconChartBar } from '@tabler/icons-react'
import { useAdherence } from '@/hooks/use-nutrition'
import { useUsers } from '@/hooks/use-users'

export default function AdherenceAnalyticsPage() {
  const { data: users = [] } = useUsers()
  const [userId, setUserId] = useState('')
  const { data: adherence = [], isLoading } = useAdherence(userId)

  const avg = useMemo(() => {
    if (!adherence.length) return 0
    return Math.round(
      adherence.reduce((s, a) => s + a.adherencePct, 0) / adherence.length
    )
  }, [adherence])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Adherence Analytics</h2>
        <p className="text-muted-foreground">
          Calorie & meal adherence rollups per member
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Select a member" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u._id} value={u._id}>
                  {u.username} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!userId ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<IconChartBar className="w-10 h-10" />}
              title="Select a member"
              description="Pick a member to view their nutrition adherence trend."
            />
          </CardContent>
        </Card>
      ) : isLoading ? (
        <SkeletonCard />
      ) : adherence.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<IconChartBar className="w-10 h-10" />}
              title="No adherence data"
              description="This member has no nutrition adherence records yet."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Adherence Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <AdherenceChart data={adherence} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-3xl font-bold">{avg}%</div>
                <div className="text-sm text-muted-foreground">
                  Average adherence ({adherence.length} days)
                </div>
              </div>
              <AdherenceBar label="Average" value={avg} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
