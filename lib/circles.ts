'use client'

/**
 * Círculos no navegador: carrega, cria, entra e sai pela rota
 * /api/community/circles. Mesmo padrão de lib/feed.ts e lib/challenges.ts.
 */

export interface CircleSummary {
  id: string
  name: string
  tag: string
  description: string
  visibility: string
  isOwner: boolean
  joined: boolean
  memberCount: number
}

export type CirclesStatus = 'idle' | 'loading' | 'ready' | 'offline' | 'local' | 'unavailable'

export interface CirclesState {
  circles: CircleSummary[]
  status: CirclesStatus
  loadedAt: number
  pendingIds: Set<string>
  creating: boolean
  error: string | null
}

const BACKEND_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const STALE_MS = 30_000
const empty: CirclesState = { circles: [], status: 'idle', loadedAt: 0, pendingIds: new Set(), creating: false, error: null }

let snapshot: CirclesState = empty
let loading = false
const listeners = new Set<() => void>()

function emit(next: Partial<CirclesState>) {
  snapshot = { ...snapshot, ...next }
  for (const listener of listeners) listener()
}

export function getCirclesSnapshot(): CirclesState { return snapshot }
export function getCirclesServerSnapshot(): CirclesState { return empty }

export function subscribeCircles(listener: () => void) {
  listeners.add(listener)
  if (snapshot.status === 'idle' || Date.now() - snapshot.loadedAt > STALE_MS) void loadCircles()
  return () => { listeners.delete(listener) }
}

async function loadCircles() {
  if (loading) return
  if (!BACKEND_ENABLED) { emit({ status: 'local' }); return }
  loading = true
  if (snapshot.status === 'idle') emit({ status: 'loading' })
  try {
    const response = await fetch('/api/community/circles', { cache: 'no-store' })
    const data = await response.json().catch(() => null) as { circles?: CircleSummary[]; code?: string } | null
    if (data?.code === 'not_ready') emit({ status: 'unavailable', loadedAt: Date.now() })
    else if (!response.ok || !Array.isArray(data?.circles)) throw new Error(String(response.status))
    else emit({ circles: data.circles, status: 'ready', loadedAt: Date.now() })
  } catch {
    emit({ status: 'offline', loadedAt: Date.now() })
  } finally {
    loading = false
  }
}

async function mutate(circleId: string, action: 'join' | 'leave'): Promise<{ ok: boolean; error?: string }> {
  const pending = new Set(snapshot.pendingIds); pending.add(circleId)
  emit({ pendingIds: pending, error: null })
  try {
    const response = await fetch('/api/community/circles', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, circleId }),
    })
    const data = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null
    if (!response.ok || !data?.ok) { const message = data?.error ?? 'Não foi possível concluir agora.'; emit({ error: message }); return { ok: false, error: message } }
    await loadCircles()
    return { ok: true }
  } catch {
    emit({ error: 'Sem conexão com o servidor. Tente de novo.' })
    return { ok: false }
  } finally {
    const next = new Set(snapshot.pendingIds); next.delete(circleId)
    emit({ pendingIds: next })
  }
}

export const joinCircle = (id: string) => mutate(id, 'join')
export const leaveCircle = (id: string) => mutate(id, 'leave')

export async function createCircle(input: { name: string; tag?: string; description?: string }): Promise<{ ok: boolean; error?: string }> {
  emit({ creating: true, error: null })
  try {
    const response = await fetch('/api/community/circles', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...input }),
    })
    const data = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null
    if (!response.ok || !data?.ok) { const message = data?.error ?? 'Não foi possível criar agora.'; emit({ error: message }); return { ok: false, error: message } }
    await loadCircles()
    return { ok: true }
  } catch {
    emit({ error: 'Sem conexão com o servidor. Tente de novo.' })
    return { ok: false }
  } finally {
    emit({ creating: false })
  }
}
