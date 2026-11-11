'use client'

import { useSyncExternalStore } from 'react'

/**
 * Lê uma media query como estado externo. No servidor (e no primeiro render
 * de hidratação) vale `serverValue` — por padrão `false`, ou seja, celular:
 * o Aprumo é mobile first, e o desktop se ajusta logo em seguida.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    onChange => {
      const media = matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => matchMedia(query).matches,
    () => serverValue,
  )
}

/** O mesmo corte do `md:` do Tailwind. */
export const DESKTOP_QUERY = '(min-width: 768px)'
