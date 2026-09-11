'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Brain, CircleDollarSign, HeartPulse, Settings, Sparkles, Sun, UserRound, UsersRound } from 'lucide-react'
import Avatar from '@/components/profile/Avatar'
import { useProfile } from '@/lib/profile'

const primary = [
  { href: '/hoje', label: 'Hoje', icon: Sun },
  { href: '/comunidade', label: 'Comunidade', icon: UsersRound },
  { href: '/saude', label: 'Saúde', icon: HeartPulse },
  { href: '/mente', label: 'Mente', icon: Brain },
  { href: '/financas', label: 'Finanças', icon: CircleDollarSign },
]
const system = [
  { href: '/pri', label: 'Pri', icon: Bot },
  { href: '/perfil', label: 'Minha evolução', icon: UserRound },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  // Nome e foto vêm do perfil compartilhado: uma busca só para o menu, o topo e a evolução.
  const { name, avatarUrl } = useProfile()
  const group = (items: typeof primary) => items.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`)
    return <Link key={href} href={href} className="flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] no-underline transition-all" style={{ color: active ? '#11130f' : 'var(--muted)', background: active ? 'var(--energy)' : 'transparent' }}><Icon size={17}/><span>{label}</span></Link>
  })
  // theme-dark: o menu lateral é sempre escuro, como marca — também no tema claro.
  return <aside className="theme-dark glass fixed bottom-5 left-5 top-5 z-40 hidden w-[224px] flex-col overflow-hidden rounded-[28px] p-4 md:flex">
    <Link href="/hoje" className="mb-4 flex shrink-0 items-center gap-3 px-2 text-white no-underline"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-energy text-[#11130f]"><Sparkles size={20}/></span><div><strong className="tracking-[.16em]">Aprumo</strong><p className="muted text-[10px]">EVOLUA TODO DIA</p></div></Link>
    <div className="sidebar-menu-scroll min-h-0 flex-1 overflow-y-auto pr-1"><nav className="space-y-1">{group(primary)}</nav><p className="muted mb-2 mt-5 px-3 text-[9px] font-bold uppercase tracking-[.16em]">Atravessa tudo</p><nav className="space-y-1">{group(system)}</nav></div>
    <Link href="/perfil" className="mt-3 flex shrink-0 items-center gap-3 border-t border-white/[.07] px-2 pt-3 text-white no-underline"><Avatar name={name} url={avatarUrl} size={36}/><div className="min-w-0"><p className="truncate text-xs font-semibold">{name || 'Sua conta'}</p><p className="muted truncate text-[9px]">Sua conta</p></div></Link>
  </aside>
}
