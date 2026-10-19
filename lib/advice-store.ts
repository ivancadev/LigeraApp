import { ADVICE_SEVERITIES, type TrainingAdvice } from '@/lib/coach'

const STORAGE_KEY = 'ligera:advice'

export type StoredAdvice = {
  userId: string
  date: string
  advice: TrainingAdvice
  dismissed: boolean
}

export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isAdvice(value: unknown): value is TrainingAdvice {
  if (typeof value !== 'object' || value == null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.severity === 'string' &&
    (ADVICE_SEVERITIES as readonly string[]).includes(v.severity) &&
    typeof v.headline === 'string' &&
    typeof v.body === 'string' &&
    Array.isArray(v.actions) &&
    v.actions.every((a) => typeof a === 'string')
  )
}

export function loadAdvice(userId: string | null | undefined): StoredAdvice | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed.userId !== userId) return null
    if (parsed.date !== todayKey()) return null
    if (!isAdvice(parsed.advice)) return null
    return {
      userId,
      date: parsed.date as string,
      advice: parsed.advice,
      dismissed: parsed.dismissed === true,
    }
  } catch {
    return null
  }
}

export function saveAdvice(state: StoredAdvice): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export function clearAdvice(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
