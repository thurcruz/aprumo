'use client'

import { useEffect } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { formatNumber } from '@/lib/dataviz'
import { ease } from '@/lib/motion'

/**
 * Número que conta até o novo valor quando muda — a sequência que sobe de 11
 * para 12, o foco que soma minutos. Na primeira pintura já mostra o valor final
 * (inclusive no servidor); só as mudanças animam.
 *
 * `format` é lido uma vez: passe uma função estável (fora do componente ou memoizada).
 */
export default function AnimatedNumber({ value, format = defaultFormat, className }: {
  value: number
  format?: (value: number) => string
  className?: string
}) {
  const reduce = useReducedMotion()
  const motionValue = useMotionValue(value)
  const text = useTransform(motionValue, format)

  useEffect(() => {
    const controls = animate(motionValue, value, reduce ? { duration: 0 } : { duration: 0.6, ease })
    return () => controls.stop()
  }, [motionValue, value, reduce])

  return <motion.span className={className ? `tabular-nums ${className}` : 'tabular-nums'}>{text}</motion.span>
}

function defaultFormat(value: number): string {
  return formatNumber(Math.round(value))
}
