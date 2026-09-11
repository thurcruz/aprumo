'use client'

import { useSyncExternalStore } from 'react'

/**
 * Identidade da pessoa — nome, propósito, foto — compartilhada entre o menu,
 * o topo e a página de evolução. Uma busca só, feita na primeira assinatura,
 * em vez de cada componente pedir o perfil por conta própria.
 */
export interface Profile {
  name: string
  purpose: string
  avatarUrl: string | null
  email: string | null
}

const BACKEND_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const empty: Profile = { name: '', purpose: '', avatarUrl: null, email: null }

let snapshot: Profile = empty
let status: 'idle' | 'loading' | 'ready' = 'idle'
const listeners = new Set<() => void>()

function emit(next: Partial<Profile>) {
  snapshot = { ...snapshot, ...next }
  for (const listener of listeners) listener()
}

async function load() {
  if (!BACKEND_ENABLED) { status = 'ready'; return }
  status = 'loading'
  try {
    const response = await fetch('/api/profile', { cache: 'no-store' })
    if (!response.ok) throw new Error(String(response.status))
    const data = await response.json() as { profile?: { display_name?: string | null; purpose?: string | null; avatar_url?: string | null }; email?: string | null }
    status = 'ready'
    emit({ name: data.profile?.display_name ?? '', purpose: data.profile?.purpose ?? '', avatarUrl: data.profile?.avatar_url ?? null, email: data.email ?? null })
  } catch {
    // Falhou: a próxima assinatura tenta de novo.
    status = 'idle'
  }
}

/** Assinar é o gatilho da busca: acontece depois do render, onde efeito pode morar. */
export function subscribeProfile(listener: () => void) {
  listeners.add(listener)
  if (status === 'idle') void load()
  return () => { listeners.delete(listener) }
}

export function getProfile(): Profile { return snapshot }
export function getProfileServer(): Profile { return empty }

/** Reflete uma edição que o servidor já confirmou. */
export function updateProfile(patch: Partial<Profile>) { emit(patch) }

export function useProfile(): Profile {
  return useSyncExternalStore(subscribeProfile, getProfile, getProfileServer)
}

/** "Arthur Cruz" → "AC". Sem nome, "A" de Aprumo. */
export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'A'
}
