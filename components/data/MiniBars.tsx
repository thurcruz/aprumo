import { barRatios } from '@/lib/dataviz'
import { cx } from '@/lib/cx'

/**
 * Barras pequenas para comparar dias ou semanas. A barra em destaque (por
 * padrão a última, "hoje") fica na cor da área; as outras em tom neutro.
 * Valor nulo = sem dado, desenhado como um traço, não como zero.
 */
export default function MiniBars({ values, labels, max, highlight = values.length - 1, height = 56, label, className }: {
  values: (number | null)[]
  labels?: string[]
  /** Teto da escala, ex.: a meta diária. Sem ele, o maior valor é o topo. */
  max?: number
  highlight?: number
  height?: number
  label?: string
  className?: string
}) {
  const ratios = barRatios(values, max)
  return <div role={label ? 'img' : undefined} aria-label={label} className={cx('w-full', className)}>
    <div className="flex items-end gap-1.5" style={{ height }} aria-hidden>
      {ratios.map((ratio, index) => <div key={index} className="flex h-full min-w-0 flex-1 items-end justify-center">
        {ratio === null
          ? <span className="h-0.5 w-full max-w-5 rounded-full bg-surface-pressed"/>
          : <span className={cx('w-full max-w-5 rounded-[4px] transition-[height] duration-500 ease-ap', index === highlight ? 'bg-area' : 'bg-fg-3/35')}
              style={{ height: `${Math.max(ratio * 100, 4)}%` }}/>}
      </div>)}
    </div>
    {labels && <div className="mt-1.5 flex gap-1.5" aria-hidden>
      {labels.map((text, index) => <span key={index} className={cx('min-w-0 flex-1 text-center text-[11px] leading-none', index === highlight ? 'text-fg-1' : 'text-fg-3')}>{text}</span>)}
    </div>}
  </div>
}
