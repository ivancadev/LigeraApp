import { sanitizeRoutinePlan, type ChatRole, type RoutinePlan } from '@/lib/routine-plan'

const STORAGE_KEY = 'ligera:chat'
const MAX_MESSAGES = 40
const MAX_CONTENT_LENGTH = 2000

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  table: RoutinePlan | null
  createdAt: number
}

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function toMessage(value: unknown): ChatMessage | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  if (raw.role !== 'user' && raw.role !== 'assistant') return null
  if (typeof raw.content !== 'string') return null

  const content = raw.content.trim().slice(0, MAX_CONTENT_LENGTH)
  if (!content) return null

  const table =
    raw.role === 'assistant' && raw.table != null ? sanitizeRoutinePlan(raw.table) : null

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    role: raw.role,
    content,
    table,
    createdAt:
      typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : Date.now(),
  }
}

export function loadChat(userId: string | null | undefined): ChatMessage[] {
  if (typeof window === 'undefined' || !userId) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed.userId !== userId || !Array.isArray(parsed.messages)) return []
    return parsed.messages
      .map(toMessage)
      .filter((message): message is ChatMessage => message !== null)
      .slice(-MAX_MESSAGES)
  } catch {
    return []
  }
}

export function saveChat(userId: string | null | undefined, messages: ChatMessage[]): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId, messages: messages.slice(-MAX_MESSAGES) }),
    )
  } catch {}
}

export function clearChat(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function newChatMessage(
  role: ChatRole,
  content: string,
  table: RoutinePlan | null = null,
): ChatMessage {
  return {
    id: newId(),
    role,
    content: content.trim().slice(0, MAX_CONTENT_LENGTH),
    table,
    createdAt: Date.now(),
  }
}
