import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type TimelineStatus = 'done' | 'pending' | 'now' | 'skipped'

/**
 * Um acontecimento do dia na linha do tempo: hábito, tarefa, treino, sessão de
 * foco, registro. Hora à esquerda (mono), trilho com o nó no meio, conteúdo à
 * direita. `leading` recebe o CheckButton quando o item pode ser concluído ali.
 */
export default function TimelineItem({ time, title, meta, status = 'pending', leading, trailing, last, children, className }: {
  /** "06:00". Sem horário, o espaço fica vazio e o item segue a ordem do período. */
  time?: string
  title: ReactNode
  meta?: ReactNode
  status?: TimelineStatus
  leading?: ReactNode
  trailing?: ReactNode
  /** Último item do grupo: o trilho não continua para baixo. */
  last?: boolean
  /** Detalhe expandido (ex.: exercícios do treino). */
  children?: ReactNode
  className?: string
}) {
  return <li className={cx('grid grid-cols-[2.75rem_1rem_minmax(0,1fr)] gap-x-2 md:grid-cols-[3.25rem_1rem_minmax(0,1fr)]', className)}>
    <time className="font-mono pt-[13px] text-right text-caption tabular-nums text-fg-3">{time}</time>
    <div className="relative flex justify-center" aria-hidden>
      {!last && <span className="absolute bottom-0 top-[26px] w-px bg-line"/>}
      <span className={cx('relative mt-[15px] h-2.5 w-2.5 rounded-full',
        status === 'done' && 'bg-area',
        status === 'now' && 'bg-area ring-4 ring-area-soft',
        status === 'pending' && 'border-[1.5px] border-line-strong bg-surface-1',
        status === 'skipped' && 'bg-surface-pressed')}/>
    </div>
    <div className={cx('min-w-0 pb-3', !last && 'pb-4')}>
      <div className={cx('flex min-h-11 items-center gap-2 rounded-control', status === 'now' && '-mx-2 bg-area-soft px-2')}>
        {leading && <div className="-ml-2.5 -my-1.5">{leading}</div>}
        <div className="min-w-0 flex-1 py-1">
          <p className={cx('truncate text-body font-medium', status === 'done' || status === 'skipped' ? 'text-fg-2' : 'text-fg-1')}>{title}</p>
          {meta && <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-fg-2">{meta}</div>}
        </div>
        {trailing && <div className="flex shrink-0 items-center gap-1">{trailing}</div>}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  </li>
}

/** Um período do dia na timeline: "MANHÃ ——— 3/4". Os itens vão dentro, num <ol>. */
export function TimelineGroup({ label, meta, children, className }: { label: string; meta?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={className}>
    <div className="mb-1 flex items-center gap-3">
      <h3 className="text-label uppercase text-fg-3">{label}</h3>
      <span aria-hidden className="h-px flex-1 bg-line"/>
      {meta && <span className="text-caption tabular-nums text-fg-3">{meta}</span>}
    </div>
    <ol>{children}</ol>
  </section>
}
