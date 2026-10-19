'use client'

import { AlertTriangle } from 'lucide-react'
import { useLoadFailure } from '@/lib/load-failure'

export function DataErrorBanner() {
  const failure = useLoadFailure()
  if (!failure) return null

  return (
    <div
      role="alert"
      className="flex shrink-0 items-center justify-between gap-3 border-b border-destructive/40 bg-destructive/10 px-4 py-2.5"
    >
      <span className="flex items-center gap-2 text-xs font-semibold text-destructive">
        <AlertTriangle className="size-4 shrink-0" />
        Could not load {failure.source}. Check your connection.
      </span>
      {failure.retry && (
        <button
          type="button"
          onClick={failure.retry}
          className="rounded-lg border border-destructive/40 px-2.5 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/15"
        >
          Retry
        </button>
      )}
    </div>
  )
}
