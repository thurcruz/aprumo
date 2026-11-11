'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Avatar from '@/components/profile/Avatar'
import Badge from '@/components/ui/Badge'
import { useProfile } from '@/lib/profile'
import { cx } from '@/lib/cx'
import Logo from './Logo'
import { areaNav, isActive, systemNav, type NavItem } from './nav'

export default function Sidebar() {
  const pathname = usePathname()
  // Nome e foto vêm do perfil compartilhado: uma busca só para o menu, o topo e a evolução.
  const { name, avatarUrl } = useProfile()

  const link = (item: NavItem) => {
    const active = isActive(pathname, item)
    const Icon = item.icon
    if (item.soon) return <span key={item.href} aria-disabled className="flex h-10 cursor-default items-center gap-3 rounded-control px-3 text-body-s text-fg-3">
      <Icon size={18} className="shrink-0"/>
      <span className="truncate">{item.label}</span>
      <Badge className="ml-auto h-5 px-2 text-[10px]">Em breve</Badge>
    </span>
    return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
      className={cx('group flex h-10 items-center gap-3 rounded-control px-3 text-body-s no-underline transition-colors duration-200 ease-ap',
        active ? 'bg-surface-pressed font-medium text-fg-1' : 'text-fg-2 hover:bg-surface-hover hover:text-fg-1')}>
      <Icon size={18} className={cx('shrink-0 transition-colors', active ? 'text-area-ink' : 'text-fg-3 group-hover:text-fg-2')}/>
      <span className="truncate">{item.label}</span>
    </Link>
  }

  // theme-dark: o menu lateral é sempre escuro, como marca — também no tema claro (e o logotipo é branco).
  return <aside className="theme-dark fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-canvas px-3 pb-3 pt-6 md:flex">
    <Link href="/hoje" aria-label="Aprumo — ir para Hoje" className="mb-7 flex shrink-0 items-center px-3 no-underline">
      <Logo height={26}/>
    </Link>
    <div className="sidebar-menu-scroll min-h-0 flex-1 overflow-y-auto">
      <p className="mb-1.5 px-3 text-label uppercase text-fg-3">Áreas</p>
      <nav aria-label="Áreas" className="space-y-0.5">{areaNav.map(link)}</nav>
      <p className="mb-1.5 mt-6 px-3 text-label uppercase text-fg-3">Sistema</p>
      <nav aria-label="Sistema" className="space-y-0.5">{systemNav.map(link)}</nav>
    </div>
    <Link href="/perfil" className="mt-3 flex shrink-0 items-center gap-3 rounded-control border-t border-line px-3 pt-3 text-fg-1 no-underline">
      <Avatar name={name} url={avatarUrl} size={32}/>
      <div className="min-w-0"><p className="truncate text-body-s font-medium">{name || 'Sua conta'}</p><p className="truncate text-caption text-fg-3">Ver perfil</p></div>
    </Link>
  </aside>
}
