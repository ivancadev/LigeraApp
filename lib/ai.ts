'use client'

import { MUSCLE_GROUPS, type MuscleGroup } from '@/lib/muscles'

export type Classification = {
  muscleGroup: MuscleGroup
  confidence: number
}

const TIMEOUT_MS = 10000

function isMuscleGroup(value: unknown): value is MuscleGroup {
  return typeof value === 'string' && (MUSCLE_GROUPS as readonly string[]).includes(value)
}

export async function classifyExercise(name: string): Promise<Classification | null> {
  const trimmed = name.trim()
  if (trimmed.length < 2) return null

  try {
    const response = await fetch('/api/classify-exercise', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) return null

    const data = (await response.json()) as { muscleGroup?: unknown; confidence?: unknown }
    if (!isMuscleGroup(data.muscleGroup)) return null

    const confidence =
      typeof data.confidence === 'number' && Number.isFinite(data.confidence)
        ? Math.min(1, Math.max(0, data.confidence))
        : 0.5

    return { muscleGroup: data.muscleGroup, confidence }
  } catch {
    return null
  }
}
