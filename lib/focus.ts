import type { FocusSession } from './types'
import { isoDate } from './utils'

/** Abre o Foco já ligado a uma tarefa ou hábito: a sessão grava `commitmentId`. */
export const focusHref = (taskId: string) => `/foco?tarefa=${encodeURIComponent(taskId)}`

/**
 * Minutos focados por tarefa, somando concluídas e interrompidas — o que foi
 * focado, foi focado. Com `day` (YYYY-MM-DD, fuso do aparelho), só aquele dia.
 */
export function focusMinutesByTask(sessions: FocusSession[], day?: string): Map<string, number> {
  const totals = new Map<string, number>()
  for (const session of sessions) {
    if (!session.commitmentId) continue
    if (day && isoDate(new Date(session.startedAt)) !== day) continue
    totals.set(session.commitmentId, (totals.get(session.commitmentId) ?? 0) + session.actualSeconds / 60)
  }
  return totals
}
