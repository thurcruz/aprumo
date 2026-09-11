'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Sparkles } from 'lucide-react'
import Avatar from '@/components/profile/Avatar'
import { useProfile } from '@/lib/profile'

export default function TopBar() {
  const pathname = usePathname()
  const { name, avatarUrl } = useProfile()
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  // theme-dark: como o menu lateral, o topo do celular é sempre escuro — também no tema claro.
  return <header className="theme-dark glass sticky top-0 z-40 flex h-14 items-center justify-between px-4 md:hidden">
    <Link href="/hoje" className="flex items-center gap-2 text-white no-underline">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-energy text-[#11130f]"><Sparkles size={17}/></span>
      <strong className="text-sm tracking-[.18em]">Aprumo</strong>
    </Link>
    <div className="flex items-center gap-2">
      <Link href="/pri" aria-label="Pri" className="grid h-9 w-9 place-items-center rounded-full border" style={{ borderColor: active('/pri') ? 'rgba(208,224,39,.45)' : 'var(--line)', color: active('/pri') ? 'var(--accent)' : 'var(--ink)' }}><Bot size={18}/></Link>
      <Link href="/perfil" aria-label="Perfil" className="grid h-9 w-9 place-items-center rounded-full border" style={{ borderColor: active('/perfil') ? 'rgba(208,224,39,.45)' : 'var(--line)', color: active('/perfil') ? 'var(--accent)' : 'var(--ink)' }}><Avatar name={name} url={avatarUrl} size={30}/></Link>
    </div>
  </header>
}
