import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/**
 * Topo de toda página do app: título curto em uma linha, uma frase opcional e
 * as ações. Substitui as manchetes de duas linhas — no celular, o dado precisa
 * aparecer antes da dobra.
 */
export default function PageHeader({ title, eyebrow, description, back, actions, className }: {
  title: string
  /** Contexto acima do título: data, área-mãe. */
  eyebrow?: ReactNode
  description?: ReactNode
  back?: { href: string; label: string }
  actions?: ReactNode
  className?: string
}) {
  return <header className={cx('mb-6 md:mb-8', className)}>
    {back && <Link href={back.href} className="-ml-2 mb-3 inline-flex h-9 items-center gap-1 rounded-full pl-1 pr-3 text-body-s text-fg-2 no-underline transition-colors hover:text-fg-1">
      <ChevronLeft size={18}/>{back.label}
    </Link>}
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-body-s text-fg-2">{eyebrow}</p>}
        <h1 className="text-h1 text-fg-1">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-body-s text-fg-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  </header>
}
