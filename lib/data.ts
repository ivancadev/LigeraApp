'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUserId } from '@/lib/auth'
import { clearLoadFailure, reportLoadFailure } from '@/lib/load-failure'

export const WORKOUTS_CHANGED = 'ligera:workouts-changed'

export type LoggedSet = {
  kg: number
  reps: number
  rir?: number | null
}

export type LoggedExercise = {
  id: string
  name: string
  sets: LoggedSet[]
}

export type Workout = {
  id: string
  date: string
  elapsedSeconds: number
  name?: string | null
  exercises: LoggedExercise[]
}

type WorkoutRow = {
  id: string
  date: string
  elapsed_seconds: number
  name: string | null
  workout_exercises: {
    id: string
    name: string
    position: number
    workout_sets: {
      kg: number
      reps: number
      rir: number | null
      position: number
    }[]
  }[]
}

export function fetchWorkouts(userId: string): Promise<Workout[]> {
  const supabase = createClient()
  return supabase
    .from('workouts')
    .select(
      'id, date, elapsed_seconds, name, workout_exercises(id, name, position, workout_sets(kg, reps, rir, position))',
    )
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .then(({ data, error }: { data: WorkoutRow[] | null; error: { message: string } | null }) => {
      if (error) throw error
      const rows = (data ?? []) as WorkoutRow[]
      return rows.map((row) => ({
        id: row.id,
        date: row.date,
        elapsedSeconds: row.elapsed_seconds,
        name: row.name,
        exercises: [...row.workout_exercises]
          .sort((a, b) => a.position - b.position)
          .map((ex) => ({
            id: ex.id,
            name: ex.name,
            sets: [...ex.workout_sets]
              .sort((a, b) => a.position - b.position)
              .map((s) => ({ kg: s.kg, reps: s.reps, rir: s.rir })),
          })),
      }))
    })
}

function notifyChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(WORKOUTS_CHANGED))
}

export async function saveWorkout(userId: string, workout: Workout) {
  const supabase = createClient()
  const { error } = await supabase.rpc('log_workout', {
    p_user_id: userId,
    p_date: workout.date,
    p_elapsed: workout.elapsedSeconds,
    p_name: workout.name ?? null,
    p_exercises: workout.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((s) => ({ kg: s.kg, reps: s.reps, rir: s.rir ?? null })),
    })),
  })
  if (error) throw error
  notifyChanged()
}

export async function updateWorkout(
  workoutId: string,
  elapsedSeconds: number | null,
  exercises: { name: string; sets: LoggedSet[] }[],
  name: string | null = null,
) {
  const supabase = createClient()
  const { error } = await supabase.rpc('update_logged_workout', {
    p_workout_id: workoutId,
    p_elapsed: elapsedSeconds,
    p_name: name,
    p_exercises: exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((s) => ({ kg: s.kg, reps: s.reps, rir: s.rir ?? null })),
    })),
  })
  if (error) throw error
  notifyChanged()
}

export async function deleteWorkout(workoutId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId)
  if (error) throw error
  notifyChanged()
}

export async function deleteExercise(exerciseId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('workout_exercises').delete().eq('id', exerciseId)
  if (error) throw error
  notifyChanged()
}

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const userId = useUserId()

  const refresh = useCallback(async (id: string) => {
    try {
      setWorkouts(await fetchWorkouts(id))
      clearLoadFailure('workouts')
    } catch (e) {
      console.error('Failed to load workouts', e)
      reportLoadFailure('workouts', e, () => refresh(id))
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setWorkouts([])
      return
    }
    refresh(userId)
  }, [userId, refresh])

  useEffect(() => {
    if (!userId) return
    const onChanged = () => refresh(userId)
    window.addEventListener(WORKOUTS_CHANGED, onChanged)
    return () => window.removeEventListener(WORKOUTS_CHANGED, onChanged)
  }, [userId, refresh])

  return workouts
}