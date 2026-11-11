import type { LucideIcon } from 'lucide-react'
import { Blocks, Route, Settings, Sparkles, Sun, UserRound, UsersRound } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Rotas que pertencem a este item: a área continua acesa dentro das suas subpáginas. */
  also?: string[]
}

/** Os cinco destinos. A mesma lista alimenta o menu lateral e a barra de baixo. */
export const areaNav: NavItem[] = [
  { href: '/hoje', label: 'Hoje', icon: Sun, also: ['/agenda', '/tarefas', '/metas', '/foco', '/emocional'] },
  { href: '/comunidade', label: 'Comunidade', icon: UsersRound },
  { href: '/pri', label: 'Pri', icon: Sparkles },
  { href: '/planos', label: 'Planos', icon: Route },
  { href: '/extensoes', label: 'Extensões', icon: Blocks, also: ['/financas', '/treino', '/saude', '/mente', '/antivicio'] },
]

export const systemNav: NavItem[] = [
  { href: '/perfil', label: 'Minha evolução', icon: UserRound },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

export function isActive(pathname: string, item: NavItem): boolean {
  return matches(pathname, item.href) || (item.also ?? []).some(href => matches(pathname, href))
}
