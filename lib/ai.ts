'use client'

import { MUSCLE_GROUPS, type MuscleGroup } from '@/lib/muscles'
import {
  ADVICE_SEVERITIES,
  type CoachSummary,
  type TrainingAdvice,
} from '@/lib/coach'
import {
  sanitizeRoutinePlan,
  type ChatTurn,
  type RoutinePlan,
} from '@/lib/routine-plan'

export type Classification = {
  muscleGroup: MuscleGroup
  confidence: number
}

export type ChatLibraryItem = {
  name: string
  muscleGroup: MuscleGroup | null
}

export type ChatError =
  | 'unauthorized'
  | 'invalid_body'
  | 'rate_limited'
  | 'ai_not_configured'
  | 'quota_unavailable'
  | 'invalid_table'
  | 'chat_failed'
  | 'network'

export type ChatResult =
  | { ok: true; reply: string; table: RoutinePlan | null }
  | { ok: false; error: ChatError }

const TIMEOUT_MS = 10000
const CHAT_TIMEOUT_MS = 30000
const CHAT_ERRORS: readonly ChatError[] = [
  'unauthorized',
  'invalid_body',
  'rate_limited',
  'ai_not_configured',
  'quota_unavailable',
  'invalid_table',
  'chat_failed',
  'network',
]

function chatError(value: unknown): ChatError {
  return typeof value === 'string' && (CHAT_ERRORS as readonly string[]).includes(value)
    ? (value as ChatError)
    : 'chat_failed'
}

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

export async function sendCoachChat(
  messages: ChatTurn[],
  library: ChatLibraryItem[],
): Promise<ChatResult> {
  try {
    const response = await fetch('/api/coach-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages, library }),
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    })

    if (!response.ok) {
      let error: unknown
      try {
        error = ((await response.json()) as Record<string, unknown>).error
      } catch {}
      return { ok: false, error: chatError(error) }
    }

    const data = (await response.json()) as Record<string, unknown>
    if (typeof data.reply !== 'string' || !data.reply.trim()) {
      return { ok: false, error: 'chat_failed' }
    }

    if (data.table == null) {
      return { ok: true, reply: data.reply.trim(), table: null }
    }

    const table = sanitizeRoutinePlan(data.table)
    if (!table) return { ok: false, error: 'invalid_table' }
    return { ok: true, reply: data.reply.trim(), table }
  } catch {
    return { ok: false, error: 'network' }
  }
}
