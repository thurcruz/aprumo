'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Avatar from '@/components/profile/Avatar'
import { useProfile } from '@/lib/profile'
import { cx } from '@/lib/cx'
import Logo from './Logo'

/** Topo do celular: o logotipo em destaque no centro e o perfil à direita. A Pri fica no botão flutuante. */
export default function TopBar() {
  const pathname = usePathname()
  const { name, avatarUrl } = useProfile()
  const onProfile = pathname === '/perfil' || pathname.startsWith('/perfil/')

  // theme-dark: como o menu lateral, o topo do celular é sempre escuro — também no tema claro.
  return <header className="theme-dark sticky top-0 z-40 border-b border-white/6 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
    <div className="grid h-14 grid-cols-[44px_1fr_44px] items-center px-3">
      <span aria-hidden/>
      <Link href="/hoje" aria-label="Aprumo — ir para Hoje" className="justify-self-center no-underline"><Logo height={24}/></Link>
      <Link href="/perfil" aria-label="Minha evolução" aria-current={onProfile ? 'page' : undefined}
        className={cx('grid h-11 w-11 place-items-center rounded-full', onProfile && 'ring-2 ring-area/70 ring-offset-2 ring-offset-canvas')}>
        <Avatar name={name} url={avatarUrl} size={30}/>
      </Link>
    </div>
  </header>
}
