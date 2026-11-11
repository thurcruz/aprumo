import { planProgress, sanitizePlanHabits, shiftDays, type PlanHabit, type PlanProgress } from './routine-plans'
import type { DayBlock, Goal, GoalCategory, Task, TaskEvent } from './types'

/**
 * Diagnóstico: a conversa curta que substitui o onboarding. A pessoa diz onde
 * quer chegar e o que atrapalha; a Pri devolve poucas ações testáveis para as
 * primeiras semanas. O plano não tem tabela própria — são hábitos com
 * `routinePlanSlug = 'diagnostico'`, ligados à meta, como os planos prontos.
 *
 * Tudo aqui é puro; a chamada à IA mora em lib/diagnosis-engine.ts.
 */

export const DIAGNOSIS_SLUG = 'diagnostico'
/** O primeiro ciclo: curto o bastante para testar, longo o bastante para ver efeito. */
export const DIAGNOSIS_WEEKS = 4
export const MAX_DIAGNOSIS_ACTIONS = 4
export const GOAL_DAYS = 90
export const DIAGNOSIS_MINUTES = [15, 30, 60] as const

export const DIAGNOSIS_AREAS: { id: GoalCategory; label: string }[] = [
  { id: 'carreira', label: 'Carreira e negócio' },
  { id: 'saude', label: 'Saúde e energia' },
  { id: 'financeiro', label: 'Dinheiro' },
  { id: 'relacionamentos', label: 'Relacionamentos' },
  { id: 'conhecimento', label: 'Estudo e aprendizado' },
]

const BLOCKS: DayBlock[] = ['manha', 'tarde', 'noite', 'livre']

export interface DiagnosisAnswers {
  name: string
  /** Onde a pessoa quer chegar, nas palavras dela. */
  destination: string
  area: GoalCategory
  /** O que hoje mais atrapalha. */
  obstacle: string
  minutesPerDay: number
  dayBlock: DayBlock
}

export interface DiagnosisPlan {
  goalTitle: string
  summary: string
  habits: PlanHabit[]
}

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''

/** Respostas vindas do cliente. `null` quando falta o essencial. */
export function parseDiagnosisAnswers(raw: unknown): DiagnosisAnswers | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const name = text(value.name, 60)
  const destination = text(value.destination, 240)
  const obstacle = text(value.obstacle, 240)
  const area = DIAGNOSIS_AREAS.find(item => item.id === value.area)?.id
  const minutes = Number(value.minutesPerDay)
  if (name.length < 2 || destination.length < 4 || !area) return null
  return {
    name,
    destination,
    area,
    obstacle,
    minutesPerDay: (DIAGNOSIS_MINUTES as readonly number[]).includes(minutes) ? minutes : 30,
    dayBlock: BLOCKS.includes(value.dayBlock as DayBlock) ? value.dayBlock as DayBlock : 'livre',
  }
}

export function diagnosisWindow(today: string): { startsOn: string; endsOn: string } {
  return { startsOn: today, endsOn: shiftDays(today, DIAGNOSIS_WEEKS * 7 - 1) }
}

/** O que veio da Pri, preso ao ciclo: poucas ações, nenhuma maior que o tempo do dia. */
export function sanitizeDiagnosisHabits(raw: unknown, answers: Pick<DiagnosisAnswers, 'minutesPerDay'>, window: { startsOn: string; endsOn: string }): PlanHabit[] {
  return sanitizePlanHabits(raw, window)
    .slice(0, MAX_DIAGNOSIS_ACTIONS)
    .map(habit => ({ ...habit, durationMinutes: Math.min(habit.durationMinutes, answers.minutesPerDay) }))
}

/** Plano sem IA: a meta e um passo diário no tempo combinado. Nunca deixa ninguém sem começar. */
export function basicDiagnosisPlan(answers: DiagnosisAnswers, today: string): DiagnosisPlan {
  const window = diagnosisWindow(today)
  return {
    goalTitle: answers.destination.slice(0, 120),
    summary: `Um passo por dia, ${answers.minutesPerDay} minutos. Em ${DIAGNOSIS_WEEKS} semanas, vale revisar o que funcionou.`,
    habits: [{
      title: `${answers.minutesPerDay} min rumo à meta`,
      days: [0, 1, 2, 3, 4, 5, 6],
      dayBlock: answers.dayBlock,
      durationMinutes: answers.minutesPerDay,
      startsOn: window.startsOn,
      endsOn: window.endsOn,
    }],
  }
}

/** O plano do diagnóstico mais recente, com o andamento reconstruído dos hábitos. */
export function currentDiagnosisPlan(tasks: Task[], events: TaskEvent[], today: string): PlanProgress | undefined {
  return planProgress(tasks, events, today).filter(item => item.slug === DIAGNOSIS_SLUG).at(-1)
}

export function diagnosisGoal(plan: Pick<DiagnosisPlan, 'goalTitle' | 'summary'>, answers: Pick<DiagnosisAnswers, 'area'>, options: { id: string; today: string }): Goal {
  return {
    id: options.id,
    title: plan.goalTitle,
    description: plan.summary,
    category: answers.area,
    deadline: shiftDays(options.today, GOAL_DAYS),
    progress: 0,
    milestones: [],
    linkedTasks: [],
    status: 'active',
  }
}
