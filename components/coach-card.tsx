'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Sparkles, X } from 'lucide-react'
import { useWorkouts } from '@/lib/data'
import { useExercises } from '@/lib/exercises'
import { useUserId } from '@/lib/auth'
import { fetchAdvice } from '@/lib/ai'
import {
  buildCoachSignals,
  localAdvice,
  signalLabel,
  summarizeSignals,
  type AdviceSeverity,
  type TrainingAdvice,
} from '@/lib/coach'
import { type MuscleGroup } from '@/lib/muscles'
import { loadAdvice, saveAdvice, todayKey, type StoredAdvice } from '@/lib/advice-store'
import { cn } from '@/lib/utils'

const severityStyles: Record<AdviceSeverity, string> = {
  ok: 'bg-primary/12 text-primary',
  watch: 'bg-secondary text-secondary-foreground',
  act: 'bg-destructive/10 text-destructive',
}

const severityLabels: Record<AdviceSeverity, string> = {
  ok: 'On track',
  watch: 'Watch',
  act: 'Act',
}

export function CoachCard() {
  const workouts = useWorkouts()
  const library = useExercises()
  const userId = useUserId()
  const [stored, setStored] = useState<StoredAdvice | null>(null)
  const [loading, setLoading] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)

  const overrides = useMemo(() => {
    const map = new Map<string, MuscleGroup>()
    for (const exercise of library) {
      if (exercise.muscleGroup) map.set(exercise.name, exercise.muscleGroup)
    }
    return map
  }, [library])

  const signals = useMemo(() => buildCoachSignals(workouts, overrides), [workouts, overrides])
  const summary = useMemo(() => summarizeSignals(workouts, signals), [workouts, signals])
  const labels = useMemo(() => signals.map(signalLabel), [signals])

  useEffect(() => {
    setStored(loadAdvice(userId))
  }, [userId])

  if (!userId || stored?.dismissed) return null

  async function requestAdvice() {
    if (loading) return
    setLoading(true)
    setUsedFallback(false)
    const remote = await fetchAdvice(summary)
    const advice = remote ?? localAdvice(signals)
    if (!advice) {
      setLoading(false)
      return
    }
    saveAdvice({
      userId: userId as string,
      date: todayKey(),
      advice,
      dismissed: false,
    })
    setUsedFallback(remote === null)
    setStored(loadAdvice(userId))
    setLoading(false)
  }

  function dismiss() {
    if (!stored) return
    const next: StoredAdvice = { ...stored, dismissed: true }
    saveAdvice(next)
    setStored(next)
  }

  const advice: TrainingAdvice | null = stored?.advice ?? null

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="size-4" />
          <p className="text-sm font-semibold text-foreground">Today's advice</p>
        </div>
        {advice && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss advice"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {advice ? (
        <div className="mt-3">
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
              severityStyles[advice.severity],
            )}
          >
            {severityLabels[advice.severity]}
          </span>
          <p className="mt-2.5 text-sm font-semibold text-foreground">{advice.headline}</p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">{advice.body}</p>
          {advice.actions.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {advice.actions.map((action) => (
                <li key={action} className="flex gap-2 text-sm text-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-pretty">{action}</span>
                </li>
              ))}
            </ul>
          )}
          {labels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
          {usedFallback && (
            <p className="mt-3 text-xs text-muted-foreground">
              Offline tip based on your signals.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-muted-foreground text-pretty">
            Get a tip for today based on your recent training signals.
          </p>
          <button
            type="button"
            onClick={requestAdvice}
            disabled={loading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Thinking…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Get advice
              </>
            )}
          </button>
        </div>
      )}

      {advice && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          AI guidance, not medical advice.
        </p>
      )}
    </section>
  )
}
