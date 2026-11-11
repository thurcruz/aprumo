import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cardClass } from '@/components/ui/Card'
import { cx } from '@/lib/cx'

export type WidgetSize = 's' | 'm' | 'l'

/** Quantas colunas o widget ocupa no WidgetGrid: 2 colunas no celular, 4 no desktop. */
const spans: Record<WidgetSize, string> = {
  s: 'col-span-1',
  m: 'col-span-2',
  l: 'col-span-2 md:col-span-4',
}

/**
 * A casca de todo widget: rótulo, ícone, o dado e um rodapé opcional.
 * MetricCard, ProgressCard e ChartCard não são componentes à parte — são o que
 * vai dentro dele. Com `href`, o card inteiro vira link para a área.
 */
export default function Widget({ label, icon: Icon, size = 's', href, action, footer, className, children }: {
  label: string
  icon?: LucideIcon
  size?: WidgetSize
  href?: string
  /** Controle no canto (ex.: período). Não use junto com `href`. */
  action?: ReactNode
  footer?: ReactNode
  className?: string
  children: ReactNode
}) {
  const body = <>
    <div className="flex h-5 items-center gap-1.5">
      {Icon && <Icon size={14} className="shrink-0 text-area-ink" aria-hidden/>}
      <p className="min-w-0 flex-1 truncate text-label uppercase text-fg-2">{label}</p>
      {action}
      {href && <ChevronRight size={15} className="shrink-0 text-fg-3" aria-hidden/>}
    </div>
    <div className="mt-3 flex-1">{children}</div>
    {footer && <div className="mt-3 border-t border-line pt-3 text-caption text-fg-2">{footer}</div>}
  </>
  const classes = cx(cardClass({ padding: 'sm', interactive: Boolean(href) }), 'flex min-w-0 flex-col md:p-4', spans[size], className)
  return href
    ? <Link href={href} className={classes}>{body}</Link>
    : <section className={classes}>{body}</section>
}

/** Grade de widgets. A ordem vem de quem chama — preparado para o usuário reorganizar depois. */
export function WidgetGrid({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('grid grid-cols-2 gap-3 md:grid-cols-4', className)}>{children}</div>
}
