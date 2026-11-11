'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cx } from '@/lib/cx'
import { duration, ease, spring } from '@/lib/motion'

const sizes = { sm: 20, md: 26 }

/**
 * O check de hábito, tarefa e marco. Ao marcar: o círculo enche com uma mola
 * curta e o traço do check se desenha. O alvo de toque é sempre 44px, mesmo
 * quando o círculo é pequeno.
 */
export default function CheckButton({ checked, onChange, label, size = 'md', disabled, className }: {
  checked: boolean
  onChange: (checked: boolean) => void
  /** O que está sendo marcado, ex.: "Concluir Leitura". */
  label: string
  size?: keyof typeof sizes
  disabled?: boolean
  className?: string
}) {
  const reduce = useReducedMotion()
  const px = sizes[size]
  return <button type="button" role="checkbox" aria-checked={checked} aria-label={label} disabled={disabled}
    onClick={event => { event.stopPropagation(); onChange(!checked) }}
    className={cx('group relative grid h-11 w-11 shrink-0 place-items-center rounded-full disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-fg-1', className)}>
    <span className={cx('relative grid place-items-center rounded-full border-[1.5px] transition-colors duration-200 ease-ap',
      checked ? 'border-area' : 'border-line-strong group-hover:border-fg-3')} style={{ width: px, height: px }}>
      <motion.span aria-hidden className="absolute inset-[-1.5px] rounded-full bg-area"
        initial={false} animate={{ scale: checked ? 1 : 0.4, opacity: checked ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : spring}/>
      <svg viewBox="0 0 24 24" width={px * 0.62} height={px * 0.62} className="relative" aria-hidden>
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
          className="stroke-on-fill" initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: duration.base, ease, delay: checked ? 0.06 : 0 }}/>
      </svg>
    </span>
  </button>
}
