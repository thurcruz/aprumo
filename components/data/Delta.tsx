import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { formatDelta } from '@/lib/dataviz'
import { cx } from '@/lib/cx'

/**
 * Variação contra o período anterior: "↑ +12% vs. 30 dias anteriores".
 * Sem vermelho para queda — menos que antes não é fracasso. Só a direção boa
 * ganha a cor da área; `lowerIsBetter` inverte isso (repasses, gastos).
 */
export default function Delta({ value, unit = '', comparison, lowerIsBetter, className }: {
  value: number | null
  unit?: string
  comparison?: string
  lowerIsBetter?: boolean
  className?: string
}) {
  const { direction, text } = formatDelta(value, unit)
  const good = direction === 'up' ? !lowerIsBetter : direction === 'down' ? Boolean(lowerIsBetter) : false
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus
  return <span className={cx('inline-flex items-center gap-1 text-caption tabular-nums', good ? 'text-area-ink' : 'text-fg-3', className)}>
    {direction === 'none'
      ? <span>sem base para comparar</span>
      : <><Icon size={13} aria-hidden className="shrink-0"/><span className="font-medium">{text}</span>{comparison && <span className="text-fg-3">{comparison}</span>}</>}
  </span>
}
