'use client'

import { useState } from 'react'
import { ChevronDown, Dumbbell, Pencil, Trash2, X } from 'lucide-react'
import { deleteExercise, deleteWorkout, useWorkouts, type Workout } from '@/lib/data'
import { fmtDuration } from '@/lib/stats'
import { cn } from '@/lib/utils'

const nf = new Intl.NumberFormat('en-US')

function workoutSetCount(w: Workout) {
  return w.exercises.reduce((n, ex) => n + ex.sets.length, 0)
}

function workoutVolume(w: Workout) {
  return w.exercises.reduce((n, ex) => n + ex.sets.reduce((s, set) => s + set.kg * set.reps, 0), 0)
}

function fmtDay(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function HistoryScreen({ onEdit }: { onEdit: (workoutId: string) => void }) {
  const workouts = useWorkouts()
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmWorkout, setConfirmWorkout] = useState<string | null>(null)
  const [confirmExercise, setConfirmExercise] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sorted = [...workouts].reverse()

  async function removeWorkout(id: string) {
    setBusy(true)
    setError(null)
    try {
      await deleteWorkout(id)
      setConfirmWorkout(null)
      setOpenId(null)
    } catch {
      setError('Could not delete the workout. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  async function removeExercise(id: string) {
    setBusy(true)
    setError(null)
    try {
      await deleteExercise(id)
      setConfirmExercise(null)
    } catch {
      setError('Could not delete the exercise. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  if (sorted.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-background/85 px-4 pb-4 pt-5 backdrop-blur">
          <h1 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            History
          </h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <Dumbbell className="size-6 text-muted-foreground" />
          <p className="text-base font-semibold text-foreground">No workouts yet</p>
          <p className="text-sm text-muted-foreground">
            Once you finish a session it will show up here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 px-4 pb-4 pt-5 backdrop-blur">
        <h1 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          History
        </h1>
        <p className="mt-1.5 text-lg font-semibold text-foreground">
          {sorted.length} workout{sorted.length === 1 ? '' : 's'}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {error && (
          <p className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
            {error}
          </p>
        )}

        <ul className="flex flex-col gap-2.5">
          {sorted.map((w) => {
            const open = openId === w.id
            const sets = workoutSetCount(w)
            const volume = Math.round(workoutVolume(w))
            return (
              <li key={w.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-2 px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : w.id)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {w.name ?? 'Entrenamiento libre'}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDay(w.date)} · {fmtTime(w.date)} · {w.exercises.length} ex · {sets}{' '}
                        sets · {nf.format(volume)} kg
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                      {fmtDuration(w.elapsedSeconds)}
                    </span>
                    <ChevronDown
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground transition-transform',
                        open && 'rotate-180',
                      )}
                    />
                  </button>

                  {confirmWorkout === w.id ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => removeWorkout(w.id)}
                        disabled={busy}
                        className="rounded-lg bg-destructive px-2.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmWorkout(null)}
                        disabled={busy}
                        aria-label="Cancel"
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(w.id)}
                        aria-label="Edit workout"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmWorkout(w.id)}
                        aria-label="Delete workout"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>

                {open && (
                  <div className="border-t border-border px-4 py-3">
                    <ul className="flex flex-col gap-2.5">
                      {w.exercises.map((ex) => (
                        <li key={ex.id} className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground">{ex.name}</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {ex.sets.length === 0 ? (
                                <span className="text-xs text-muted-foreground">No sets</span>
                              ) : (
                                ex.sets.map((s, j) => (
                                  <span
                                    key={j}
                                    className="rounded-md bg-secondary px-2 py-1 font-mono text-xs tabular-nums text-muted-foreground"
                                  >
                                    {s.kg} × {s.reps}
                                    {s.rir != null && (
                                      <span className="ml-1 text-primary">· RIR {s.rir}</span>
                                    )}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>

                          {confirmExercise === ex.id ? (
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => removeExercise(ex.id)}
                                disabled={busy}
                                className="rounded-lg bg-destructive px-2.5 py-1.5 text-[10px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmExercise(null)}
                                disabled={busy}
                                aria-label="Cancel"
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmExercise(ex.id)}
                              aria-label={`Delete ${ex.name}`}
                              className="shrink-0 rounded-md p-1 text-muted-foreground/70 transition-colors hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}