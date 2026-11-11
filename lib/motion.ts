/**
 * Movimento do Design System, do lado do framer-motion. Espelha os tokens de CSS
 * (--ease-ap e as durações de 120/200/320ms) para que animações em JS e em CSS
 * tenham o mesmo ritmo. Sutil de propósito: é software, não jogo.
 */
export const ease = [0.2, 0.8, 0.2, 1] as const

export const duration = { fast: 0.12, base: 0.2, slow: 0.32 } as const

/** Mola curta, sem quicar demais — para check, contador e seleção. */
export const spring = { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 } as const

/** Entrada padrão de algo que surge (insight da Pri, toast, item novo). */
export const enter = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: duration.slow, ease },
} as const
