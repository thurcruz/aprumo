import { sparklinePath } from '@/lib/dataviz'
import { cx } from '@/lib/cx'

const WIDTH = 100

/**
 * Tendência em uma linha, sem eixos. Estica na largura do container; o traço
 * não deforma (non-scaling-stroke) e o ponto final é HTML, para continuar redondo.
 */
export default function Sparkline({ values, height = 36, min, max, fill = true, label, className }: {
  values: (number | null)[]
  height?: number
  min?: number
  max?: number
  fill?: boolean
  /** Descrição para leitor de tela, ex.: "Constância nas últimas 8 semanas". */
  label?: string
  className?: string
}) {
  const { line, area, points } = sparklinePath(values, WIDTH, height, { min, max, padding: 3 })
  const last = [...points].reverse().find(Boolean)
  return <div role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
    className={cx('relative w-full', className)} style={{ height }}>
    <svg viewBox={`0 0 ${WIDTH} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
      {fill && area && <path d={area} className="fill-area/10"/>}
      {line && <path d={line} fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="stroke-area"/>}
    </svg>
    {last && <span className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-area ring-2 ring-surface-1"
      style={{ left: `${last.x / WIDTH * 100}%`, top: `${last.y / height * 100}%` }}/>}
  </div>
}
