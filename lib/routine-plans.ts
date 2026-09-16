import type { DayBlock, Task, TaskEvent, TaskSource, Weekday } from './types'
import { daysBetween, habitRunsOn, indexEvents, isDoneOn, isoDate, nextDay, parseDate } from './utils'

/**
 * Planos prontos (corrida, leitura, meditação…) que viram hábitos na agenda.
 *
 * Um plano não tem tabela própria: cada fase é um hábito comum (`commitments`)
 * com vigência de começo e fim, e o jsonb `frequency` guarda de qual plano ele
 * veio (`routinePlanId`, `routinePlanSlug`) — o mesmo lugar do `workoutPlanId`.
 * A progressão são fases em sequência: "semanas 1–2" termina no dia anterior
 * ao começo de "semanas 3–4".
 *
 * Tudo aqui é puro. O `build` de cada modelo é o plano padrão (Free) e também a
 * base que a Pri adapta à rotina (Aprumo+) em lib/routine-plan-engine.ts — as
 * duas saídas passam pela mesma validação, `sanitizePlanHabits`.
 */

export type PlanLevel = 'iniciante' | 'intermediario'
export type PlanIcon = 'run' | 'book' | 'breath' | 'moon' | 'wallet' | 'language'

/** O que a pessoa responde antes de montar o plano. */
export interface PlanAnswers {
  level: PlanLevel
  /** Dias disponíveis, 0 = domingo … 6 = sábado. Nunca vazio. */
  days: Weekday[]
  dayBlock: DayBlock
  /** HH:MM. Sem horário, o hábito fica só no período do dia. */
  startTime?: string
  /** Duração da sessão, quando o modelo deixa escolher. */
  minutes: number
  /** YYYY-MM-DD — o primeiro dia da semana 1. */
  startsOn: string
  /** Só vai para a Pri: "reunião toda terça às 7h", "joelho sensível". */
  note?: string
}

/** Um hábito do plano — exatamente o que vira `Task` ao adotar. */
export interface PlanHabit {
  title: string
  days: Weekday[]
  dayBlock: DayBlock
  startTime?: string
  durationMinutes: number
  startsOn: string
  endsOn: string
}

export interface RoutinePlanTemplate {
  slug: string
  title: string
  tagline: string
  description: string
  area: 'Saúde' | 'Mente' | 'Finanças'
  icon: PlanIcon
  color: string
  weeks: number
  /** Pergunta o nível (iniciante × intermediário) só onde isso muda o plano. */
  levels: boolean
  defaults: { days: Weekday[]; dayBlock: DayBlock; minutes: number; startTime?: string }
  /** Durações oferecidas. Vazio = a duração é do plano, não se pergunta. */
  minutesOptions: number[]
  build: (answers: PlanAnswers) => PlanHabit[]
}

export const MAX_PLAN_HABITS = 12

const everyDay: Weekday[] = [0, 1, 2, 3, 4, 5, 6]
const BLOCKS: DayBlock[] = ['manha', 'tarde', 'noite', 'livre']
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

function shiftDays(value: string, days: number): string {
  const date = parseDate(value)
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

/** YYYY-MM-DD que existe no calendário (recusa 2026-02-30). */
function isValidDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && isoDate(parseDate(value)) === value
}

function cleanDays(value: unknown): Weekday[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((day): day is Weekday => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b)
}

const round5 = (value: number) => Math.max(5, Math.round(value / 5) * 5)

/** Fase da semana `from` à semana `to` (1 = a semana em que o plano começa). */
function phase(answers: PlanAnswers, from: number, to: number, title: string, options: Partial<Pick<PlanHabit, 'days' | 'dayBlock' | 'startTime' | 'durationMinutes'>> = {}): PlanHabit {
  const startsOn = shiftDays(answers.startsOn, (from - 1) * 7)
  return {
    title,
    days: options.days ?? answers.days,
    dayBlock: options.dayBlock ?? answers.dayBlock,
    startTime: 'startTime' in options ? options.startTime : answers.startTime,
    durationMinutes: options.durationMinutes ?? answers.minutes,
    startsOn,
    endsOn: shiftDays(startsOn, (to - from + 1) * 7 - 1),
  }
}

export const ROUTINE_PLANS: RoutinePlanTemplate[] = [
  {
    slug: 'corrida-5k', title: 'Do sofá aos 5 km', area: 'Saúde', icon: 'run', color: '#70443c', weeks: 8,
    tagline: 'Três corridas por semana, do trote aos 5 km.',
    description: 'Alterna corrida e caminhada e aumenta a parte correndo a cada duas semanas. Sentiu dor, pare — o plano espera por você.',
    levels: true,
    defaults: { days: [2, 4, 6], dayBlock: 'manha', minutes: 30 },
    // A duração acompanha a fase (com 5 min de aquecimento): não se escolhe.
    minutesOptions: [],
    build: answers => answers.level === 'intermediario' ? [
      phase(answers, 1, 2, 'Corrida · 20 min contínuos em ritmo leve', { durationMinutes: 25 }),
      phase(answers, 3, 4, 'Corrida · 20 min leves + 4 tiros de 30 s', { durationMinutes: 30 }),
      phase(answers, 5, 6, 'Corrida · 30 min contínuos', { durationMinutes: 35 }),
      phase(answers, 7, 8, 'Corrida · 5 km no seu ritmo', { durationMinutes: 40 }),
    ] : [
      phase(answers, 1, 2, 'Corrida · 1 min correndo + 1min30 caminhando, 8 vezes', { durationMinutes: 25 }),
      phase(answers, 3, 4, 'Corrida · 3 min correndo + 1min30 caminhando, 5 vezes', { durationMinutes: 30 }),
      phase(answers, 5, 6, 'Corrida · 8 min correndo + 2 min caminhando, 3 vezes', { durationMinutes: 35 }),
      phase(answers, 7, 8, 'Corrida · 20 a 30 min contínuos, rumo aos 5 km', { durationMinutes: 35 }),
    ],
  },
  {
    slug: 'leitura', title: 'Leitor de todo dia', area: 'Mente', icon: 'book', color: '#344d62', weeks: 4,
    tagline: 'Alguns minutos por dia até ler virar automático.',
    description: 'Começa pequeno para não depender de força de vontade e cresce até o tempo que você escolheu. Na reta final, cada leitura deixa uma frase no Repertório.',
    levels: false,
    defaults: { days: everyDay, dayBlock: 'noite', minutes: 20 },
    minutesOptions: [10, 20, 30],
    build: answers => {
      const first = round5(answers.minutes * .5)
      const second = round5(answers.minutes * .75)
      return [
        phase(answers, 1, 1, `Leitura · ${first} min, só para começar`, { durationMinutes: first }),
        phase(answers, 2, 2, `Leitura · ${second} min`, { durationMinutes: second }),
        phase(answers, 3, 4, `Leitura · ${answers.minutes} min + 1 frase no Repertório`),
      ]
    },
  },
  {
    slug: 'meditacao', title: 'Mente em silêncio', area: 'Mente', icon: 'breath', color: '#5d4c6d', weeks: 4,
    tagline: 'Da respiração de 3 minutos à meditação sem guia.',
    description: 'Uma semana de respiração, uma de meditação guiada e duas em silêncio, no tempo que você escolher.',
    levels: false,
    defaults: { days: everyDay, dayBlock: 'manha', minutes: 10 },
    minutesOptions: [5, 10, 15, 20],
    build: answers => [
      phase(answers, 1, 1, 'Respiração · 3 min, 4 s para entrar e 6 s para sair', { durationMinutes: 5 }),
      phase(answers, 2, 2, `Meditação guiada · ${answers.minutes} min`),
      phase(answers, 3, 4, `Meditação em silêncio · ${answers.minutes} min`),
    ],
  },
  {
    slug: 'sono', title: 'Sono no horário', area: 'Saúde', icon: 'moon', color: '#2f3a4f', weeks: 3,
    tagline: 'Um ritual antes de deitar e o registro de como dormiu.',
    description: 'Telas desligadas e luz baixa no mesmo horário toda noite. A partir da segunda semana, você anota o sono de manhã para ver o efeito.',
    levels: false,
    defaults: { days: everyDay, dayBlock: 'noite', minutes: 30, startTime: '22:30' },
    minutesOptions: [20, 30, 45],
    build: answers => [
      phase(answers, 1, 3, 'Ritual do sono · telas desligadas e luz baixa'),
      phase(answers, 2, 3, 'Sono · registrar como dormiu', { dayBlock: 'manha', startTime: undefined, durationMinutes: 5 }),
    ],
  },
  {
    slug: 'gastos', title: '30 dias de gastos às claras', area: 'Finanças', icon: 'wallet', color: '#4f5844', weeks: 4,
    tagline: 'Anotar todo gasto e revisar a semana.',
    description: 'Cinco minutos à noite para registrar o que saiu e uma revisão semanal para ajustar o orçamento. Sem planilha.',
    levels: false,
    defaults: { days: everyDay, dayBlock: 'noite', minutes: 5 },
    minutesOptions: [],
    build: answers => {
      // A revisão cai no domingo quando ele está livre; senão, no último dia escolhido.
      const reviewDay = answers.days.includes(0) ? 0 : answers.days[answers.days.length - 1]
      return [
        phase(answers, 1, 4, 'Finanças · anotar os gastos do dia', { durationMinutes: 5 }),
        phase(answers, 1, 4, 'Finanças · revisar a semana e ajustar o orçamento', { days: [reviewDay], durationMinutes: 20 }),
      ]
    },
  },
  {
    slug: 'idioma', title: 'Idioma em 8 semanas', area: 'Mente', icon: 'language', color: '#6b5b37', weeks: 8,
    tagline: 'Vocabulário, escuta, leitura e fala — uma etapa por vez.',
    description: 'A cada duas semanas o foco muda: primeiro palavras, depois ouvir, ler em voz alta e, no fim, falar.',
    levels: false,
    defaults: { days: [1, 2, 3, 4, 5], dayBlock: 'noite', minutes: 20 },
    minutesOptions: [15, 20, 30],
    build: answers => [
      phase(answers, 1, 2, 'Idioma · vocabulário e frases do dia a dia'),
      phase(answers, 3, 4, 'Idioma · ouvir um podcast ou série curta com legenda'),
      phase(answers, 5, 6, 'Idioma · ler um texto curto em voz alta'),
      phase(answers, 7, 8, 'Idioma · falar 3 min sobre o seu dia (grave ou converse)'),
    ],
  },
]

export function findRoutinePlan(slug: string | undefined): RoutinePlanTemplate | undefined {
  return ROUTINE_PLANS.find(template => template.slug === slug)
}

export function defaultAnswers(template: RoutinePlanTemplate, today: string): PlanAnswers {
  return {
    level: 'iniciante',
    days: template.defaults.days,
    dayBlock: template.defaults.dayBlock,
    startTime: template.defaults.startTime,
    minutes: template.defaults.minutes,
    startsOn: today,
  }
}

/** Do primeiro ao último dia do plano, inclusive. */
export function planWindow(template: RoutinePlanTemplate, answers: Pick<PlanAnswers, 'startsOn'>): { startsOn: string; endsOn: string } {
  return { startsOn: answers.startsOn, endsOn: shiftDays(answers.startsOn, template.weeks * 7 - 1) }
}

/** Respostas vindas do cliente. Devolve `null` quando não dá para montar nada. */
export function parsePlanAnswers(raw: unknown, template: RoutinePlanTemplate): PlanAnswers | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const days = cleanDays(value.days)
  if (days.length === 0 || !isValidDay(value.startsOn)) return null
  const minutes = Number(value.minutes)
  const note = typeof value.note === 'string' ? value.note.trim().slice(0, 400) : ''
  return {
    level: template.levels && value.level === 'intermediario' ? 'intermediario' : 'iniciante',
    days,
    dayBlock: BLOCKS.includes(value.dayBlock as DayBlock) ? value.dayBlock as DayBlock : template.defaults.dayBlock,
    startTime: typeof value.startTime === 'string' && TIME.test(value.startTime) ? value.startTime : undefined,
    minutes: template.minutesOptions.includes(minutes) ? minutes : template.defaults.minutes,
    startsOn: value.startsOn,
    ...(note ? { note } : {}),
  }
}

/**
 * Hábitos confiáveis a partir do que veio da Pri (ou de qualquer lugar): corta
 * o que não se aproveita e prende datas, horários e durações ao plano. Nunca
 * lança — o pior caso é uma lista vazia.
 */
export function sanitizePlanHabits(raw: unknown, window: { startsOn: string; endsOn: string }): PlanHabit[] {
  if (!Array.isArray(raw)) return []
  const clampDay = (value: unknown, fallback: string) => {
    if (!isValidDay(value)) return fallback
    if (value < window.startsOn) return window.startsOn
    return value > window.endsOn ? window.endsOn : value
  }
  const habits: PlanHabit[] = []
  for (const item of raw.slice(0, MAX_PLAN_HABITS)) {
    if (!item || typeof item !== 'object') continue
    const value = item as Record<string, unknown>
    const title = typeof value.title === 'string' ? value.title.trim().slice(0, 160) : ''
    const days = cleanDays(value.days)
    if (title.length < 2 || days.length === 0) continue
    const startsOn = clampDay(value.startsOn, window.startsOn)
    const endsOn = clampDay(value.endsOn, window.endsOn)
    if (endsOn < startsOn) continue
    const minutes = Number(value.durationMinutes)
    habits.push({
      title,
      days,
      dayBlock: BLOCKS.includes(value.dayBlock as DayBlock) ? value.dayBlock as DayBlock : 'livre',
      startTime: typeof value.startTime === 'string' && TIME.test(value.startTime) ? value.startTime : undefined,
      durationMinutes: Number.isFinite(minutes) ? Math.min(240, Math.max(5, Math.round(minutes))) : 30,
      startsOn,
      endsOn,
    })
  }
  return habits
}

export function planHabitToTask(habit: PlanHabit, plan: { id: string; slug: string }, options: { id: string; source: TaskSource; now?: Date }): Task {
  return {
    id: options.id,
    title: habit.title,
    category: 'fixa',
    completed: false,
    createdAt: (options.now ?? new Date()).toISOString(),
    dayBlock: habit.dayBlock,
    priority: 2,
    source: options.source,
    // Sete dias é o mesmo que nenhum filtro — como no resto dos hábitos.
    frequency: { ...(habit.days.length < 7 ? { days: habit.days } : {}), startsOn: habit.startsOn, endsOn: habit.endsOn },
    startTime: habit.startTime,
    durationMinutes: habit.durationMinutes,
    routinePlanId: plan.id,
    routinePlanSlug: plan.slug,
  }
}

export interface PlanProgress {
  id: string
  slug: string
  template?: RoutinePlanTemplate
  tasks: Task[]
  startsOn: string
  endsOn: string
  /** Semana corrente, de 1 ao total. Antes de começar, 0. */
  week: number
  totalWeeks: number
  status: 'upcoming' | 'running' | 'finished'
  /** Sessões devidas do começo até hoje, e quantas foram feitas. */
  due: number
  done: number
  /** O que o plano pede hoje. */
  today: Task[]
}

/** Os planos adotados, reconstruídos a partir dos hábitos que carregam `routinePlanId`. */
export function planProgress(tasks: Task[], events: TaskEvent[], today: string): PlanProgress[] {
  const groups = new Map<string, Task[]>()
  for (const task of tasks) {
    if (task.routinePlanId) groups.set(task.routinePlanId, [...(groups.get(task.routinePlanId) ?? []), task])
  }
  const index = indexEvents(events)
  const todayDate = parseDate(today)
  return [...groups].map(([id, list]) => {
    const startsOn = list.reduce((min, task) => { const day = task.frequency?.startsOn ?? today; return day < min ? day : min }, '9999-12-31')
    const endsOn = list.reduce((max, task) => { const day = task.frequency?.endsOn ?? today; return day > max ? day : max }, '0000-01-01')
    const totalWeeks = Math.max(1, Math.ceil((daysBetween(startsOn, endsOn) + 1) / 7))
    const status: PlanProgress['status'] = today < startsOn ? 'upcoming' : today > endsOn ? 'finished' : 'running'
    const week = status === 'upcoming' ? 0 : Math.min(totalWeeks, Math.floor(daysBetween(startsOn, today) / 7) + 1)
    let due = 0
    let done = 0
    const last = today < endsOn ? today : endsOn
    for (let day = startsOn; day <= last; day = nextDay(day)) {
      const date = parseDate(day)
      for (const task of list) {
        if (!habitRunsOn(task.frequency, date)) continue
        due++
        if (isDoneOn(index, task.id, day)) done++
      }
    }
    const slug = list[0].routinePlanSlug ?? ''
    return {
      id, slug, template: findRoutinePlan(slug), tasks: list, startsOn, endsOn, week, totalWeeks, status, due, done,
      today: status === 'running' ? list.filter(task => habitRunsOn(task.frequency, todayDate)) : [],
    }
  }).sort((a, b) => a.startsOn.localeCompare(b.startsOn))
}

/**
 * Encerrar um plano sem apagar o que já foi feito: fases que ainda não
 * começaram saem; as em andamento terminam hoje (o histórico fica); as que já
 * acabaram não mudam.
 */
export function planEndChanges(tasks: Task[], today: string): { remove: string[]; update: Task[] } {
  const remove: string[] = []
  const update: Task[] = []
  for (const task of tasks) {
    const startsOn = task.frequency?.startsOn
    const endsOn = task.frequency?.endsOn
    if (startsOn && startsOn > today) remove.push(task.id)
    else if (!endsOn || endsOn > today) update.push({ ...task, frequency: { ...task.frequency, endsOn: today } })
  }
  return { remove, update }
}
