'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { exerciseOptions } from '@/lib/workout-data'
import { EXERCISE_MUSCLE, type MuscleGroup } from '@/lib/muscles'

export const EXERCISES_CHANGED = 'ligera:exercises-changed'

export type ManagedExercise = {
  id: string
  name: string
  muscleGroup: MuscleGroup | null
  position: number
}

export type PickerOption = {
  id?: string
  name: string
  muscleGroup?: MuscleGroup | null
}

export function buildPickerOptions(
  library: ManagedExercise[],
  extraNames: string[],
): PickerOption[] {
  const base: PickerOption[] =
    library.length > 0
      ? library.map((e) => ({ id: e.id, name: e.name, muscleGroup: e.muscleGroup }))
      : exerciseOptions.map((name) => ({ name, muscleGroup: EXERCISE_MUSCLE[name] ?? null }))
  const known = new Set(base.map((o) => o.name))
  const extra = Array.from(new Set(extraNames))
    .filter((n) => !known.has(n))
    .map((n) => ({ name: n }))
  return [...base, ...extra]
}

type ExerciseRow = {
  id: string
  name: string
  muscle_group: string | null
  position: number
}

function toManaged(row: ExerciseRow): ManagedExercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: (row.muscle_group as MuscleGroup | null) ?? null,
    position: row.position,
  }
}

function notifyChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EXERCISES_CHANGED))
}

async function ensureSeeded(userId: string) {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('exercises')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  if ((count ?? 0) !== 0) return

  const rows = exerciseOptions.map((name, i) => ({
    user_id: userId,
    name,
    muscle_group: EXERCISE_MUSCLE[name] ?? null,
    position: i,
  }))
  const { error: insertError } = await supabase.from('exercises').insert(rows)
  if (insertError) throw insertError
}

export async function fetchExercises(userId: string): Promise<ManagedExercise[]> {
  await ensureSeeded(userId)
  const supabase = createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, position')
    .eq('user_id', userId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []).map(toManaged)
}

export async function ensureExercise(
  userId: string,
  name: string,
  muscleGroup?: MuscleGroup | null,
) {
  const trimmed = name.trim()
  if (!trimmed) return
  const supabase = createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', trimmed)
    .limit(1)
  if (error) throw error
  if ((data ?? []).length > 0) return

  const { count } = await supabase
    .from('exercises')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  const { error: insertError } = await supabase.from('exercises').insert({
    user_id: userId,
    name: trimmed,
    muscle_group: muscleGroup ?? EXERCISE_MUSCLE[trimmed] ?? null,
    position: count ?? 0,
  })
  if (insertError) throw insertError
  notifyChanged()
}

export async function renameExercise(oldName: string, newName: string) {
  const trimmed = newName.trim()
  if (!trimmed || trimmed === oldName) return
  const supabase = createClient()
  const { error } = await supabase.rpc('rename_exercise', {
    p_old: oldName,
    p_new: trimmed,
  })
  if (error) throw error
  notifyChanged()
}

export async function setMuscleGroup(id: string, group: MuscleGroup | null) {
  const supabase = createClient()
  const { error } = await supabase.from('exercises').update({ muscle_group: group }).eq('id', id)
  if (error) throw error
  notifyChanged()
}

export function useExercises() {
  const [exercises, setExercises] = useState<ManagedExercise[]>([])
  const refresh = useCallback(async (userId: string) => {
    try {
      setExercises(await fetchExercises(userId))
    } catch (e) {
      console.error('Failed to load exercises', e)
      setExercises([])
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let active = true

    const applyUser = (userId: string | null | undefined) => {
      if (!active || !userId) return
      refresh(userId)
    }

    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: { user: { id: string } | null } | null } }) =>
        applyUser(data.session?.user?.id),
      )

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user: { id: string } | null } | null) => {
        applyUser(session?.user?.id)
      },
    )

    const onChanged = () => {
      supabase.auth
        .getSession()
        .then(({ data }: { data: { session: { user: { id: string } | null } | null } }) =>
          applyUser(data.session?.user?.id),
        )
    }
    window.addEventListener(EXERCISES_CHANGED, onChanged)

    return () => {
      active = false
      subscription.unsubscribe()
      window.removeEventListener(EXERCISES_CHANGED, onChanged)
    }
  }, [refresh])

  return exercises
}
