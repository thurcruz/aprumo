'use client'

import type { CommunityPost } from './posts'

/**
 * Mural da comunidade no navegador: carrega, publica e apaga pela rota
 * /api/community/posts. Vive fora do React e é lido por useSyncExternalStore,
 * como a votação.
 */

export type FeedStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  /** O servidor não respondeu: fica o que já tinha carregado. */
  | 'offline'
  /** Sem Supabase configurado (desenvolvimento): não há mural. */
  | 'local'
  /** A migração do mural ainda não foi aplicada no banco. */
  | 'unavailable'

export interface FeedState {
  posts: CommunityPost[]
  status: FeedStatus
  /** Quando o mural foi buscado — é o "agora" do tempo relativo, sem ler o relógio no render. */
  loadedAt: number
}

export type PublishResult = { ok: true; post: CommunityPost } | { ok: false; error: string }

const BACKEND_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
/** Voltar para a tela depois disso busca de novo: o mural muda sem você. */
const STALE_MS = 30_000
const empty: FeedState = { posts: [], status: 'idle', loadedAt: 0 }

let snapshot: FeedState = empty
let loading = false
const listeners = new Set<() => void>()

function emit(next: Partial<FeedState>) {
  snapshot = { ...snapshot, ...next }
  for (const listener of listeners) listener()
}

export function getFeedSnapshot(): FeedState { return snapshot }
export function getFeedServerSnapshot(): FeedState { return empty }

/** Assinar dispara a busca — depois do render, onde efeito colateral pode morar. */
export function subscribeFeed(listener: () => void) {
  listeners.add(listener)
  if (snapshot.status === 'idle' || Date.now() - snapshot.loadedAt > STALE_MS) void loadFeed()
  return () => { listeners.delete(listener) }
}

async function loadFeed() {
  if (loading) return
  if (!BACKEND_ENABLED) { emit({ status: 'local' }); return }
  loading = true
  if (snapshot.status === 'idle') emit({ status: 'loading' })
  try {
    const response = await fetch('/api/community/posts', { cache: 'no-store' })
    const data = await response.json().catch(() => null) as { posts?: CommunityPost[]; code?: string } | null
    if (data?.code === 'not_ready') emit({ status: 'unavailable', loadedAt: Date.now() })
    else if (!response.ok || !Array.isArray(data?.posts)) throw new Error(String(response.status))
    else emit({ posts: data.posts, status: 'ready', loadedAt: Date.now() })
  } catch {
    emit({ status: 'offline', loadedAt: Date.now() })
  } finally {
    loading = false
  }
}

/** Publica uma sessão de foco. O servidor lê a sessão gravada; daqui só vão o id e a escolha de mostrar o nome. */
export async function publishFocusSession(sessionId: string, showName: boolean): Promise<PublishResult> {
  if (!BACKEND_ENABLED) return { ok: false, error: 'Sem servidor configurado: o mural só funciona com a conta conectada.' }
  try {
    const response = await fetch('/api/community/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, showName }),
    })
    const data = await response.json().catch(() => null) as { post?: CommunityPost; error?: string } | null
    if (!response.ok || !data?.post) return { ok: false, error: data?.error ?? 'Não foi possível publicar agora.' }
    const post = data.post
    emit({ posts: [post, ...snapshot.posts.filter(item => item.id !== post.id)] })
    return { ok: true, post }
  } catch {
    return { ok: false, error: 'Sem conexão com o servidor. Tente de novo.' }
  }
}

/** Apaga uma publicação sua. Some da tela na hora; se o servidor recusar, ela volta. */
export async function deletePost(id: string): Promise<boolean> {
  const previous = snapshot.posts
  emit({ posts: previous.filter(post => post.id !== id) })
  try {
    const response = await fetch(`/api/community/posts?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!response.ok) throw new Error(String(response.status))
    return true
  } catch {
    emit({ posts: previous })
    return false
  }
}
