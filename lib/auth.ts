'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export type Profile = {
  id: string
  username: string | null
}

type SessionState = {
  session: Session | null
  loading: boolean
}

const SERVER_STATE: SessionState = { session: null, loading: true }
let state: SessionState = SERVER_STATE
let initialized = false
const listeners = new Set<() => void>()

function setState(next: SessionState) {
  state = next
  for (const listener of listeners) listener()
}

function ensureInit() {
  if (initialized) return
  initialized = true
  const supabase = createClient()
  supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
    setState({ session: data.session, loading: false })
  })
  supabase.auth.onAuthStateChange((_event: string, next: Session | null) => {
    setState({ session: next, loading: false })
  })
}

function subscribe(onChange: () => void) {
  ensureInit()
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

function getSnapshot(): SessionState {
  return state
}

function getServerSnapshot(): SessionState {
  return SERVER_STATE
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useUserId(): string | null {
  return useSession().session?.user.id ?? null
}

function usernameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const cleaned = local.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24)
  return cleaned || 'user'
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: usernameFromEmail(email) },
    },
  })
  return {
    user: data.user,
    needsConfirmation: !data.session && !!data.user,
    error,
  }
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { session: data.session, error }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export function useProfile(userId: string | null): Profile | null {
  const [profile, setProfile] = useState<Profile | null>(null)
  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('user_id', userId)
      .single()
    setProfile(data ?? null)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return profile
}
