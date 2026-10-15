'use client'

import { useMemo, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { MUSCLE_GROUPS, isRecognizedGroup, type MuscleGroup } from '@/lib/muscles'
import type { PickerOption } from '@/lib/exercises'
import { cn } from '@/lib/utils'

export function ExercisePicker({
  options,
  onAdd,
  onClose,
  onRename,
  onSetMuscle,
}: {
  options: PickerOption[]
  onAdd: (name: string, muscleGroup?: MuscleGroup) => void
  onClose: () => void
  onRename?: (oldName: string, newName: string) => void
  onSetMuscle?: (id: string, group: MuscleGroup | null) => void
}) {
  const [custom, setCustom] = useState('')
  const [customGroup, setCustomGroup] = useState<MuscleGroup | ''>('')
  const [managing, setManaging] = useState(false)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editMuscle, setEditMuscle] = useState<MuscleGroup | ''>('')

  const canManage = Boolean(onRename || onSetMuscle)

  const overrides = useMemo(() => {
    const map = new Map<string, MuscleGroup>()
    for (const o of options) if (o.muscleGroup) map.set(o.name, o.muscleGroup)
    return map
  }, [options])

  const trimmed = custom.trim()
  const isExisting = options.some((o) => o.name.toLowerCase() === trimmed.toLowerCase())
  const needsGroup = trimmed.length > 0 && !isExisting && !isRecognizedGroup(trimmed, overrides)

  function submit() {
    if (!trimmed) return
    onAdd(trimmed, needsGroup ? customGroup || 'Otros' : undefined)
    setCustom('')
    setCustomGroup('')
  }

  function startEdit(opt: PickerOption) {
    setEditingName(opt.name)
    setEditValue(opt.name)
    setEditMuscle(opt.muscleGroup ?? '')
  }

  function saveEdit() {
    if (!editingName) return
    const current = options.find((o) => o.name === editingName)
    const newName = editValue.trim()
    if (onRename && current && newName && newName !== editingName) {
      onRename(editingName, newName)
    }
    if (onSetMuscle && current?.id) {
      const next = editMuscle || null
      if (next !== (current.muscleGroup ?? null)) onSetMuscle(current.id, next)
    }
    setEditingName(null)
  }

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between px-4 pb-1 pt-4">
        <p className="text-sm font-semibold">Add exercise</p>
        <div className="flex items-center gap-1">
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setManaging((m) => !m)
                setEditingName(null)
              }}
              className={cn(
                'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
                managing ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {managing ? 'Done' : 'Manage'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-4 pt-2">
        {options.map((opt) => {
          const editable = managing && (onRename || (onSetMuscle && opt.id))
          return (
            <button
              key={opt.name}
              type="button"
              onClick={() => (editable ? startEdit(opt) : onAdd(opt.name))}
              className={cn(
                'flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors',
                editingName === opt.name
                  ? 'border-primary bg-primary/12'
                  : 'border-border bg-secondary hover:border-primary/50 hover:bg-muted',
              )}
            >
              {opt.name}
              {editable && <Pencil className="size-3 text-muted-foreground" />}
            </button>
          )
        })}
      </div>

      {managing && editingName && (
        <div className="mx-4 mt-3 rounded-xl border border-border bg-secondary/40 p-3">
          <div className="flex flex-col gap-2">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              placeholder="Exercise name"
              className="h-8 w-full rounded-lg border border-border bg-secondary px-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
            />
            {onSetMuscle && (
              <label className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                Muscle group
                <select
                  value={editMuscle}
                  onChange={(e) => setEditMuscle(e.target.value as MuscleGroup | '')}
                  className="h-8 flex-1 rounded-lg border border-border bg-secondary px-2 text-xs text-foreground outline-none focus:border-primary/60"
                >
                  <option value="">—</option>
                  {MUSCLE_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingName(null)}
              className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={!editValue.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
            >
              <Check className="size-3.5" />
              Save
            </button>
          </div>
        </div>
      )}

      {needsGroup && (
        <div className="mx-4 mt-3 rounded-xl border border-primary/30 bg-primary/8 p-3">
          <p className="text-xs font-semibold text-foreground">Which muscle group?</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {`We couldn't detect "${trimmed}". Pick a group.`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setCustomGroup(g)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  (customGroup || 'Otros') === g
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary text-foreground hover:border-primary/50',
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 pb-4 pt-3">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Custom exercise name"
          className="h-9 flex-1 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!trimmed}
          className="h-9 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </section>
  )
}
