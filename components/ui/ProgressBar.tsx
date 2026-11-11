'use client'

import { useState } from 'react'
import { percentOf } from '@/lib/dataviz'
import { cx } from '@/lib/cx'

const heights = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' }

/**
 * Barra de progresso na cor da área. Quando *chega* a 100% (não quando já
 * nasce cheia) emite um pulso único — o feedback de "concluído" sem confete.
 */
export default function ProgressBar({ value, max = 100, size = 'md', label, className }: {
  value: number
  max?: number
  size?: keyof typeof heights
  /** Nome para leitor de tela, ex.: "Hábitos de hoje". */
  label?: string
  className?: string
}) {
  const percent = percentOf(value, max)
  // Estado derivado durante o render: guarda o valor anterior para saber se cruzou os 100%.
  const [previous, setPrevious] = useState(percent)
  const [pulses, setPulses] = useState(0)
  if (percent !== previous) {
    setPrevious(percent)
    if (percent === 100 && previous < 100) setPulses(count => count + 1)
  }

  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
    className={cx('relative w-full rounded-full bg-surface-pressed', heights[size], className)}>
    <div className="h-full rounded-full bg-area transition-[width] duration-500 ease-ap" style={{ width: `${percent}%` }}/>
    {pulses > 0 && <span key={pulses} aria-hidden className="pointer-events-none absolute inset-0 rounded-full animate-[ap-complete_.8s_ease-out_1]"/>}
  </div>
}
