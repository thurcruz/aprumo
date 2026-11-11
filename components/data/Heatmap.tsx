import type { HeatCell } from '@/lib/evolution'
import { heatLevel, type HeatLevel } from '@/lib/dataviz'
import { cx } from '@/lib/cx'

const levelClass: Record<HeatLevel, string> = {
  0: 'bg-surface-pressed',
  1: 'bg-area/25',
  2: 'bg-area/50',
  3: 'bg-area/75',
  4: 'bg-area',
}

const shortDate = (day: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${day}T12:00:00`))

/**
 * O "GitHub da evolução": uma coluna por semana, um quadrado por dia. Recebe a
 * grade pronta de `heatmap()` (lib/evolution). Com `onSelect`, cada dia vira um
 * botão — é assim que o Registro abre o resumo do dia.
 */
export default function Heatmap({ weeks, cell = 12, onSelect, selected, legend = true, className }: {
  weeks: HeatCell[][]
  cell?: number
  onSelect?: (date: string) => void
  selected?: string
  legend?: boolean
  className?: string
}) {
  const gap = cell >= 14 ? 4 : 3
  return <div className={className}>
    <div className="overflow-x-auto pb-1 [scrollbar-width:thin]">
      <div className="flex w-max" style={{ gap }}>
        <div className="mr-1 grid text-[10px] leading-none text-fg-3" style={{ gridTemplateRows: `repeat(7, ${cell}px)`, gap }} aria-hidden>
          {['S', '', 'Q', '', 'S', '', 'D'].map((label, index) => <span key={index} className="flex items-center">{label}</span>)}
        </div>
        {weeks.map(week => <div key={week[0].date} className="grid" style={{ gridTemplateRows: `repeat(7, ${cell}px)`, gap }}>
          {week.map(day => {
            const level = day.future ? null : heatLevel(day.ratio)
            const title = day.future ? undefined : `${shortDate(day.date)} · ${day.ratio === null ? 'nada previsto' : `${Math.round(day.ratio * 100)}% cumprido`}`
            const classes = cx('block rounded-[3px] transition-transform duration-150',
              day.future ? 'bg-transparent' : level === null ? 'border border-line' : levelClass[level],
              selected === day.date && 'ring-2 ring-fg-1 ring-offset-1 ring-offset-surface-1')
            return onSelect && !day.future
              ? <button key={day.date} type="button" title={title} aria-label={title} aria-pressed={selected === day.date} onClick={() => onSelect(day.date)}
                  className={cx(classes, 'hover:scale-125 focus-visible:outline-2 focus-visible:outline-fg-1')} style={{ width: cell, height: cell }}/>
              : <span key={day.date} title={title} className={classes} style={{ width: cell, height: cell }}/>
          })}
        </div>)}
      </div>
    </div>
    {legend && <div className="mt-3 flex items-center gap-1.5 text-caption text-fg-3" aria-hidden>
      menos {([0, 1, 2, 3, 4] as HeatLevel[]).map(level => <span key={level} className={cx('h-2.5 w-2.5 rounded-[3px]', levelClass[level])}/>)} mais
      <span className="ml-3 inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] border border-line"/> nada previsto</span>
    </div>}
  </div>
}
