import type { AprumoStore } from './types'
import { streaks } from './evolution'

export interface Achievement { id: string; label: string; desc: string; icon: string; unlocked: boolean }
export interface XpSummary { xp: number; level: number; intoLevel: number; perLevel: number; achievements: Achievement[] }

const PER_LEVEL = 250

/**
 * Deriva XP, nível e conquistas do que já está no store (não persiste nada).
 *
 * Tudo aqui só cresce: XP que cai à meia-noite, ou conquista que volta a
 * ficar bloqueada quando a sequência quebra, contaria uma mentira sobre a
 * evolução da pessoa.
 */
export function computeXp(store: AprumoStore, today: string): XpSummary {
  // Conclusões de todos os tempos vêm do servidor. `task.completed` é só o
  // espelho de hoje — somá-lo fazia o XP despencar toda meia-noite. Sem
  // servidor (modo local), vale o que está carregado no aparelho.
  const localCompleted = (store.taskEvents ?? []).filter(event => event.status === 'completed').length
  const completedTasks = Math.max(store.metrics.lifetimeCompleted ?? 0, localCompleted)
  const readBooks = store.books.filter(book => book.status === 'lido').length
  // Treino feito vem do histórico: a ficha é o modelo e nunca é concluída.
  const doneWorkouts = (store.workoutLogs ?? []).filter(log => log.completedAt).length
  const repertoire = store.repertoire?.length ?? 0
  const sleepLogs = store.sleep?.length ?? 0
  const milestones = store.goals.reduce((sum, goal) => sum + goal.milestones.filter(milestone => milestone.completed).length, 0)
  const completedGoals = store.goals.filter(goal => goal.status === 'completed').length
  // A melhor sequência, não a atual: a atual zera ao quebrar, e o XP junto.
  const { best } = streaks(store.taskEvents ?? [], today)

  const xp =
    completedTasks * 10 +
    best * 5 +
    readBooks * 40 +
    doneWorkouts * 25 +
    repertoire * 8 +
    sleepLogs * 5 +
    milestones * 15 +
    completedGoals * 60

  const achievements: Achievement[] = [
    { id: 'first-week', label: 'Primeira Semana', desc: '7 dias seguidos em movimento', icon: '🔥', unlocked: best >= 7 },
    { id: 'reader', label: 'Leitor', desc: 'Concluiu 1 livro', icon: '📚', unlocked: readBooks >= 1 },
    { id: 'athlete', label: 'Fora da Toca', desc: 'Completou 1 treino', icon: '🏋️', unlocked: doneWorkouts >= 1 },
    { id: 'curator', label: 'Curador', desc: '5 itens no repertório', icon: '🧠', unlocked: repertoire >= 5 },
    { id: 'rested', label: 'Descansado', desc: '3 noites registradas', icon: '🌙', unlocked: sleepLogs >= 3 },
    { id: 'achiever', label: 'Realizador', desc: 'Concluiu 1 meta', icon: '🎯', unlocked: completedGoals >= 1 },
  ]

  return { xp, level: Math.floor(xp / PER_LEVEL) + 1, intoLevel: xp % PER_LEVEL, perLevel: PER_LEVEL, achievements }
}
