'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cx } from '@/lib/cx'
import { areaNav, isActive } from './nav'

/**
 * As cinco áreas ao alcance do polegar, num menu flutuante de vidro. Um
 * degradê na cor do fundo passa por baixo dele, para o conteúdo que rola não
 * aparecer cortado atrás do vidro.
 */
export default function BottomNav() {
  const pathname = usePathname()
  return <>
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-36 bg-linear-to-t from-canvas via-canvas/80 to-transparent md:hidden"/>
    {/* theme-dark: a barra segue o menu lateral — sempre escura, também no tema claro. */}
    <nav aria-label="Áreas" className="theme-dark fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 rounded-[28px] border border-white/10 bg-[rgb(20_20_22/.72)] shadow-[0_18px_50px_rgb(0_0_0/.35)] backdrop-blur-xl backdrop-saturate-150 md:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
        {areaNav.map(item => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 no-underline">
            <span className={cx('grid h-7 w-12 place-items-center rounded-full transition-colors duration-200 ease-ap', active ? 'bg-area-soft text-area-ink' : 'text-fg-2')}>
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8}/>
            </span>
            <span className={cx('max-w-full truncate text-[11px] leading-none', active ? 'font-medium text-fg-1' : 'text-fg-3')}>{item.label}</span>
          </Link>
        })}
      </div>
    </nav>
  </>
}
