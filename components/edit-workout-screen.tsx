'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Flag, Plus, X } from 'lucide-react'
import type { DraftExercise, DraftSet } from '@/lib/workout-data'
import { updateWorkout, useWorkouts } from '@/lib/data'
import { exerciseProgress, fmtDuration } from '@/lib/stats'
import { ensureExercise, renameExercise, setMuscleGroup, useExercises, buildPickerOptions } from '@/lib/exercises'
import { useUserId } from '@/lib/auth'
import { ExerciseCard } from '@/components/exercise-card'
import { ExercisePicker } from '@/components/exercise-picker'

let idCounter = 0
const uid = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`

function newSet(prev?: DraftSet): DraftSet {
  return {
    id: uid('s'),
    kg: prev?.kg ?? 20,
    reps: prev?.reps ?? 8,
    done: false,
  }
}

export function EditWorkoutScreen({
  workoutId,
  onDone,
  onClose,
}: {
  workoutId: string
  onDone: () => void
  onClose: () => void
}) {
  const workouts = useWorkouts()
  const exercises = useExercises()
  const userId = useUserId()
  const workout = workouts.find((w) => w.id === workoutId)
  const seededFor = useRef<string | null>(null)
  const [draft, setDraft] = useState<DraftExercise[] | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const pickerOptions = useMemo(
    () =>
      buildPickerOptions(
        exercises,
        workouts.flatMap((w) => w.exercises.map((ex) => ex.name)),
      ),
    [exercises, workouts],
  )

  useEffect(() => {
    if (!workout || seededFor.current === workout.id) return
    seededFor.current = workout.id
    setDraft(
      workout.exercises.map((ex) => ({
        id: uid('e'),
        name: ex.name,
        sets: ex.sets.map((s) => ({
          id: uid('s'),
          kg: s.kg,
          reps: s.reps,
          rir: s.rir ?? null,
          done: false,
        })),
      })),
    )
  }, [workout])

  function updateExercise(id: string, updater: (ex: DraftExercise) => DraftExercise) {
    setDraft((prev) => (prev ? prev.map((ex) => (ex.id === id ? updater(ex) : ex)) : prev))
  }

  function addExercise(name: string) {
    if (!draft || draft.some((ex) => ex.name === name)) return
    if (userId) {
      ensureExercise(userId, name).catch((e) =>
        console.error('Failed to add exercise to library', e),
      )
    }
    setDraft((prev) => [...(prev ?? []), { id: uid('e'), name, sets: [newSet()] }])
    setPickerOpen(false)
  }

  function renameExerciseEverywhere(oldName: string, newName: string) {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === oldName) return
    renameExercise(oldName, trimmed)
      .then(() =>
        setDraft((prev) =>
          prev ? prev.map((ex) => (ex.name === oldName ? { ...ex, name: trimmed } : ex)) : prev,
        ),
      )
      .catch((e) => {
        const msg = (e as { message?: string } | null)?.message
        setFlash({ kind: 'error', text: msg ? `Rename failed: ${msg}` : 'Rename failed.' })
      })
  }

  function changeMuscleGroup(id: string, group: Parameters<typeof setMuscleGroup>[1]) {
    setMuscleGroup(id, group).catch((e) =>
      console.error('Failed to set muscle group', e),
    )
  }

  async function commit() {
    if (!draft || draft.length === 0 || saving) return
    setSaving(true)
    setConfirming(false)
    try {
      await updateWorkout(
        workoutId,
        null,
        draft
          .filter((ex) => ex.sets.length > 0)
          .map((ex) => ({
            name: ex.name,
            sets: ex.sets.map((s) => ({ kg: s.kg, reps: s.reps, rir: s.rir ?? null })),
          })),
      )
      setFlash({ kind: 'ok', text: 'Workout updated' })
      onDone()
    } catch (e) {
      const msg = (e as { message?: string } | null)?.message
      setFlash({
        kind: 'error',
        text: msg ? `Could not save: ${msg}` : 'Could not save workout. Check your connection.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 px-4 pb-4 pt-5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Edit workout
            </span>
            {workout && (
              <p className="mt-1 truncate text-sm font-semibold text-foreground">
                {new Date(workout.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                ·{' '}
                {new Date(workout.date).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {fmtDuration(workout.elapsedSeconds)}
              </p>
            )}
          </div>

          {confirming ? (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={saving}
                className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm font-bold text-secondary-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commit}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-60"
              >
                <Flag className="size-4" strokeWidth={2.5} />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close editor"
                className="rounded-xl border border-border p-2.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={!draft || draft.length === 0 || saving}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
              >
                <Flag className="size-4" strokeWidth={2.5} />
                Save
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-40">
        {!draft ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <div
              className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-label="Loading"
            />
          </div>
        ) : draft.length === 0 && !pickerOpen ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <Plus className="size-6 text-muted-foreground" />
            <div>
              <p className="text-base font-semibold text-foreground">No exercises in this workout</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add one back or close and start over.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" />
              Add exercise
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {draft.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                progress={exerciseProgress(
                  workouts.filter((w) => w.id !== workoutId),
                  ex.name,
                )}
                onToggleSet={(setId) =>
                  updateExercise(ex.id, (cur) => ({
                    ...cur,
                    sets: cur.sets.map((s) => (s.id === setId ? { ...s, done: !s.done } : s)),
                  }))
                }
                onChangeSet={(setId, patch) =>
                  updateExercise(ex.id, (cur) => ({
                    ...cur,
                    sets: cur.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
                  }))
                }
                onSetRir={(setId, rir) =>
                  updateExercise(ex.id, (cur) => ({
                    ...cur,
                    sets: cur.sets.map((s) => (s.id === setId ? { ...s, rir } : s)),
                  }))
                }
                onAddSet={() =>
                  updateExercise(ex.id, (cur) => ({ ...cur, sets: [...cur.sets, newSet()] }))
                }
                onRemoveSet={(setId) =>
                  updateExercise(ex.id, (cur) => ({
                    ...cur,
                    sets: cur.sets.filter((s) => s.id !== setId),
                  }))
                }
                onRemoveExercise={() =>
                  setDraft((prev) => (prev ? prev.filter((cur) => cur.id !== ex.id) : prev))
                }
              />
            ))}
          </div>
        )}

        {pickerOpen && (
          <div className="mt-4">
            <ExercisePicker
              options={pickerOptions}
              onAdd={addExercise}
              onClose={() => setPickerOpen(false)}
              onRename={renameExerciseEverywhere}
              onSetMuscle={changeMuscleGroup}
            />
          </div>
        )}

        {draft && draft.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <Plus className="size-4" />
              {pickerOpen ? 'Close' : 'Add Exercise'}
            </button>
          </div>
        )}
      </div>

      {flash && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center px-4">
          <div
            className={[
              'animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-xl',
              flash.kind === 'ok'
                ? 'border-border bg-popover text-popover-foreground'
                : 'border-destructive/40 bg-popover text-destructive',
            ].join(' ')}
          >
            {flash.text}
          </div>
        </div>
      )}
    </div>
  )
}