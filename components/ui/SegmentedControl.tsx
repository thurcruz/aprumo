'use client'

import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cx } from '@/lib/cx'
import { spring } from '@/lib/motion'

export interface SegmentOption<T extends string> { value: T; label: string; count?: number }

/**
 * Escolha única entre poucas opções: abas, filtros, períodos. O indicador
 * desliza até a opção ativa. Substituirá o ChipSelect e as abas feitas à mão
 * (Comunidade, Agenda, Sono) na migração das telas.
 */
export default function SegmentedControl<T extends string>({ options, value, onChange, label, size = 'md', stretch, className }: {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Nome do grupo para leitor de tela. */
  label: string
  size?: 'sm' | 'md'
  /** Ocupa a largura toda, com opções iguais — bom no celular com 2 a 4 opções. */
  stretch?: boolean
  className?: string
}) {
  const id = useId()
  const reduce = useReducedMotion()
  return <div role="radiogroup" aria-label={label}
    className={cx('flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface-1 p-1 [scrollbar-width:none]', stretch ? 'w-full' : 'w-fit', className)}>
    {options.map(option => {
      const active = option.value === value
      return <button key={option.value} type="button" role="radio" aria-checked={active} onClick={() => onChange(option.value)}
        className={cx('relative whitespace-nowrap rounded-full font-medium transition-colors duration-200 ease-ap focus-visible:outline-2 focus-visible:outline-fg-1',
          size === 'sm' ? 'h-8 px-3 text-body-s' : 'h-9 px-4 text-body-s',
          stretch && 'flex-1', active ? 'text-fg-1' : 'text-fg-2 hover:text-fg-1')}>
        {active && <motion.span layoutId={`segment-${id}`} aria-hidden className="absolute inset-0 rounded-full border border-line-strong bg-surface-3"
          transition={reduce ? { duration: 0 } : spring}/>}
        <span className="relative">{option.label}{option.count !== undefined && <span className="ml-1.5 text-fg-3 tabular-nums">{option.count}</span>}</span>
      </button>
    })}
  </div>
}
