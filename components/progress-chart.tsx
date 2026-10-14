'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ProgressPoint } from '@/lib/stats'

function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean
  payload?: any[]
  unit: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl">
      <p className="font-mono text-base font-semibold text-foreground">
        {payload[0].value} {unit}
      </p>
      <p className="text-xs text-muted-foreground">{payload[0].payload.label}</p>
    </div>
  )
}

export function ProgressChart({
  data,
  unit = 'kg',
}: {
  data: ProgressPoint[]
  unit?: string
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        No logged sessions for this period
      </div>
    )
  }

  const values = data.map((d) => d.value)
  const min = Math.floor((Math.min(...values) - 8) / 10) * 10
  const max = Math.ceil((Math.max(...values) + 6) / 10) * 10

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="rmFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
            dy={6}
          />
          <YAxis
            domain={[min, max]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
            width={40}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            content={<ChartTooltip unit={unit} />}
            cursor={{ stroke: 'var(--color-border)' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-chart-1)"
            strokeWidth={2.5}
            fill="url(#rmFill)"
            dot={{ r: 3, fill: 'var(--color-chart-1)', strokeWidth: 0 }}
            activeDot={{
              r: 5,
              fill: 'var(--color-chart-1)',
              stroke: 'var(--color-background)',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}