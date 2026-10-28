'use client'

import { createClient } from '@/lib/supabase/client'
import { ROUTINES_CHANGED } from '@/lib/routines'
import { EXERCISES_CHANGED } from '@/lib/exercises'
import type { RoutinePlanDay } from '@/lib/routine-plan'

export type RoutineSaveMode = 'append' | 'replace'

export async function saveRoutinePlan(
  days: RoutinePlanDay[],
  mode: RoutineSaveMode,
): Promise<void> {
  if (days.length === 0) return

  const supabase = createClient()
  const { error } = await supabase.rpc('save_generated_routines', {
    p_days: days,
    p_mode: mode,
  })
  if (error) throw error

  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ROUTINES_CHANGED))
  window.dispatchEvent(new Event(EXERCISES_CHANGED))
}
