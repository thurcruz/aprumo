import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

const tones = {
  neutral: 'border-line bg-surface-2 text-fg-2',
  area: 'border-area-line bg-area-soft text-area-ink',
  alert: 'border-alert/30 bg-alert/10 text-alert',
  solid: 'border-transparent bg-area text-on-fill',
}

/** Rótulo curto de estado: "Em andamento", "Aprumo+", "3 dias". Nunca um parágrafo. */
export default function Badge({ tone = 'neutral', icon, dot, className, children }: {
  tone?: keyof typeof tones
  icon?: ReactNode
  /** Ponto na cor da área antes do texto — status sem pintar o badge inteiro. */
  dot?: boolean
  className?: string
  children: ReactNode
}) {
  return <span className={cx('inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-caption font-medium', tones[tone], className)}>
    {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-area"/>}
    {icon}
    {children}
  </span>
}
