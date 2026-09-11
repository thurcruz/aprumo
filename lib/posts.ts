/**
 * Mural da comunidade: o formato de uma publicação e as regras de exibição.
 *
 * Sem 'use client' de propósito — a rota do servidor usa `toPost`. O estado do
 * mural no navegador fica em `feed.ts`.
 */

export interface CommunityPost {
  id: string
  authorName: string
  authorAvatarUrl: string | null
  minutes: number
  plannedMinutes: number
  status: 'completed' | 'abandoned'
  /** Só existe quando o autor escolheu mostrar no que focou. */
  name: string | null
  createdAt: string
  /** A publicação é de quem está vendo — só isso sai do servidor, nunca o id do autor. */
  mine: boolean
}

/** Linha de `community_posts` como vem do banco. */
export interface PostRow {
  id: string
  user_id: string
  author_name: string
  author_avatar_url: string | null
  body: unknown
  created_at: string
}

const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0

/** O corpo é jsonb: confere cada campo em vez de confiar no formato. */
export function toPost(row: PostRow, viewerId: string): CommunityPost {
  const body = row.body && typeof row.body === 'object' && !Array.isArray(row.body) ? row.body as Record<string, unknown> : {}
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  return {
    id: row.id,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
    minutes: count(body.minutes),
    plannedMinutes: count(body.planned_minutes),
    status: body.status === 'abandoned' ? 'abandoned' : 'completed',
    name: name || null,
    createdAt: row.created_at,
    mine: row.user_id === viewerId,
  }
}

/** "25 min de foco em “Projeto”" — o nome só entra se o autor quis mostrar. */
export function postHeadline(post: Pick<CommunityPost, 'minutes' | 'name'>): string {
  const time = `${post.minutes} min de foco`
  return post.name ? `${time} em “${post.name}”` : time
}

/** "agora", "há 12 min", "há 3 h", "ontem", "há 4 dias" e, depois de uma semana, a data. */
export function timeAgo(iso: string, now: number): string {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000)
  if (!Number.isFinite(minutes) || minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(iso))
}
