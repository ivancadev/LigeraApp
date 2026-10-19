'use client'

import { MUSCLE_GROUPS, type MuscleGroup } from '@/lib/muscles'
import {
  ADVICE_SEVERITIES,
  type CoachSummary,
  type TrainingAdvice,
} from '@/lib/coach'

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

export async function fetchAdvice(summary: CoachSummary): Promise<TrainingAdvice | null> {
  try {
    const response = await fetch('/api/coach-advice', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(summary),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) return null

    const data = (await response.json()) as Record<string, unknown>
    if (typeof data.severity !== 'string') return null
    if (!(ADVICE_SEVERITIES as readonly string[]).includes(data.severity)) return null
    if (typeof data.headline !== 'string' || typeof data.body !== 'string') return null

    const actions = Array.isArray(data.actions)
      ? data.actions.filter((action): action is string => typeof action === 'string').slice(0, 3)
      : []

    return {
      severity: data.severity as TrainingAdvice['severity'],
      headline: data.headline,
      body: data.body,
      actions,
    }
  } catch {
    return null
  }
}
