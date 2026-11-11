'use client'

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Pause } from 'lucide-react'
import { formatClock, headEmphasis, radialSegments, segmentFills } from '@/lib/radial'
import { cx } from '@/lib/cx'
import { ease } from '@/lib/motion'

export type RadialTimerStatus = 'idle' | 'running' | 'paused' | 'completed'

const SIZE = 400
const RADIUS = 192
const LENGTH = 30
const STROKE = 5.5

/**
 * O temporizador do Aprumo: um anel de traços radiais que acendem conforme o
 * tempo passa. O traço da fronteira acende aos poucos, então o anel enche de
 * forma contínua — nada pisca a cada segundo.
 *
 * - Ao começar (idle → running) uma onda acende o anel rapidamente e se apaga.
 * - Pausado, o progresso fica e o aceso esmaece.
 * - Concluído, o anel fecha e um pulso percorre o círculo uma vez.
 *
 * `accentColor` troca a cor dos traços acesos (padrão: a área do contexto).
 */
export default function RadialTimer({ duration, remaining, progress, status, label, detail, accentColor, segments = 72, className }: {
  /** Duração total da etapa, em segundos. */
  duration: number
  /** Segundos que faltam. */
  remaining: number
  /** 0 a 1. Sem ele, vem de duration e remaining. */
  progress?: number
  status: RadialTimerStatus
  /** Estado abaixo do tempo: "Foco", "Pausa". Pausado e concluído têm texto próprio. */
  label?: string
  /** Linha discreta embaixo de tudo, ex.: no que você está focando. */
  detail?: ReactNode
  accentColor?: string
  segments?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  const value = status === 'completed' ? 1 : progress ?? (duration > 0 ? 1 - remaining / duration : 0)
  const geometry = useMemo(() => radialSegments({ count: segments, size: SIZE, radius: RADIUS, length: LENGTH }), [segments])
  const fills = segmentFills(value, segments)
  const heads = headEmphasis(value, segments)

  // Estado derivado no render: guarda o status anterior para disparar a onda
  // de início e o pulso de conclusão só nas transições, não a cada segundo.
  const [previous, setPrevious] = useState(status)
  const [wave, setWave] = useState<{ id: number; kind: 'wake' | 'done' } | null>(null)
  if (status !== previous) {
    setPrevious(status)
    if (status === 'running' && previous === 'idle') setWave(current => ({ id: (current?.id ?? 0) + 1, kind: 'wake' }))
    if (status === 'completed') setWave(current => ({ id: (current?.id ?? 0) + 1, kind: 'done' }))
  }

  const time = status === 'completed' ? formatClock(0) : formatClock(remaining)
  const state = status === 'paused' ? 'Pausado' : status === 'completed' ? 'Concluído' : label

  return <div role="timer" aria-label={`${state ?? 'Tempo'}: ${time}`}
    className={cx('relative isolate aspect-square select-none', className)}
    style={accentColor ? { '--ap-area': accentColor } as CSSProperties : undefined}>
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      {/* Trilho: todos os traços, apagados. */}
      <g className="stroke-line-strong" strokeWidth={STROKE} strokeLinecap="round">
        {geometry.map((s, i) => <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}/>)}
      </g>
      {/* Aceso, com um brilho mínimo só aqui. Pausado, esmaece mas não perde o progresso. */}
      <g className={cx('stroke-area transition-opacity duration-500 ease-ap', status === 'paused' ? 'opacity-45' : 'opacity-100')}
        strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 3px color-mix(in srgb, var(--ap-area) 38%, transparent))' }}>
        {geometry.map((s, i) => <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          style={{ opacity: fills[i], strokeWidth: STROKE + heads[i] * 1.6, transition: 'opacity 900ms cubic-bezier(.2,.8,.2,1), stroke-width 900ms cubic-bezier(.2,.8,.2,1)' }}/>)}
      </g>
      {/* Onda de início e pulso de conclusão: uma volta só, e some. */}
      {wave && !reduce && <g key={wave.id} className="stroke-area" strokeLinecap="round">
        {geometry.map((s, i) => <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          style={{ '--w': `${STROKE}px`, strokeWidth: STROKE, opacity: 0, animation: `${wave.kind === 'wake' ? 'ap-seg-wake 700ms' : 'ap-seg-done 900ms'} cubic-bezier(.2,.8,.2,1) ${i * (wave.kind === 'wake' ? 6 : 11)}ms both` } as CSSProperties}/>)}
      </g>}
    </svg>

    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      {status === 'completed'
        ? <motion.span initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45, ease, delay: 0.35 }}
            className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-area text-on-fill"><Check size={22} strokeWidth={2.6}/></motion.span>
        : null}
      <span className={cx('font-semibold leading-none tracking-[-0.045em] tabular-nums transition-colors duration-500',
        status === 'completed' ? 'text-[clamp(2.25rem,9vw,3.25rem)]' : 'text-[clamp(3.25rem,15vw,5.75rem)]',
        status === 'paused' ? 'text-fg-2' : 'text-fg-1')}>{time}</span>
      {state && <span className={cx('mt-3 inline-flex items-center gap-1.5 text-label uppercase', status === 'running' ? 'text-area-ink' : 'text-fg-2')}>
        {status === 'paused' && <Pause size={12} fill="currentColor"/>}
        {status === 'running' && <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-area [animation-duration:2.4s]"/>}
        {state}
      </span>}
      {detail && <span className="mt-2 max-w-[62%] truncate text-caption text-fg-3">{detail}</span>}
    </div>
  </div>
}
