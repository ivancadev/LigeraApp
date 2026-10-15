'use client'

import { useMemo, useState } from 'react'
import { Award, ChevronDown, Flame, TrendingUp, Trophy, Weight } from 'lucide-react'
import { useWorkouts } from '@/lib/data'
import {
  RANGES,
  bestPerWorkout,
  deriveRecords,
  exerciseNameOptions,
  exerciseStats,
  filterByRange,
  groupVolumeByWorkout,
  muscleGroupStats,
  type Range,
  type RecordKind,
  type ProgressPoint,
} from '@/lib/stats'
import { type DisplayGroup, type MuscleGroup } from '@/lib/muscles'
import { useExercises } from '@/lib/exercises'
import { ProgressChart } from '@/components/progress-chart'
import { cn } from '@/lib/utils'

const nf = new Intl.NumberFormat('en-US')

const prIcon: Record<RecordKind, typeof Trophy> = {
  '1rm': Trophy,
  volume: Flame,
  reps: Award,
}

function fmtValue(n: number): string {
  return nf.format(n)
}

function pctTrend(points: ProgressPoint[]): number | null {
  if (points.length < 2) return null
  const first = points[0].value
  const last = points[points.length - 1].value
  if (first === 0) return null
  return Math.round(((last - first) / first) * 100)
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) return null
  return (
    <span
      className={cn(
        'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        trend >= 0 ? 'bg-primary/12 text-primary' : 'bg-destructive/10 text-destructive',
      )}
    >
      <TrendingUp className={cn('size-3.5', trend < 0 && 'rotate-180')} />
      {trend >= 0 ? '+' : ''}
      {trend}%
    </span>
  )
}

export function AnalyticsScreen() {
  const workouts = useWorkouts()
  const library = useExercises()
  const names = useMemo(() => exerciseNameOptions(workouts), [workouts])
  const [mode, setMode] = useState<'exercise' | 'group'>('exercise')
  const [selected, setSelected] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [range, setRange] = useState<Range>('3M')

  const overrides = useMemo(() => {
    const map = new Map<string, MuscleGroup>()
    for (const e of library) {
      if (e.muscleGroup) map.set(e.name, e.muscleGroup)
    }
    return map
  }, [library])

  const active = names.includes(selected) ? selected : (names[0] ?? '')
  const stats = useMemo(() => exerciseStats(workouts, active), [workouts, active])
  const records = useMemo(() => deriveRecords(stats), [stats])
  const points = useMemo(
    () => filterByRange(bestPerWorkout(workouts, active), range),
    [workouts, active, range],
  )

  const groupSummaries = useMemo(() => muscleGroupStats(workouts, overrides), [workouts, overrides])
  const groupNames = groupSummaries.map((g) => g.group)
  const activeGroup = (
    groupNames.includes(selectedGroup as DisplayGroup) ? selectedGroup : (groupNames[0] ?? '')
  ) as DisplayGroup | ''
  const groupPoints = useMemo(
    () =>
      activeGroup
        ? filterByRange(groupVolumeByWorkout(workouts, activeGroup as DisplayGroup, overrides), range)
        : [],
    [workouts, activeGroup, overrides, range],
  )
  const groupTrends = useMemo(() => {
    const map = new Map<DisplayGroup, number | null>()
    for (const g of groupNames) {
      map.set(g, pctTrend(filterByRange(groupVolumeByWorkout(workouts, g, overrides), range)))
    }
    return map
  }, [workouts, groupNames, overrides, range])

  const hasData = stats.workoutCount > 0
  const trend = pctTrend(points)

  const statCards = [
    { label: 'Estimated 1RM', unit: 'kg', value: hasData ? fmtValue(stats.best1Rm) : '—', icon: TrendingUp },
    {
      label: 'Max Weight',
      unit: 'kg',
      value: hasData && stats.maxWeight ? fmtValue(stats.maxWeight.kg) : '—',
      icon: Weight,
    },
    { label: 'Total Volume', unit: 'kg', value: hasData ? fmtValue(stats.totalVolume) : '—', icon: Flame },
  ]

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 px-4 pb-4 pt-5 backdrop-blur">
        <h1 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Progress
        </h1>

        <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-secondary/50 p-1">
          <button
            type="button"
            onClick={() => setMode('exercise')}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
              mode === 'exercise'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            By exercise
          </button>
          <button
            type="button"
            onClick={() => setMode('group')}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
              mode === 'group'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            By muscle group
          </button>
        </div>

        <div className="relative mt-2">
          {mode === 'exercise' ? (
            <select
              value={active}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="Select exercise"
              className="w-full appearance-none rounded-xl border border-border bg-card py-3 pl-4 pr-10 text-lg font-semibold text-foreground outline-none focus:border-primary/60"
            >
              {names.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={activeGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              aria-label="Select muscle group"
              disabled={groupNames.length === 0}
              className="w-full appearance-none rounded-xl border border-border bg-card py-3 pl-4 pr-10 text-lg font-semibold text-foreground outline-none focus:border-primary/60 disabled:opacity-50"
            >
              {groupNames.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {workouts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <TrendingUp className="size-6 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">No progress yet</p>
            <p className="text-sm text-muted-foreground">
              Finish a workout and your lifts will show up here.
            </p>
          </div>
        ) : mode === 'group' ? (
          <>
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeGroup} volume</p>
                  <p className="text-xs text-muted-foreground">
                    Total kg lifted per logged session
                  </p>
                </div>
                <TrendBadge trend={pctTrend(groupPoints)} />
              </div>

              <div className="mt-4">
                <ProgressChart data={groupPoints} unit="kg" />
              </div>

              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-secondary/50 p-1">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={cn(
                      'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
                      range === r
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-4">
              <h2 className="px-1 text-sm font-semibold text-foreground">All muscle groups</h2>
              <ul className="mt-2.5 flex flex-col gap-2">
                {groupSummaries.map((g) => {
                  const gTrend = groupTrends.get(g.group) ?? null
                  const isActive = g.group === activeGroup
                  const trained = g.sets > 0
                  return (
                    <li key={g.group}>
                      <button
                        type="button"
                        onClick={() => setSelectedGroup(g.group)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                          isActive
                            ? 'border-primary/50 bg-primary/8'
                            : 'border-border bg-card hover:bg-secondary/50',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'text-sm font-semibold',
                              trained ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {g.group}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {trained
                              ? `${g.sets} set${g.sets === 1 ? '' : 's'}${
                                  g.lastDate
                                    ? ` · ${new Date(g.lastDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                      })}`
                                    : ''
                                }`
                              : 'No sets yet'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              'font-mono text-sm font-bold tabular-nums',
                              trained ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {trained ? fmtValue(Math.round(g.volume)) : '—'}
                            <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                              kg
                            </span>
                          </span>
                          <TrendBadge trend={gTrend} />
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              {statCards.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="rounded-2xl border border-border bg-card p-3">
                    <Icon className="size-4 text-primary" />
                    <p className="mt-3 font-mono text-xl font-bold leading-none tabular-nums text-foreground">
                      {stat.value}
                      <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                        {stat.unit}
                      </span>
                    </p>
                    <p className="mt-1.5 text-[11px] leading-tight text-muted-foreground text-pretty">
                      {stat.label}
                    </p>
                  </div>
                )
              })}
            </div>

            <section className="mt-4 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">1RM Progression</p>
                  <p className="text-xs text-muted-foreground">
                    Estimated one-rep max per logged session
                  </p>
                </div>
                <TrendBadge trend={trend} />
              </div>

              <div className="mt-4">
                {hasData ? (
                  <ProgressChart data={points} unit="kg" />
                ) : (
                  <div className="flex h-56 w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                    No logged sessions for {active}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-secondary/50 p-1">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={cn(
                      'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
                      range === r
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </section>

            {records.length > 0 && (
              <section className="mt-4">
                <h2 className="px-1 text-sm font-semibold text-foreground">
                  Recent Personal Records
                </h2>
                <ul className="mt-2.5 flex flex-col gap-2">
                  {records.map((pr) => {
                    const Icon = prIcon[pr.kind]
                    return (
                      <li
                        key={pr.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{pr.label}</p>
                          <p className="text-xs text-muted-foreground">{pr.date}</p>
                        </div>
                        <span className="font-mono text-base font-bold tabular-nums text-foreground">
                          {pr.value}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
