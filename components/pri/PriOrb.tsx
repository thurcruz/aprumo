'use client'

import { motion, useReducedMotion, type TargetAndTransition } from 'framer-motion'
import { cx } from '@/lib/cx'

export type PriOrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

/** Ritmo de cada estado: quanto a esfera respira e quão rápido a luz interna gira. */
const pulse: Record<PriOrbState, TargetAndTransition> = {
  idle: { scale: [1, 1.03, 1], transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' } },
  listening: { scale: [1, 1.07, 1], transition: { duration: 1.3, repeat: Infinity, ease: 'easeInOut' } },
  thinking: { scale: [1, 0.96, 1], transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } },
  speaking: { scale: [1, 1.08, 0.99, 1.05, 1], transition: { duration: 1.15, repeat: Infinity, ease: 'easeInOut' } },
}
const spin: Record<PriOrbState, number> = { idle: 16, listening: 7, thinking: 2.4, speaking: 5 }

/**
 * A presença da Pri: uma esfera grafite com uma luz lima que se move por
 * dentro. Respira devagar parada, pulsa ouvindo, gira rápido pensando e
 * oscila falando. Sólida e discreta — nada de neon.
 */
export default function PriOrb({ state = 'idle', size = 160, className }: { state?: PriOrbState; size?: number; className?: string }) {
  const reduce = useReducedMotion()
  const blur = Math.max(4, size * 0.14)

  return <div aria-hidden className={cx('relative grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
    {/* Halo: um brilho fraco em volta, mais presente quando ela ouve ou fala. */}
    <motion.span className="absolute inset-[-18%] rounded-full"
      style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--ap-accent) 22%, transparent) 0%, transparent 62%)' }}
      animate={reduce ? undefined : { opacity: state === 'idle' ? 0.45 : state === 'thinking' ? 0.6 : 0.9 }} transition={{ duration: 0.6 }}/>

    {/* Ondas ao ouvir: a voz entrando. */}
    {state === 'listening' && !reduce && [0, 0.65].map(delay => <motion.span key={delay} className="absolute inset-0 rounded-full border border-area/40"
      initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 1.55, opacity: 0 }} transition={{ duration: 1.3, delay, repeat: Infinity, ease: 'easeOut' }}/>)}

    {/* Pensando: um arco de luz girando em volta. */}
    {state === 'thinking' && !reduce && <motion.span className="absolute inset-[-5%] rounded-full"
      style={{ background: 'conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--ap-accent) 70%, transparent) 60deg, transparent 120deg)', mask: 'radial-gradient(circle, transparent 64%, #000 66%)', WebkitMask: 'radial-gradient(circle, transparent 64%, #000 66%)' }}
      animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}/>}

    <motion.div className="relative h-full w-full overflow-hidden rounded-full"
      style={{ background: 'radial-gradient(circle at 50% 120%, color-mix(in srgb, var(--ap-accent) 55%, #0b0b0c) 0%, #16161a 58%, #0e0e10 100%)', boxShadow: 'inset 0 1px 0 rgb(255 255 255 / .08), 0 10px 30px rgb(0 0 0 / .35)' }}
      animate={reduce ? undefined : pulse[state]}>
      {/* A luz interna: três manchas desfocadas girando em velocidades diferentes. */}
      <motion.div className="absolute inset-0" animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: spin[state], repeat: Infinity, ease: 'linear' }}>
        <span className="absolute rounded-full" style={{ width: '62%', height: '62%', left: '8%', top: '30%', background: 'var(--ap-accent)', opacity: 0.55, filter: `blur(${blur}px)` }}/>
        <span className="absolute rounded-full" style={{ width: '44%', height: '44%', right: '6%', top: '12%', background: '#f4f4f2', opacity: 0.16, filter: `blur(${blur}px)` }}/>
      </motion.div>
      <motion.div className="absolute inset-0" animate={reduce ? undefined : { rotate: -360 }} transition={{ duration: spin[state] * 1.6, repeat: Infinity, ease: 'linear' }}>
        <span className="absolute rounded-full" style={{ width: '40%', height: '40%', left: '38%', bottom: '4%', background: 'color-mix(in srgb, var(--ap-accent) 55%, #ffffff)', opacity: 0.35, filter: `blur(${blur}px)` }}/>
      </motion.div>
      {/* Reflexo de vidro no topo: dá volume à esfera. */}
      <span className="absolute left-[18%] top-[8%] h-[28%] w-[64%] rounded-full" style={{ background: 'linear-gradient(to bottom, rgb(255 255 255 / .14), transparent)' }}/>
    </motion.div>
  </div>
}
