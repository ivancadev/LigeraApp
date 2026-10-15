'use client'

import { useMemo, useState } from 'react'
import { CalendarRange, Check, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react'
import { targetText, type RoutineExercise } from '@/lib/workout-data'
import {
  addRoutineExercise,
  createRoutine,
  deleteRoutine,
  deleteRoutineExercise,
  renameRoutine,
  updateRoutineExercise,
  useRoutines,
} from '@/lib/routines'
import { useWorkouts } from '@/lib/data'
import {
  buildPickerOptions,
  ensureExercise,
  renameExercise,
  setMuscleGroup,
  useExercises,
} from '@/lib/exercises'
import { useUserId } from '@/lib/auth'
import { ExercisePicker } from '@/components/exercise-picker'
import { cn } from '@/lib/utils'

const EXERCISE_DEFAULTS = { sets: 3, repsMin: 8, repsMax: 12, rir: '1', note: '' }

function startEdit(ex: RoutineExercise & { id: string }) {
  return {
    id: ex.id,
    name: ex.name,
    sets: String(ex.sets),
    repsMin: String(ex.repsMin),
    repsMax: String(ex.repsMax),
    rir: ex.rir,
    note: ex.note,
  }
}

export function RoutinesScreen() {
  const routines = useRoutines()
  const exercises = useExercises()
  const workouts = useWorkouts()
  const userId = useUserId()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmRoutineId, setConfirmRoutineId] = useState<string | null>(null)
  const [addingToId, setAddingToId] = useState<string | null>(null)
  const [editing, setEditing] = useState<{
    id: string
    name: string
    sets: string
    repsMin: string
    repsMax: string
    rir: string
    note: string
  } | null>(null)
  const [originalName, setOriginalName] = useState<string | null>(null)
  const [confirmExerciseId, setConfirmExerciseId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pickerOptions = useMemo(
    () =>
      buildPickerOptions(
        exercises,
        routines
          .flatMap((r) => r.exercises.map((ex) => ex.name))
          .concat(workouts.flatMap((w) => w.exercises.map((ex) => ex.name))),
      ),
    [exercises, routines, workouts],
  )

  async function run(fn: () => Promise<void>) {
    if (!userId) return
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(
        (e as { message?: string } | null)?.message ??
          'Something went wrong. Check your connection.',
      )
    } finally {
      setBusy(false)
    }
  }

  function submitCreate() {
    const title = newTitle.trim()
    if (!title || !userId || busy) return
    run(async () => {
      await createRoutine(userId, title)
      setNewTitle('')
      setCreating(false)
    })
  }

  function submitRename(id: string) {
    const title = renameValue.trim()
    if (!title || busy) return
    run(async () => {
      await renameRoutine(id, title)
      setRenamingId(null)
    })
  }

  function addExercise(routineId: string, name: string, muscleGroup?: Parameters<typeof ensureExercise>[2]) {
    if (!name.trim() || busy) return
    run(async () => {
      if (userId) await ensureExercise(userId, name.trim(), muscleGroup)
      await addRoutineExercise(routineId, { ...EXERCISE_DEFAULTS, name: name.trim() })
      setAddingToId(null)
    })
  }

  function submitExerciseEdit() {
    if (!editing || busy) return
    const sets = Math.max(1, parseInt(editing.sets, 10) || EXERCISE_DEFAULTS.sets)
    const repsMin = Math.max(1, parseInt(editing.repsMin, 10) || EXERCISE_DEFAULTS.repsMin)
    const repsMax = Math.max(
      repsMin,
      parseInt(editing.repsMax, 10) || repsMin,
    )
    const name = editing.name.trim()
    if (!name) return
    run(async () => {
      if (originalName && name !== originalName) {
        await renameExercise(originalName, name)
      } else if (userId) {
        await ensureExercise(userId, name)
      }
      await updateRoutineExercise(editing.id, {
        sets,
        repsMin,
        repsMax,
        rir: editing.rir.trim() || EXERCISE_DEFAULTS.rir,
        note: editing.note,
      })
      setEditing(null)
      setOriginalName(null)
    })
  }

  function changeMuscleGroup(id: string, group: Parameters<typeof setMuscleGroup>[1]) {
    run(async () => {
      await setMuscleGroup(id, group)
    })
  }

  function renameExerciseEverywhere(oldName: string, newName: string) {
    run(async () => {
      await renameExercise(oldName, newName)
    })
  }

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 px-4 pb-4 pt-5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Routines
            </h1>
            <p className="mt-1.5 text-lg font-semibold text-foreground">
              {routines.length} routine{routines.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating((c) => !c)}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="size-4" />
            New routine
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {error && (
          <p className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
            {error}
          </p>
        )}

        {creating && (
          <section className="mb-4 rounded-2xl border border-border bg-card p-3">
            <p className="px-1 pb-2 text-sm font-semibold text-foreground">New routine day</p>
            <div className="flex items-center gap-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
                placeholder="e.g. Día 6 · Accesorios"
                className="h-9 flex-1 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
              />
              <button
                type="button"
                onClick={submitCreate}
                disabled={!newTitle.trim() || busy}
                className="h-9 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </section>
        )}

        {routines.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <CalendarRange className="size-6 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">No routines yet</p>
            <p className="text-sm text-muted-foreground">
              Create a day and add exercises to it.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {routines.map((routine) => {
              const open = expandedId === routine.id
              return (
                <li key={routine.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="flex items-center gap-2 px-4 py-3.5">
                    {renamingId === routine.id ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && submitRename(routine.id)}
                          className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-secondary px-2.5 text-sm text-foreground outline-none focus:border-primary/60"
                        />
                        <button
                          type="button"
                          onClick={() => submitRename(routine.id)}
                          disabled={!renameValue.trim() || busy}
                          aria-label="Save name"
                          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          <Check className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          aria-label="Cancel rename"
                          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : routine.id)}
                        aria-expanded={open}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                          {routine.title}
                        </p>
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                          {routine.exercises.length}
                        </span>
                        <ChevronDown
                          className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform',
                            open && 'rotate-180',
                          )}
                        />
                      </button>
                    )}

                    {!renamingId && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(routine.id)
                            setRenameValue(routine.title)
                          }}
                          aria-label="Rename routine"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </button>
                        {confirmRoutineId === routine.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                run(async () => {
                                  await deleteRoutine(routine.id)
                                  setConfirmRoutineId(null)
                                  setExpandedId(null)
                                })
                              }
                              disabled={busy}
                              className="rounded-lg bg-destructive px-2.5 py-1.5 text-[10px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRoutineId(null)}
                              disabled={busy}
                              aria-label="Cancel"
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRoutineId(routine.id)}
                            aria-label="Delete routine"
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {open && (
                    <div className="border-t border-border px-3 pb-3 pt-1">
                      {routine.exercises.length > 0 && (
                        <ul className="flex flex-col">
                          {routine.exercises.map((ex) => (
                            <li
                              key={ex.id}
                              className="border-b border-border/60 py-2.5 last:border-b-0"
                            >
                              {editing && editing.id === ex.id ? (
                                <ExerciseEditForm
                                  value={editing}
                                  busy={busy}
                                  onChange={setEditing}
                                  onCancel={() => {
                                    setEditing(null)
                                    setOriginalName(null)
                                  }}
                                  onSave={submitExerciseEdit}
                                />
                              ) : (
                                <ExerciseRow
                                  ex={ex}
                                  exId={ex.id}
                                  confirmDelete={confirmExerciseId === ex.id}
                                  busy={busy}
                                  onEdit={() => {
                                    setEditing(startEdit(ex))
                                    setOriginalName(ex.name)
                                  }}
                                  onDelete={() =>
                                    run(async () => {
                                      await deleteRoutineExercise(ex.id)
                                      setConfirmExerciseId(null)
                                    })
                                  }
                                  onConfirm={() => setConfirmExerciseId(ex.id)}
                                  onCancelConfirm={() => setConfirmExerciseId(null)}
                                />
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      {addingToId === routine.id ? (
                        <ExercisePicker
                          options={pickerOptions}
                          onAdd={(name, group) => addExercise(routine.id, name, group)}
                          onClose={() => {
                            setAddingToId(null)
                          }}
                          onRename={renameExerciseEverywhere}
                          onSetMuscle={changeMuscleGroup}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddingToId(routine.id)}
                          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-secondary"
                        >
                          <Plus className="size-4" />
                          Add exercise
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function ExerciseRow({
  ex,
  exId,
  confirmDelete,
  busy,
  onEdit,
  onDelete,
  onConfirm,
  onCancelConfirm,
}: {
  ex: RoutineExercise
  exId: string
  confirmDelete: boolean
  busy: boolean
  onEdit: () => void
  onDelete: () => void
  onConfirm: () => void
  onCancelConfirm: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{ex.name}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-primary">{targetText(ex)}</p>
        {ex.note && <p className="mt-0.5 text-[11px] text-muted-foreground">{ex.note}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${ex.name}`}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="rounded-md bg-destructive px-2 py-1 text-[10px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={onCancelConfirm}
              disabled={busy}
              aria-label="Cancel"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onConfirm}
            aria-label={`Delete ${ex.name}`}
            className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function ExerciseEditForm({
  value,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  value: {
    id: string
    name: string
    sets: string
    repsMin: string
    repsMax: string
    rir: string
    note: string
  }
  busy: boolean
  onChange: (v: typeof value) => void
  onCancel: () => void
  onSave: () => void
}) {
  const field = 'h-8 w-full rounded-lg border border-border bg-secondary px-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60'
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <div className="flex flex-col gap-2">
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Exercise name"
          className={field}
        />
        <div className="grid grid-cols-4 gap-2">
          <label className="flex flex-col gap-1 text-[10px] font-medium text-muted-foreground">
            Sets
            <input
              value={value.sets}
              onChange={(e) => onChange({ ...value, sets: e.target.value })}
              inputMode="numeric"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-medium text-muted-foreground">
            Reps min
            <input
              value={value.repsMin}
              onChange={(e) => onChange({ ...value, repsMin: e.target.value })}
              inputMode="numeric"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-medium text-muted-foreground">
            Reps max
            <input
              value={value.repsMax}
              onChange={(e) => onChange({ ...value, repsMax: e.target.value })}
              inputMode="numeric"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-medium text-muted-foreground">
            RIR
            <input
              value={value.rir}
              onChange={(e) => onChange({ ...value, rir: e.target.value })}
              placeholder="1–2"
              className={field}
            />
          </label>
        </div>
        <input
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
          placeholder="Note / advice (optional)"
          className={field}
        />
      </div>
      <div className="mt-2.5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!value.name.trim() || busy}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
        >
          <Check className="size-3.5" />
          Save
        </button>
      </div>
    </div>
  )
}