import type { DraftExercise, DraftSet } from '@/lib/workout-data'

const STORAGE_KEY = 'ligera:session'

export type SessionState = {
  userId: string
  draft: DraftExercise[]
  startedAt: number | null
  accumulated: number
  name: string | null
}

function isSet(value: unknown): value is DraftSet {
  if (typeof value !== 'object' || value == null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.kg === 'number' &&
    typeof v.reps === 'number' &&
    typeof v.done === 'boolean'
  )
}

function isDraft(value: unknown): value is DraftExercise {
  if (typeof value !== 'object' || value == null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.sets) &&
    v.sets.every(isSet)
  )
}

export function loadSession(userId: string | null | undefined): SessionState | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed.userId !== userId) return null
    if (!Array.isArray(parsed.draft) || !parsed.draft.every(isDraft)) return null
    const draft = parsed.draft.filter((ex) => ex.sets.length > 0)
    return {
      userId,
      draft,
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
      accumulated: typeof parsed.accumulated === 'number' ? parsed.accumulated : 0,
      name: typeof parsed.name === 'string' ? parsed.name : null,
    }
  } catch {
    return null
  }
}

export function saveSession(state: SessionState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export function clearSession() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {}
}