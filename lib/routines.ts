'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUserId } from '@/lib/auth'
import {
  defaultRoutineDays,
  type RoutineExercise,
} from '@/lib/workout-data'
import { clearLoadFailure, reportLoadFailure } from '@/lib/load-failure'

export const ROUTINES_CHANGED = 'ligera:routines-changed'

export type ManagedRoutineExercise = RoutineExercise & { id: string }

export type ManagedRoutineDay = {
  id: string
  title: string
  exercises: ManagedRoutineExercise[]
}

type RoutineExerciseRow = {
  id: string
  name: string
  sets: number
  reps_min: number
  reps_max: number
  rir: string
  note: string | null
  bodyweight: boolean
  position: number
}

type RoutineRow = {
  id: string
  title: string
  position: number
  routine_exercises: RoutineExerciseRow[]
}

function toRoutineExercise(row: RoutineExerciseRow): ManagedRoutineExercise {
  return {
    id: row.id,
    name: row.name,
    sets: row.sets,
    repsMin: row.reps_min,
    repsMax: row.reps_max,
    rir: row.rir,
    note: row.note ?? '',
    bodyweight: row.bodyweight,
  }
}

function toRoutineDay(row: RoutineRow): ManagedRoutineDay {
  return {
    id: row.id,
    title: row.title,
    exercises: [...row.routine_exercises]
      .sort((a, b) => a.position - b.position)
      .map(toRoutineExercise),
  }
}

function notifyChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ROUTINES_CHANGED))
}

async function ensureSeeded(userId: string) {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('routines')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  if ((count ?? 0) !== 0) return

  const { error: daysError } = await supabase
    .from('routines')
    .upsert(
      defaultRoutineDays.map((day, i) => ({ user_id: userId, title: day.title, position: i })),
      { onConflict: 'user_id,position', ignoreDuplicates: true },
    )
  if (daysError) throw daysError

  const { data: inserted, error: selectError } = await supabase
    .from('routines')
    .select('id, position')
    .eq('user_id', userId)
  if (selectError) throw selectError

  const orderedRoutines = [...(inserted ?? [])].sort((a, b) => a.position - b.position)
  const routineExercises = orderedRoutines.flatMap((routine, i) =>
    defaultRoutineDays[i].exercises.map((ex, j) => ({
      routine_id: routine.id,
      name: ex.name,
      sets: ex.sets,
      reps_min: ex.repsMin,
      reps_max: ex.repsMax,
      rir: ex.rir,
      note: ex.note ?? null,
      bodyweight: ex.bodyweight ?? false,
      position: j,
    })),
  )
  if (routineExercises.length === 0) return
  const { error: exError } = await supabase
    .from('routine_exercises')
    .upsert(routineExercises, { onConflict: 'routine_id,position', ignoreDuplicates: true })
  if (exError) throw exError
}

export async function fetchRoutines(userId: string): Promise<ManagedRoutineDay[]> {
  await ensureSeeded(userId)
  const supabase = createClient()
  const { data, error } = await supabase
    .from('routines')
    .select(
      'id, title, position, routine_exercises(id, name, sets, reps_min, reps_max, rir, note, bodyweight, position)',
    )
    .eq('user_id', userId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []).map(toRoutineDay)
}

export async function createRoutine(userId: string, title: string) {
  const supabase = createClient()
  const { data: last, error: lastError } = await supabase
    .from('routines')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1)
  if (lastError) throw lastError
  const position = (last?.[0]?.position ?? -1) + 1
  const { error } = await supabase
    .from('routines')
    .insert({ user_id: userId, title, position })
  if (error) throw error
  notifyChanged()
}

export async function renameRoutine(routineId: string, title: string) {
  const supabase = createClient()
  const { error } = await supabase.from('routines').update({ title }).eq('id', routineId)
  if (error) throw error
  notifyChanged()
}

export async function deleteRoutine(routineId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('routines').delete().eq('id', routineId)
  if (error) throw error
  notifyChanged()
}

export type RoutineExerciseInput = {
  name: string
  sets: number
  repsMin: number
  repsMax: number
  rir: string
  note: string
  bodyweight?: boolean
}

export async function addRoutineExercise(routineId: string, input: RoutineExerciseInput) {
  const supabase = createClient()
  const { data: last, error: lastError } = await supabase
    .from('routine_exercises')
    .select('position')
    .eq('routine_id', routineId)
    .order('position', { ascending: false })
    .limit(1)
  if (lastError) throw lastError
  const position = (last?.[0]?.position ?? -1) + 1
  const { error } = await supabase.from('routine_exercises').insert({
    routine_id: routineId,
    name: input.name,
    sets: input.sets,
    reps_min: input.repsMin,
    reps_max: input.repsMax,
    rir: input.rir,
    note: input.note || null,
    bodyweight: input.bodyweight ?? false,
    position,
  })
  if (error) throw error
  notifyChanged()
}

export async function updateRoutineExercise(exerciseId: string, patch: Partial<RoutineExerciseInput>) {
  const supabase = createClient()
  const payload: Record<string, string | number | boolean | null> = {}
  if (patch.name !== undefined) payload.name = patch.name
  if (patch.sets !== undefined) payload.sets = patch.sets
  if (patch.repsMin !== undefined) payload.reps_min = patch.repsMin
  if (patch.repsMax !== undefined) payload.reps_max = patch.repsMax
  if (patch.rir !== undefined) payload.rir = patch.rir
  if (patch.note !== undefined) payload.note = patch.note || null
  if (patch.bodyweight !== undefined) payload.bodyweight = patch.bodyweight
  if (Object.keys(payload).length === 0) return

  const { error } = await supabase
    .from('routine_exercises')
    .update(payload)
    .eq('id', exerciseId)
  if (error) throw error
  notifyChanged()
}

export async function deleteRoutineExercise(exerciseId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('routine_exercises').delete().eq('id', exerciseId)
  if (error) throw error
  notifyChanged()
}

export function useRoutines() {
  const [routines, setRoutines] = useState<ManagedRoutineDay[]>([])
  const userId = useUserId()

  const refresh = useCallback(async (id: string) => {
    try {
      setRoutines(await fetchRoutines(id))
      clearLoadFailure('routines')
    } catch (e) {
      console.error('Failed to load routines', e)
      reportLoadFailure('routines', e, () => refresh(id))
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setRoutines([])
      return
    }
    refresh(userId)
  }, [userId, refresh])

  useEffect(() => {
    if (!userId) return
    const onChanged = () => refresh(userId)
    window.addEventListener(ROUTINES_CHANGED, onChanged)
    return () => window.removeEventListener(ROUTINES_CHANGED, onChanged)
  }, [userId, refresh])

  return routines
}