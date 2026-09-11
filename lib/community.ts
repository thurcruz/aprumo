'use client'

import type { VoteCounts } from './votes'

/**
 * Comunidade — escopo do MVP: Desafios, Círculos e Votação.
 *
 * A votação é gravada no banco (`feature_votes`) pela rota `/api/votes`. O
 * voto também fica no localStorage, só como cache: aparece na hora ao abrir a
 * tela, e o servidor confirma ou corrige em seguida. A verdade é o banco.
 */

export type VoteStatus =
  /** Ainda não perguntou ao servidor. */
  | 'idle'
  | 'loading'
  | 'ready'
  /** O servidor não respondeu: o voto mostrado pode não estar registrado. */
  | 'offline'
  /** Sem Supabase configurado (desenvolvimento): voto só local, sem placar. */
  | 'local'

export interface CommunityState {
  vote: string | null
  /** Placar da temporada. Só chega depois que a pessoa vota — regra do servidor. */
  counts: VoteCounts | null
  status: VoteStatus
  /** Um voto está a caminho do servidor. */
  pending: boolean
  error: string | null
}

const KEY = 'aprumo-community'
const BACKEND_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const empty: CommunityState = { vote: null, counts: null, status: 'idle', pending: false, error: null }

/**
 * O estado vive fora do React e é lido por `useSyncExternalStore`. O snapshot é
 * substituído (nunca mutado) a cada mudança, porque o React compara por identidade.
 */
let snapshot: CommunityState = empty
let loaded = false
const listeners = new Set<() => void>()

function emit(next: Partial<CommunityState>) {
  snapshot = { ...snapshot, ...next }
  for (const listener of listeners) listener()
}

function cacheVote(vote: string | null) {
  try { localStorage.setItem(KEY, JSON.stringify({ vote })) } catch { /* ignore quota errors */ }
}

export function getCommunitySnapshot(): CommunityState {
  if (!loaded && typeof window !== 'undefined') {
    loaded = true
    try {
      const raw = localStorage.getItem(KEY)
      const cached = raw ? (JSON.parse(raw) as { vote?: unknown }).vote : null
      snapshot = { ...snapshot, vote: typeof cached === 'string' ? cached : null }
    } catch { /* Sem acesso ao storage o estado vazio serve. */ }
  }
  return snapshot
}

/** No servidor não há voto nem placar — o cliente reidrata com o valor real. */
export function getCommunityServerSnapshot(): CommunityState { return empty }

/**
 * Assinar é o gatilho da primeira busca: acontece depois do render, que é
 * onde efeito colateral pode morar — dentro de `getSnapshot` não pode.
 */
export function subscribeCommunity(listener: () => void) {
  listeners.add(listener)
  if (snapshot.status === 'idle') void loadVotes()
  return () => { listeners.delete(listener) }
}

async function loadVotes() {
  if (!BACKEND_ENABLED) { emit({ status: 'local' }); return }
  emit({ status: 'loading' })
  try {
    const response = await fetch('/api/votes', { cache: 'no-store' })
    if (!response.ok) throw new Error(String(response.status))
    const data = await response.json() as { vote: string | null; counts: VoteCounts | null }
    cacheVote(data.vote)
    // O servidor manda: um voto só no cache local, sem registro, é descartado.
    emit({ vote: data.vote, counts: data.counts, status: 'ready', error: null })
  } catch {
    emit({ status: 'offline' })
  }
}

/**
 * Vota (ou troca de voto). A interface reage na hora e o servidor confirma;
 * se ele recusar, o voto volta ao que era — mostrar um voto que não foi
 * contado seria enganar a pessoa justamente numa votação.
 */
export async function castVote(featureId: string) {
  if (snapshot.pending || snapshot.vote === featureId) return
  const previous = snapshot.vote
  if (!BACKEND_ENABLED) {
    cacheVote(featureId)
    emit({ vote: featureId })
    return
  }
  emit({ vote: featureId, pending: true, error: null })
  try {
    const response = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ featureId }),
    })
    if (!response.ok) throw new Error(String(response.status))
    const data = await response.json() as { vote: string; counts: VoteCounts }
    cacheVote(data.vote)
    emit({ vote: data.vote, counts: data.counts, pending: false, status: 'ready' })
  } catch {
    emit({ vote: previous, pending: false, error: 'Não foi possível registrar seu voto. Tente de novo.' })
  }
}
