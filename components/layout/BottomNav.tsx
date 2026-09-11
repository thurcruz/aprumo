'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brain, CircleDollarSign, HeartPulse, Sun, UsersRound } from 'lucide-react'

const nav = [
  { href: '/hoje', label: 'Hoje', icon: Sun },
  { href: '/comunidade', label: 'Comunidade', icon: UsersRound },
  { href: '/saude', label: 'Saúde', icon: HeartPulse },
  { href: '/mente', label: 'Mente', icon: Brain },
  { href: '/financas', label: 'Finanças', icon: CircleDollarSign },
]

export default function BottomNav() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  // theme-dark: a barra de baixo segue o menu lateral — sempre escura, também no tema claro.
  return <nav className="theme-dark mobile-bottom-nav glass fixed bottom-3 left-3 right-3 z-40 flex h-[72px] items-center justify-around rounded-[34px] px-1 md:hidden">
    {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex flex-1 flex-col items-center gap-1 text-[9px] no-underline" style={{ color: isActive(href) ? 'var(--accent)' : 'var(--muted)' }}><Icon size={19}/><span className="leading-none">{label}</span></Link>)}
  </nav>
}
