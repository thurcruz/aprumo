import { Check } from 'lucide-react'
import { cx } from '@/lib/cx'

/** done: cumpriu tudo · partial: parte · missed: havia o que fazer e nada foi feito · rest: nada devido · future: ainda não chegou. */
export type DayState = 'done' | 'partial' | 'missed' | 'rest' | 'future'

export interface WeekDay { label: string; state: DayState; today?: boolean; title?: string }

/** A semana em sete pontos: ● ● ● ● ○ ● ●. Descanso não é falha, então não parece falha. */
export default function WeekDots({ days, size = 'md', className }: { days: WeekDay[]; size?: 'sm' | 'md'; className?: string }) {
  const dot = size === 'sm' ? 'h-5 w-5' : 'h-7 w-7'
  return <ol className={cx('flex justify-between gap-1', className)}>
    {days.map((day, index) => <li key={index} className="flex flex-col items-center gap-1.5" title={day.title}>
      <span className={cx('grid place-items-center rounded-full', dot,
        day.state === 'done' && 'bg-area text-on-fill',
        day.state === 'partial' && 'border-[1.5px] border-area bg-area-soft',
        day.state === 'missed' && 'border-[1.5px] border-line-strong',
        day.state === 'rest' && 'bg-surface-pressed',
        day.state === 'future' && 'border border-dashed border-line-strong',
        day.today && 'ring-2 ring-fg-1/70 ring-offset-2 ring-offset-surface-1')}>
        {day.state === 'done' && size === 'md' && <Check size={14} strokeWidth={3} aria-hidden/>}
      </span>
      <span className={cx('text-[11px] leading-none', day.today ? 'font-semibold text-fg-1' : 'text-fg-3')}>{day.label}</span>
      <span className="sr-only">{({ done: 'cumprido', partial: 'parcial', missed: 'não cumprido', rest: 'nada previsto', future: 'ainda não chegou' })[day.state]}</span>
    </li>)}
  </ol>
}
