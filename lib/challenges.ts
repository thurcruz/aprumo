'use client'

/**
 * Desafios no navegador: carrega, entra, sai e faz check-in pela rota
 * /api/community/challenges. Mesmo padrão de lib/feed.ts — vive fora do
 * React, lido por useSyncExternalStore.
 */

export interface ChallengeSummary {
  id: string
  slug: string
  title: string
  description: string
  coverUrl: string | null
  durationDays: number
  startsOn: string | null
  endsOn: string | null
  participantCount: number
  joined: boolean
  completedAt: string | null
  checkinsCount: number
}

export type ChallengesStatus = 'idle' | 'loading' | 'ready' | 'offline' | 'local' | 'unavailable'

export interface ChallengesState {
  challenges: ChallengeSummary[]
  status: ChallengesStatus
  loadedAt: number
  pendingIds: Set<string>
  error: string | null
}

const BACKEND_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const STALE_MS = 30_000
const empty: ChallengesState = { challenges: [], status: 'idle', loadedAt: 0, pendingIds: new Set(), error: null }

let snapshot: ChallengesState = empty
let loading = false
const listeners = new Set<() => void>()

function emit(next: Partial<ChallengesState>) {
  snapshot = { ...snapshot, ...next }
  for (const listener of listeners) listener()
}

export function getChallengesSnapshot(): ChallengesState { return snapshot }
export function getChallengesServerSnapshot(): ChallengesState { return empty }

export function subscribeChallenges(listener: () => void) {
  listeners.add(listener)
  if (snapshot.status === 'idle' || Date.now() - snapshot.loadedAt > STALE_MS) void loadChallenges()
  return () => { listeners.delete(listener) }
}

async function loadChallenges() {
  if (loading) return
  if (!BACKEND_ENABLED) { emit({ status: 'local' }); return }
  loading = true
  if (snapshot.status === 'idle') emit({ status: 'loading' })
  try {
    const response = await fetch('/api/community/challenges', { cache: 'no-store' })
    const data = await response.json().catch(() => null) as { challenges?: ChallengeSummary[]; code?: string } | null
    if (data?.code === 'not_ready') emit({ status: 'unavailable', loadedAt: Date.now() })
    else if (!response.ok || !Array.isArray(data?.challenges)) throw new Error(String(response.status))
    else emit({ challenges: data.challenges, status: 'ready', loadedAt: Date.now() })
  } catch {
    emit({ status: 'offline', loadedAt: Date.now() })
  } finally {
    loading = false
  }
}

async function mutate(challengeId: string, action: 'join' | 'leave' | 'checkin', extra?: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const pending = new Set(snapshot.pendingIds); pending.add(challengeId)
  emit({ pendingIds: pending, error: null })
  try {
    const response = await fetch('/api/community/challenges', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, challengeId, ...extra }),
    })
    const data = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null
    if (!response.ok || !data?.ok) { const message = data?.error ?? 'Não foi possível concluir agora.'; emit({ error: message }); return { ok: false, error: message } }
    await loadChallenges()
    return { ok: true }
  } catch {
    emit({ error: 'Sem conexão com o servidor. Tente de novo.' })
    return { ok: false }
  } finally {
    const next = new Set(snapshot.pendingIds); next.delete(challengeId)
    emit({ pendingIds: next })
  }
}

export const joinChallenge = (id: string) => mutate(id, 'join')
export const leaveChallenge = (id: string) => mutate(id, 'leave')
export const checkinChallenge = (id: string, note?: string) => mutate(id, 'checkin', note ? { note } : undefined)
