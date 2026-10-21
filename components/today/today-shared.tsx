'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { IconRefresh } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * FX-47.2 — shared chrome for the role "Today" home pages (front desk, sales,
 * manager). Mirrors the look of the trainer Today page
 * (app/admin/personal-training/today/page.tsx): an "Today" heading with a short
 * subtitle + Refresh, and a 2/4-up KPI row.
 */
export function TodayHeader({
  subtitle,
  onRefresh,
}: {
  subtitle: string
  onRefresh?: () => void
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Today</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      {onRefresh && (
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <IconRefresh className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      )}
    </div>
  )
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
}

export function KpiCard({
  title,
  icon,
  value,
  sub,
  href,
}: {
  title: string
  icon: ReactNode
  value: ReactNode
  sub: string
  href?: string
}) {
  const body = (
    <Card className="shadow-sm h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block transition-shadow hover:shadow-md rounded-xl">
        {body}
      </Link>
    )
  }
  return body
}
