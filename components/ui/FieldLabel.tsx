import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/** Rótulo de um grupo de campos num formulário: "EM QUAIS DIAS DA SEMANA". */
export default function FieldLabel({ icon: Icon, children, className }: { icon?: LucideIcon; children: ReactNode; className?: string }) {
  return <p className={cx('mb-2 mt-6 flex items-center gap-1.5 text-label uppercase text-fg-3 first:mt-0', className)}>
    {Icon && <Icon size={13} aria-hidden/>}{children}
  </p>
}
