import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/**
 * Título de uma seção dentro da página. `meta` é o dado ao lado do título
 * ("3/4", "últimos 30 dias"); `action` é um link ou botão discreto.
 */
export default function SectionHeader({ title, label, meta, action, as: Heading = 'h2', className }: {
  title: string
  label?: string
  meta?: ReactNode
  action?: ReactNode
  as?: 'h2' | 'h3'
  className?: string
}) {
  return <div className={cx('flex items-end justify-between gap-3', className)}>
    <div className="min-w-0">
      {label && <p className="text-label uppercase text-fg-3">{label}</p>}
      <Heading className={cx('truncate text-fg-1', Heading === 'h2' ? 'text-h2' : 'text-h3', label && 'mt-1')}>{title}</Heading>
    </div>
    {(meta || action) && <div className="flex shrink-0 items-center gap-3 text-body-s text-fg-2">{meta}{action}</div>}
  </div>
}
