'use client'

import { useState } from 'react'
import { Check, Plus, RefreshCw, X } from 'lucide-react'
import type { RoutinePlan, RoutinePlanExercise } from '@/lib/routine-plan'
import { saveRoutinePlan, type RoutineSaveMode } from '@/lib/routine-save'
import { cn } from '@/lib/utils'

function repsText(ex: RoutinePlanExercise): string {
  return ex.repsMax > ex.repsMin ? `${ex.repsMin}–${ex.repsMax}` : `${ex.repsMin}`
}

export function RoutineTable({
  plan,
  onDiscard,
  onOpenRoutines,
}: {
  plan: RoutinePlan
  onDiscard: () => void
  onOpenRoutines: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<RoutineSaveMode | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)

  async function persist(mode: RoutineSaveMode) {
    if (busy || saved) return
    setBusy(true)
    setError(null)
    try {
      await saveRoutinePlan(plan.days, mode)
      setSaved(mode)
      setConfirmReplace(false)
    } catch (e) {
      setError(
        (e as { message?: string } | null)?.message ??
          'Could not save the table. Check your connection.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{plan.title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {plan.days.length} day{plan.days.length === 1 ? '' : 's'} · preview before saving
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {plan.days.map((day, dayIndex) => (
          <div
            key={`${dayIndex}-${day.title}`}
            className="rounded-xl border border-border/70 bg-secondary/30 p-2.5"
          >
            <p className="px-0.5 text-xs font-semibold text-foreground">{day.title}</p>
            <table className="mt-2 w-full table-fixed border-collapse text-left text-[11px]">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="w-[52%] pb-1.5 font-medium">Exercise</th>
                  <th className="w-[14%] pb-1.5 font-medium">Sets</th>
                  <th className="w-[18%] pb-1.5 font-medium">Reps</th>
                  <th className="w-[16%] pb-1.5 font-medium">RIR</th>
                </tr>
              </thead>
              <tbody>
                {day.exercises.map((ex, exerciseIndex) => (
                  <tr
                    key={`${dayIndex}-${exerciseIndex}-${ex.name}`}
                    className="border-t border-border/50 align-top"
                  >
                    <td className="py-1.5 pr-2">
                      <p className="font-semibold text-foreground">
                        {ex.name}
                        {ex.bodyweight && (
                          <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                            BW
                          </span>
                        )}
                      </p>
                      {ex.note && (
                        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                          {ex.note}
                        </p>
                      )}
                    </td>
                    <td className="py-1.5 text-muted-foreground tabular-nums">{ex.sets}</td>
                    <td className="py-1.5 text-muted-foreground tabular-nums">{repsText(ex)}</td>
                    <td className="py-1.5 text-muted-foreground tabular-nums">
                      {ex.rir ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-[11px] font-semibold text-destructive">
          {error}
        </p>
      )}

      {saved ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-primary/10 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Check className="size-3.5" />
            {saved === 'replace' ? 'Routines replaced' : 'Saved to Routines'}
          </p>
          <button
            type="button"
            onClick={onOpenRoutines}
            className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            View Routines
          </button>
        </div>
      ) : confirmReplace ? (
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5">
          <p className="text-xs font-semibold text-foreground">Replace all routines?</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            This deletes every current routine day first.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => persist('replace')}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-destructive px-2.5 py-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
            >
              {busy ? <RefreshCw className="size-3.5 animate-spin" /> : null}
              Yes, replace
            </button>
            <button
              type="button"
              onClick={() => setConfirmReplace(false)}
              disabled={busy}
              className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-secondary-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              <X className="size-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => persist('append')}
            disabled={busy}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40',
            )}
          >
            {busy ? <RefreshCw className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Add to Routines
          </button>
          <button
            type="button"
            onClick={() => setConfirmReplace(true)}
            disabled={busy}
            className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            Replace all
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={busy}
            className="rounded-xl px-2.5 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            Discard
          </button>
        </div>
      )}
    </section>
  )
}
