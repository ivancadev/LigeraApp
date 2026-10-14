'use client'

import { Check, Lock, Plus, Trash2, X } from 'lucide-react'
import type { DraftExercise, DraftSet } from '@/lib/workout-data'
import type { ExerciseProgress } from '@/lib/stats'
import { fmtShort } from '@/lib/stats'
import { cn } from '@/lib/utils'
import { NumberStepper } from '@/components/number-stepper'

const nf = new Intl.NumberFormat('en-US')

const RIR_ORDER = [0, 1, 2, 3] as const

const RIR_CLASSES: Record<number, string> = {
  0: 'bg-red-500/15 text-red-400',
  1: 'bg-orange-500/15 text-orange-400',
  2: 'bg-yellow-500/15 text-yellow-400',
  3: 'bg-emerald-500/15 text-emerald-400',
}

function cycleRir(value: number | null | undefined): number | null {
  if (value == null) return RIR_ORDER[0]
  const idx = RIR_ORDER.indexOf(value as (typeof RIR_ORDER)[number])
  if (idx < 0 || idx === RIR_ORDER.length - 1) return null
  return RIR_ORDER[idx + 1]
}

export function ExerciseCard({
  exercise,
  progress,
  onToggleSet,
  onChangeSet,
  onSetRir,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
}: {
  exercise: DraftExercise
  progress?: ExerciseProgress | null
  onToggleSet: (setId: string) => void
  onChangeSet: (setId: string, patch: Partial<DraftSet>) => void
  onSetRir: (setId: string, rir: number | null) => void
  onAddSet: () => void
  onRemoveSet: (setId: string) => void
  onRemoveExercise: () => void
}) {
  const done = exercise.sets.filter((s) => s.done).length

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground text-balance">{exercise.name}</h2>
          {exercise.target && (
            <p className="mt-0.5 text-xs font-semibold text-primary">{exercise.target}</p>
          )}
          {exercise.nextKg != null && (
            <p className="mt-0.5 text-xs font-bold text-emerald-400">
              ↑ Next: {exercise.nextKg} kg
            </p>
          )}
          {exercise.note && <p className="mt-1 text-xs text-muted-foreground">{exercise.note}</p>}
          {progress?.last && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {progress.deltaKg != null && progress.deltaKg !== 0 && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                    progress.deltaKg > 0
                      ? 'bg-primary/12 text-primary'
                      : 'bg-destructive/10 text-destructive',
                  )}
                >
                  {progress.deltaKg > 0 ? '↑ +' : '↓ '}
                  {nf.format(progress.deltaKg)} kg
                </span>
              )}
              {progress.isPr && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  PR
                </span>
              )}
              <p className="min-w-0 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/80">
                  Last ({fmtShort(progress.last.date)}):
                </span>{' '}
                {progress.last.sets.map((s) => `${s.kg}×${s.reps}`).join(' · ')}
              </p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
            {done}/{exercise.sets.length} sets
          </span>
          <button
            type="button"
            onClick={onRemoveExercise}
            aria-label="Remove exercise"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <ul className="px-2 py-2">
        {exercise.sets.map((set, i) => (
          <li
            key={set.id}
            className={cn(
              'flex items-center gap-2 rounded-xl px-2 py-2 transition-colors',
              set.done && 'bg-primary/8',
            )}
          >
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-md text-sm font-semibold tabular-nums',
                set.done ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground',
              )}
            >
              {i + 1}
            </span>

            {set.done ? (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {set.kg}
                  <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">kg</span>
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {set.reps}
                  <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">reps</span>
                </span>
              </div>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    kg
                  </p>
                  <NumberStepper
                    value={set.kg}
                    step={2.5}
                    min={0}
                    decimals={1}
                    onChange={(kg) => onChangeSet(set.id, { kg })}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    reps
                  </p>
                  <NumberStepper
                    value={set.reps}
                    step={1}
                    min={0}
                    decimals={0}
                    onChange={(reps) => onChangeSet(set.id, { reps })}
                  />
                </div>
              </>
            )}

            <div className="flex shrink-0 flex-col items-center gap-1.5">
              {set.done ? (
                <>
                  {set.rir != null && (
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                        RIR_CLASSES[set.rir],
                      )}
                    >
                      RIR{set.rir}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleSet(set.id)}
                    aria-pressed={set.done}
                    aria-label={`Set ${i + 1} complete, locked. Tap to unlock and edit.`}
                    className="flex size-9 items-center justify-center rounded-lg border border-primary bg-primary text-primary-foreground transition-all"
                  >
                    <Lock className="size-4" strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSetRir(set.id, cycleRir(set.rir))}
                    aria-label={`Cycle RIR for set ${i + 1}`}
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums transition-colors',
                      set.rir != null ? RIR_CLASSES[set.rir] : 'bg-secondary text-muted-foreground/70',
                    )}
                  >
                    {set.rir != null ? `RIR${set.rir}` : 'RIR'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleSet(set.id)}
                    aria-pressed={set.done}
                    aria-label={`Mark set ${i + 1} complete`}
                    className="flex size-9 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-all hover:border-primary/60 hover:text-foreground"
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveSet(set.id)}
                    aria-label={`Remove set ${i + 1}`}
                    className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onAddSet}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-secondary"
        >
          <Plus className="size-4" />
          Add Set
        </button>
      </div>
    </section>
  )
}