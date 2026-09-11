/**
 * Treino — lógica pura, compartilhada entre a API e a interface.
 *
 * A ficha ([[WorkoutPlan]]) é o modelo e nunca muda por você treinar; cada
 * execução vira um [[WorkoutLog]] com o retrato do que foi feito. Nada aqui
 * toca em React, rede ou relógio: por isso dá para testar, e por isso a rota
 * do servidor pode importar sem arrastar código de cliente.
 */
import type { ExerciseKind, PlanExercise, PlanSet, SessionExercise, SessionSet, WorkoutLog, WorkoutPlan } from './types'

export const DEFAULT_REST_SECONDS = 90
/** Descansos oferecidos; 0 desliga o cronômetro daquele exercício. */
export const REST_PRESETS = [0, 30, 60, 90, 120, 180]
const MAX_SETS = 20

/** Execução em andamento: o retrato que vira [[WorkoutLog]] ao finalizar. */
export interface ActiveWorkout {
  planId: string
  planName: string
  startedAt: string
  exercises: SessionExercise[]
}

function num(value: unknown, min: number, max: number): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined
}

function parseSet(raw: unknown, kind: ExerciseKind): PlanSet {
  const set = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return kind === 'time'
    ? { seconds: num(set.seconds, 1, 86400) ?? 60 }
    : { reps: num(set.reps, 0, 1000) ?? 10, weight: num(set.weight, 0, 2000) ?? 0 }
}

function parseExercise(raw: unknown, index: number): PlanExercise | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const item = raw as Record<string, unknown>
  const name = typeof item.name === 'string' ? item.name.trim().slice(0, 120) : ''
  if (!name) return undefined
  const kind: ExerciseKind = item.kind === 'time' ? 'time' : 'reps'
  const sets = Array.isArray(item.sets) ? item.sets.slice(0, MAX_SETS).map(set => parseSet(set, kind)) : []
  return {
    id: typeof item.id === 'string' && item.id ? item.id : `exercicio-${index + 1}`,
    name,
    kind,
    restSeconds: num(item.restSeconds, 0, 900) ?? DEFAULT_REST_SECONDS,
    sets: sets.length > 0 ? sets : [parseSet({}, kind)],
  }
}

/**
 * Lê os exercícios da ficha vindos do banco (jsonb) ou do cache local.
 * Aceita o formato antigo, em que cada série carregava `completed` — esse
 * campo é descartado: marcar série é da execução, não da ficha.
 */
export function parsePlanExercises(value: unknown): PlanExercise[] {
  if (!Array.isArray(value)) return []
  return value.map(parseExercise).filter((item): item is PlanExercise => item !== undefined)
}

/** Relê o retrato de um treino feito, com o estado de cada série. */
export function parseSessionSnapshot(value: unknown): { planName: string; exercises: SessionExercise[] } {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const planName = typeof raw.planName === 'string' && raw.planName.trim() ? raw.planName.trim().slice(0, 160) : 'Treino'
  const list = Array.isArray(raw.exercises) ? raw.exercises : []
  const exercises: SessionExercise[] = []
  list.forEach((item, index) => {
    const base = parseExercise(item, index)
    if (!base) return
    const rawSets = Array.isArray((item as { sets?: unknown }).sets) ? (item as { sets: unknown[] }).sets : []
    exercises.push({
      ...base,
      sets: base.sets.map((set, i): SessionSet => ({ ...set, done: (rawSets[i] as { done?: unknown } | null | undefined)?.done === true })),
    })
  })
  return { planName, exercises }
}

/** "3 × 12 × 20 kg" vira três séries iguais — que depois podem ser editadas uma a uma. */
export function expandSets(count: number, template: PlanSet): PlanSet[] {
  const total = Math.max(1, Math.min(MAX_SETS, Math.round(Number.isFinite(count) ? count : 1)))
  return Array.from({ length: total }, () => ({ ...template }))
}

/** Todas as séries iguais? Se não, a ficha é pirâmide ou drop-set e merece o modo série a série. */
export function isUniform(sets: PlanSet[]): boolean {
  const [first] = sets
  return sets.every(set => set.reps === first?.reps && set.weight === first?.weight && set.seconds === first?.seconds)
}

/** "20:00" → 1200, "1:30" → 90, "45" → 45. Devolve undefined se não der para ler. */
export function parseDuration(text: string): number | undefined {
  const value = text.trim()
  if (!value) return undefined
  if (/^\d+$/.test(value)) return Number(value)
  const match = /^(\d+):([0-5]\d)$/.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined
}

/** 45 → "0:45", 1200 → "20:00", 3725 → "1:02:05". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total % 3600 / 60)
  const rest = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`
}

/** 20 → "20", 22.5 → "22,5". */
export function formatWeight(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace('.', ',')
}

/** "12 × 20 kg", "15 reps" quando não há carga, "0:45" para tempo. */
export function describeSet(kind: ExerciseKind, set: PlanSet): string {
  if (kind === 'time') return formatDuration(set.seconds ?? 0)
  const reps = set.reps ?? 0
  return set.weight ? `${reps} × ${formatWeight(set.weight)} kg` : `${reps} reps`
}

/**
 * A última vez que você fez este exercício, a partir do treino concluído mais
 * recente. Procura pelo id da ficha e, se não achar, pelo nome — recriar a
 * ficha ou fazer o mesmo exercício em outro treino não deveria zerar a
 * progressão. A melhor série é a mais pesada entre as concluídas.
 */
export function lastPerformance(exercise: { id: string; name: string }, logs: WorkoutLog[]): { sets: SessionSet[]; best: SessionSet; date: string } | undefined {
  const name = exercise.name.trim().toLowerCase()
  const ordered = logs.filter(log => log.completedAt).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  for (const log of ordered) {
    const match = log.exercises.find(item => item.id === exercise.id) ?? log.exercises.find(item => item.name.trim().toLowerCase() === name)
    const done = match?.sets.filter(set => set.done) ?? []
    if (!match || done.length === 0) continue
    const score = (set: SessionSet) => match.kind === 'time' ? (set.seconds ?? 0) : (set.weight ?? 0) * 1000 + (set.reps ?? 0)
    const best = done.reduce((top, set) => score(set) > score(top) ? set : top)
    return { sets: match.sets, best, date: log.completedAt as string }
  }
  return undefined
}

/**
 * Abre uma execução a partir da ficha. A carga vem da última vez que você fez
 * o exercício — a mesma série, se ela foi concluída; senão, a melhor. A ficha
 * continua sendo o alvo de repetições e tempo, e nunca é alterada por treinar.
 */
export function startSession(plan: WorkoutPlan, logs: WorkoutLog[], startedAt: string): ActiveWorkout {
  return {
    planId: plan.id,
    planName: plan.name,
    startedAt,
    exercises: plan.exercises.map((exercise): SessionExercise => {
      const last = exercise.kind === 'reps' ? lastPerformance(exercise, logs) : undefined
      return {
        id: exercise.id,
        name: exercise.name,
        kind: exercise.kind,
        restSeconds: exercise.restSeconds,
        sets: exercise.sets.map((set, index): SessionSet => {
          if (!last) return { ...set, done: false }
          const previous = last.sets[index]
          const weight = (previous?.done ? previous.weight : last.best.weight) ?? set.weight
          return { ...set, weight, done: false }
        }),
      }
    }),
  }
}

export function markSet(workout: ActiveWorkout, exerciseId: string, setIndex: number, done: boolean): ActiveWorkout {
  return updateSet(workout, exerciseId, setIndex, { done })
}

export function updateSet(workout: ActiveWorkout, exerciseId: string, setIndex: number, change: Partial<SessionSet>): ActiveWorkout {
  return {
    ...workout,
    exercises: workout.exercises.map(exercise => exercise.id !== exerciseId ? exercise : {
      ...exercise,
      sets: exercise.sets.map((set, index) => index === setIndex ? { ...set, ...change } : set),
    }),
  }
}

/** Última série do treino inteiro: depois dela não há descanso a cronometrar. */
export function isFinalSet(workout: ActiveWorkout, exerciseId: string, setIndex: number): boolean {
  const index = workout.exercises.findIndex(item => item.id === exerciseId)
  if (index < 0) return false
  return index === workout.exercises.length - 1 && setIndex === workout.exercises[index].sets.length - 1
}

/** Volume em kg: carga × repetições das séries concluídas. Tempo não entra na conta. */
export function sessionVolume(exercises: SessionExercise[]): number {
  const total = exercises.reduce((sum, exercise) => exercise.kind !== 'reps' ? sum
    : sum + exercise.sets.reduce((acc, set) => acc + (set.done ? (set.weight ?? 0) * (set.reps ?? 0) : 0), 0), 0)
  return Math.round(total * 100) / 100
}

export function sessionProgress(exercises: SessionExercise[]): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      total++
      if (set.done) done++
    }
  }
  return { done, total }
}
