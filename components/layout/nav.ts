import type { LucideIcon } from 'lucide-react'
import { Blocks, Route, Settings, Sparkles, Sun, UserRound, UsersRound } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Rotas que pertencem a este item: a área continua acesa dentro das suas subpáginas. */
  also?: string[]
  /** Aparece no menu com o selo "Em breve", sem levar a lugar nenhum. */
  soon?: boolean
}

/**
 * Comunidade fechada no lançamento: sem gente, mural e círculos vazios passam
 * a impressão de app abandonado. Virar para true reabre menu, tela e publicação.
 */
export const COMMUNITY_OPEN = false

/** Os cinco destinos. A mesma lista alimenta o menu lateral e a barra de baixo. */
export const areaNav: NavItem[] = [
  { href: '/hoje', label: 'Hoje', icon: Sun, also: ['/foco', '/emocional'] },
  { href: '/pri', label: 'Pri', icon: Sparkles },
  { href: '/planos', label: 'Planos', icon: Route },
  { href: '/extensoes', label: 'Extensões', icon: Blocks, also: ['/financas', '/treino', '/saude', '/mente', '/antivicio'] },
  { href: '/comunidade', label: 'Comunidade', icon: UsersRound, soon: !COMMUNITY_OPEN },
]

export const systemNav: NavItem[] = [
  { href: '/perfil', label: 'Minha evolução', icon: UserRound },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

export function isActive(pathname: string, item: NavItem): boolean {
  return matches(pathname, item.href) || (item.also ?? []).some(href => matches(pathname, href))
}
