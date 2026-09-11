'use client'

import { parseSessionSnapshot, type ActiveWorkout } from './workout'

/**
 * Treino em andamento, guardado no aparelho até ser finalizado.
 *
 * Recarregar a página, trocar de aba ou bloquear o celular no meio da série
 * não pode apagar o que foi marcado. Fica fora do React e é lido por
 * `useSyncExternalStore`; o snapshot é substituído a cada mudança.
 */
const KEY = 'aprumo-workout-active'
let snapshot: ActiveWorkout | null = null
let loaded = false
const listeners = new Set<() => void>()

function read(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ActiveWorkout>
    if (typeof parsed.planId !== 'string' || typeof parsed.startedAt !== 'string') return null
    const { planName, exercises } = parseSessionSnapshot({ planName: parsed.planName, exercises: parsed.exercises })
    return exercises.length > 0 ? { planId: parsed.planId, planName, startedAt: parsed.startedAt, exercises } : null
  } catch {
    return null
  }
}

export function getActiveWorkout(): ActiveWorkout | null {
  if (!loaded && typeof window !== 'undefined') {
    loaded = true
    snapshot = read()
  }
  return snapshot
}

/** No servidor não há treino em andamento — o cliente retoma na hidratação. */
export function getActiveWorkoutServer(): ActiveWorkout | null { return null }

export function subscribeActiveWorkout(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function setActiveWorkout(next: ActiveWorkout | null) {
  snapshot = next
  loaded = true
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next))
    else localStorage.removeItem(KEY)
  } catch { /* Sem storage, o treino vive só na memória desta aba. */ }
  for (const listener of listeners) listener()
}
