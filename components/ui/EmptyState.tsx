import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/**
 * O que aparece quando ainda não há nada. Explica o que vai existir ali e
 * oferece o primeiro passo — nunca só "Nenhum item".
 */
export default function EmptyState({ icon: Icon, title, description, action, compact, className }: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  /** Versão curta, para dentro de um card ou de um bloco da timeline. */
  compact?: boolean
  className?: string
}) {
  return <div className={cx('flex flex-col items-center text-center', compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12', className)}>
    <span className={cx('grid place-items-center rounded-full border border-line bg-surface-2 text-fg-2', compact ? 'h-9 w-9' : 'h-12 w-12')}><Icon size={compact ? 16 : 20}/></span>
    <div>
      <p className="text-h3 text-fg-1">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-body-s text-fg-2">{description}</p>}
    </div>
    {action && <div className="mt-1">{action}</div>}
  </div>
}
