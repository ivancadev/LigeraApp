'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Send, Sparkles, Trash2, X } from 'lucide-react'
import { useExercises } from '@/lib/exercises'
import { useUserId } from '@/lib/auth'
import { sendCoachChat, type ChatError, type ChatLibraryItem } from '@/lib/ai'
import {
  clearChat,
  loadChat,
  newChatMessage,
  saveChat,
  type ChatMessage,
} from '@/lib/chat-store'
import type { ChatTurn } from '@/lib/routine-plan'
import { RoutineTable } from '@/components/routine-table'
import { cn } from '@/lib/utils'

const QUICK_PROMPTS = [
  'Hazme una tabla de 4 días upper/lower',
  'Quiero 5 días push/pull/legs',
  'Tabla de 3 días full body con mancuernas',
]

const ERROR_TEXT: Record<ChatError, string> = {
  unauthorized: 'Please sign in again.',
  invalid_body: 'That message is too long. Try a shorter request.',
  rate_limited: 'Daily AI limit reached. Try again tomorrow.',
  ai_not_configured: 'AI is not configured yet.',
  quota_unavailable: 'AI quota is unavailable right now.',
  invalid_table: 'The generated table was invalid. Try again.',
  chat_failed: "The coach couldn't answer. Try again.",
  network: 'Connection lost. Try again.',
}

export function CoachChat({
  onClose,
  onOpenRoutines,
}: {
  onClose: () => void
  onOpenRoutines: () => void
}) {
  const userId = useUserId()
  const library = useExercises()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const chatLibrary = useMemo<ChatLibraryItem[]>(
    () => library.map((exercise) => ({ name: exercise.name, muscleGroup: exercise.muscleGroup })),
    [library],
  )

  useEffect(() => {
    setMessages(loadChat(userId))
  }, [userId])

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, loading, error])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function persist(next: ChatMessage[]) {
    setMessages(next)
    saveChat(userId, next)
  }

  async function submit(text: string) {
    const content = text.trim()
    if (!content || loading || !userId) return

    const userMessage = newChatMessage('user', content)
    const history = [...messages, userMessage]
    const turns: ChatTurn[] = history.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
      ...(message.table ? { table: message.table } : {}),
    }))

    setMessages(history)
    setInput('')
    setError(null)
    setLoading(true)

    const result = await sendCoachChat(turns, chatLibrary)
    setLoading(false)

    if (!result.ok) {
      setMessages(messages)
      saveChat(userId, messages)
      setInput(content)
      setError(ERROR_TEXT[result.error])
      return
    }

    persist([...history, newChatMessage('assistant', result.reply, result.table)])
  }

  function handleClear() {
    if (!window.confirm('Clear this chat?')) return
    clearChat()
    setMessages([])
    setError(null)
  }

  function discardTable(messageId: string) {
    persist(messages.map((message) => (message.id === messageId ? { ...message, table: null } : message)))
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI coach chat"
      className="absolute inset-0 z-50 flex flex-col bg-background"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/60 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              AI Coach
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              Ask for a workout table
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleClear}
            disabled={messages.length === 0 || loading}
            aria-label="Clear chat"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading ? (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Sparkles className="size-6" />
            </span>
            <p className="mt-3 text-base font-semibold text-foreground">
              Ask for a workout table
            </p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
              Tell me your goal, days per week and equipment. I can also refine a table
              you already have.
            </p>
            <div className="mt-4 flex w-full flex-col gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submit(prompt)}
                  disabled={loading || !userId}
                  className="rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-secondary disabled:opacity-40"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex flex-col gap-2',
                  message.role === 'user' ? 'items-end' : 'items-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl px-3.5 py-2.5',
                    message.role === 'user'
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md border border-border bg-card text-foreground',
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm text-pretty">{message.content}</p>
                </div>
                {message.role === 'assistant' && message.table && (
                  <div className="w-full">
                    <RoutineTable
                      plan={message.table}
                      onDiscard={() => discardTable(message.id)}
                      onOpenRoutines={onOpenRoutines}
                    />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                  <RefreshCw className="size-3.5 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-card/60 px-3 pb-3 pt-3 backdrop-blur">
        {error && (
          <p className="mb-2 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-[11px] font-semibold text-destructive">
            {error}
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit(input)
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit(input)
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Ask for a table or a training question…"
            className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || !userId}
            aria-label="Send message"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          AI guidance, not medical advice.
        </p>
      </div>
    </div>
  )
}
