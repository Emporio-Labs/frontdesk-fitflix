import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Funnel } from '@/lib/services/analytics.service'
import { cn } from '@/lib/utils'

const numberFmt = new Intl.NumberFormat()

function percent(numerator: number, denominator: number): string {
  if (!denominator) return '—'
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

/**
 * FX-27.1 — one funnel (sign-up or booking) for the selected branch.
 *
 * Each stage is a bar sized against the top of the funnel, with the count and
 * the step-to-step conversion rate. The footer shows overall conversion
 * (last stage ÷ first stage) — the single number a club manager scans for.
 */
export function FunnelCard({ funnel }: { funnel: Funnel }) {
  const steps = funnel.steps ?? []
  const top = steps[0]?.count ?? 0
  const bottom = steps[steps.length - 1]?.count ?? 0
  const hasData = steps.length > 0 && top > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{funnel.title}</CardTitle>
        <CardDescription>
          {hasData ? (
            <>
              Overall conversion:{' '}
              <span className="font-semibold text-foreground">{percent(bottom, top)}</span>
            </>
          ) : (
            'No activity in this window.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ol className="space-y-4">
            {steps.map((step, i) => {
              const prev = i > 0 ? steps[i - 1] : null
              const widthPct = top > 0 ? Math.max((step.count / top) * 100, 1.5) : 0
              const dropOff = prev ? Math.max(prev.count - step.count, 0) : 0

              return (
                <li key={step.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{step.label}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {numberFmt.format(step.count)}
                    </span>
                  </div>
                  <div
                    className="h-7 w-full overflow-hidden rounded-md bg-muted"
                    role="img"
                    aria-label={`${step.label}: ${numberFmt.format(step.count)}`}
                  >
                    <div
                      className={cn(
                        'h-full rounded-md bg-primary transition-[width] duration-500',
                      )}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  {prev && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {percent(step.count, prev.count)} from {prev.label}
                      {dropOff > 0 && (
                        <>
                          {' · '}
                          <span className="text-destructive">
                            −{numberFmt.format(dropOff)} dropped off
                          </span>
                        </>
                      )}
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No data for this branch yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
