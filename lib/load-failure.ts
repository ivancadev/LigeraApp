'use client'

import { useSyncExternalStore } from 'react'

export const LOAD_FAILURE_CHANGED = 'ligera:load-failure-changed'

export type LoadFailure = {
  source: string
  message: string
  retry?: () => void
}

let failure: LoadFailure | null = null

function emit() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(LOAD_FAILURE_CHANGED))
}

export function reportLoadFailure(source: string, error: unknown, retry?: () => void) {
  failure = {
    source,
    message: error instanceof Error ? error.message : String(error),
    retry,
  }
  emit()
}

export function clearLoadFailure(source: string) {
  if (failure?.source !== source) return
  failure = null
  emit()
}

function subscribe(onChange: () => void) {
  window.addEventListener(LOAD_FAILURE_CHANGED, onChange)
  return () => window.removeEventListener(LOAD_FAILURE_CHANGED, onChange)
}

export function useLoadFailure(): LoadFailure | null {
  return useSyncExternalStore(
    subscribe,
    () => failure,
    () => null,
  )
}
