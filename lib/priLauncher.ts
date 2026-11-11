'use client'

import { useSyncExternalStore } from 'react'

/**
 * Abre e fecha a conversa rápida com a Pri de qualquer lugar: o botão do topo
 * (celular) e o botão flutuante (desktop) mexem no mesmo estado.
 */
let open = false
const listeners = new Set<() => void>()

function emit(next: boolean) {
  if (open === next) return
  open = next
  for (const listener of listeners) listener()
}

export const openPri = () => emit(true)
export const closePri = () => emit(false)
export const togglePri = () => emit(!open)

export function usePriLauncher(): boolean {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
    () => open,
    () => false,
  )
}
