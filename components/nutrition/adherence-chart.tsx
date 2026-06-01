'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { AdherenceDaily } from '@/lib/types/nutrition'

interface AdherenceChartProps {
  data: AdherenceDaily[]
  height?: number
}

export function AdherenceChart({ data, height = 240 }: AdherenceChartProps) {
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({
          date: new Date(d.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
          adherence: Math.round(d.adherencePct),
          consumed: d.consumedCalories,
          planned: d.plannedCalories,
        })),
    [data]
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="adherenceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} domain={[0, 100]} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="adherence"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#adherenceGrad)"
          name="Adherence %"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
