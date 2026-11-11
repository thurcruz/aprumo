import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import AnimatedNumber from './AnimatedNumber'

const sizes = { xl: 'text-metric-xl', l: 'text-metric-l', m: 'text-metric-m', s: 'text-metric-s' }
const unitSizes = { xl: 'text-h2', l: 'text-h3', m: 'text-body-s', s: 'text-caption' }

/**
 * O número em destaque: "82%", "2h 34min", "R$ 2.840". A unidade fica menor ao
 * lado, e a variação/legenda embaixo. Número animado quando `value` é number.
 */
export default function Metric({ value, format, unit, size = 'l', delta, caption, className }: {
  value: number | string
  /** Só para `value` numérico. Passe uma função estável. */
  format?: (value: number) => string
  unit?: string
  size?: keyof typeof sizes
  delta?: ReactNode
  caption?: ReactNode
  className?: string
}) {
  return <div className={cx('min-w-0', className)}>
    <p className="flex items-baseline gap-1 text-fg-1">
      <span className={cx(sizes[size], 'tabular-nums')}>{typeof value === 'number' ? <AnimatedNumber value={value} format={format}/> : value}</span>
      {unit && <span className={cx(unitSizes[size], 'font-medium text-fg-2')}>{unit}</span>}
    </p>
    {delta && <div className="mt-1.5">{delta}</div>}
    {caption && <p className="mt-1 text-caption text-fg-3">{caption}</p>}
  </div>
}
