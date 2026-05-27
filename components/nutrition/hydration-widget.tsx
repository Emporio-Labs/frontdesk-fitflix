'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AdherenceBar } from '@/components/nutrition/adherence-bar'
import { Skeleton } from '@/components/skeleton-loader'
import { IconDroplet } from '@tabler/icons-react'
import { useHydration, useLogHydration } from '@/hooks/use-nutrition'

const GLASS_ML = 250
const DEFAULT_TARGET_ML = 3000

interface HydrationWidgetProps {
  userId: string
  date: string
  /** Read-only when an admin views a member's plan */
  editable?: boolean
}

export function HydrationWidget({
  userId,
  date,
  editable = true,
}: HydrationWidgetProps) {
  const { data: logs = [], isLoading } = useHydration(userId, date)
  const logHydration = useLogHydration()

  const totalMl = logs.reduce((s, l) => s + (Number(l.ml) || 0), 0)
  const totalGlasses = logs.reduce((s, l) => s + (Number(l.glasses) || 0), 0)
  const targetMl = logs[0]?.targetMl || DEFAULT_TARGET_ML

  const addGlasses = (glasses: number) => {
    logHydration.mutate({
      userId,
      date,
      glasses,
      ml: glasses * GLASS_ML,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconDroplet className="w-5 h-5 text-blue-500" />
          Hydration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{totalMl}</span>
              <span className="text-muted-foreground">
                / {targetMl} ml · {totalGlasses} glasses
              </span>
            </div>
            <AdherenceBar label="Daily target" value={totalMl} max={targetMl} />
            {editable && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={logHydration.isPending}
                  onClick={() => addGlasses(1)}
                >
                  +1 glass
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={logHydration.isPending}
                  onClick={() => addGlasses(2)}
                >
                  +2 glasses
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
