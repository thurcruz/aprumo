/**
 * Minha evolução — a lógica pura por trás da página.
 *
 * Tudo aqui é derivado do que já está no store; nada é inventado. Quando não
 * há dado bastante para uma conclusão, a função devolve `null` em vez de um
 * número: a interface diz "ainda não dá para saber", e não "0%".
 */
import type { Book, FocusSession, Goal, MoodEntry, SleepEntry, Task, TaskEvent, WorkoutLog } from './types'
import { indexEvents, isDoneOn, isoDate, parseDate, taskDueOn, weekStart, type EventIndex } from './utils'
import { formatWeight } from './workout'

export interface EvolutionInput {
  tasks: Task[]
  events: TaskEvent[]
  focusSessions: FocusSession[]
  workoutLogs: WorkoutLog[]
  books: Book[]
  moods: MoodEntry[]
  sleep: SleepEntry[]
  goals: Goal[]
}

/** Dia local (YYYY-MM-DD) de um valor que pode ser data pura ou ISO completo. */
export function dayOf(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : isoDate(new Date(value))
}

/** Soma dias a uma data YYYY-MM-DD, pelo calendário (negativo volta). */
export function addDays(day: string, amount: number): string {
  const date = parseDate(day)
  date.setDate(date.getDate() + amount)
  return isoDate(date)
}

interface Range { from: string; to: string }

/** Janela de `days` dias terminando em hoje — ou `offset` dias antes, para comparar. */
export function windowOf(today: string, days: number, offset = 0): Range {
  const to = addDays(today, -offset)
  return { from: addDays(to, -(days - 1)), to }
}

const inRange = (day: string, range: Range) => day >= range.from && day <= range.to
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
const round1 = (value: number) => Math.round(value * 10) / 10
/** 4 → "4", 4.25 → "4,3". */
const decimal = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',')

export interface DayScore { date: string; due: number; done: number; ratio: number | null }

/**
 * Quanto do que era devido em cada dia foi cumprido. Dia sem nada devido vale
 * `null`, não 0: não ter o que fazer não é falhar.
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/

export function dailyScores(tasks: Task[], index: EventIndex, from: string, to: string): DayScore[] {
  const days: DayScore[] = []
  // Data inválida travaria o laço: "NaN-NaN-NaN" + 1 dia continua "NaN-NaN-NaN".
  // Acontece de verdade no primeiro render, quando "hoje" ainda é ''.
  if (!DAY.test(from) || !DAY.test(to)) return days
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const date = parseDate(day)
    let due = 0
    let done = 0
    for (const task of tasks) {
      if (!taskDueOn(task, date)) continue
      due++
      if (isDoneOn(index, task.id, day)) done++
    }
    days.push({ date: day, due, done, ratio: due ? done / due : null })
  }
  return days
}

/**
 * Constância do período: cumpridos sobre devidos. Diferente da conta antiga,
 * um hábito ignorado pesa — ele não gera evento, mas era devido.
 */
export function consistencyOf(days: DayScore[]): number | null {
  const due = days.reduce((sum, day) => sum + day.due, 0)
  const done = days.reduce((sum, day) => sum + day.done, 0)
  return due ? Math.round(done / due * 100) : null
}

/**
 * Sequência: dias seguidos com pelo menos uma conclusão, em datas locais.
 * Hoje ainda sem nada não quebra a atual — o dia não acabou. A melhor fica
 * guardada mesmo depois de quebrar, para conquista não se desfazer.
 * (Limitada à janela de eventos que o servidor entrega.)
 */
export function streaks(events: TaskEvent[], today: string): { current: number; best: number; bestEndedOn?: string } {
  const dates = new Set(events.filter(event => event.status === 'completed' && event.date <= today).map(event => event.date))
  let current = 0
  let cursor = dates.has(today) ? today : addDays(today, -1)
  while (dates.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }
  let best = 0
  let run = 0
  let previous: string | undefined
  let bestEndedOn: string | undefined
  for (const day of [...dates].sort()) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1
    if (run > best) { best = run; bestEndedOn = day }
    previous = day
  }
  return { current, best, bestEndedOn }
}

export interface HeatCell { date: string; ratio: number | null; future: boolean }

/**
 * Semanas de segunda a domingo terminando na semana de hoje, para o mapa de
 * constância. Os dias depois de hoje entram só para completar a última coluna.
 */
export function heatmap(scores: DayScore[], today: string, weeks: number): HeatCell[][] {
  const byDate = new Map(scores.map(score => [score.date, score.ratio]))
  const start = addDays(isoDate(weekStart(parseDate(today))), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, week) => Array.from({ length: 7 }, (_, weekday) => {
    const date = addDays(start, week * 7 + weekday)
    return { date, ratio: byDate.get(date) ?? null, future: date > today }
  }))
}

export interface Trend { current: number | null; previous: number | null }

/** Diferença pronta para a seta. `null` quando falta base para comparar. */
export function delta(trend: Trend): number | null {
  return trend.current === null || trend.previous === null ? null : round1(trend.current - trend.previous)
}

export interface AreaStats {
  /** % cumprida (devido × feito). */
  consistency: Trend
  focusMinutes: Trend
  workouts: Trend
  volumeKg: Trend
  booksFinished: Trend
  /** Média 1–5. */
  mood: Trend
  /** Média de horas. */
  sleepHours: Trend
}

/**
 * Os números de cada área nos últimos `days` dias, lado a lado com os `days`
 * anteriores. Contagens partem de zero; médias sem registro ficam `null`.
 */
export function areaStats(input: Pick<EvolutionInput, 'tasks' | 'events' | 'focusSessions' | 'workoutLogs' | 'books' | 'moods' | 'sleep'>, today: string, days = 30): AreaStats {
  const index = indexEvents(input.events)
  const current = windowOf(today, days)
  const previous = windowOf(today, days, days)
  const pair = (measure: (range: Range) => number | null): Trend => ({ current: measure(current), previous: measure(previous) })
  const workoutsIn = (range: Range) => input.workoutLogs.filter(log => log.completedAt && inRange(dayOf(log.completedAt), range))
  const average = (values: number[]) => values.length ? round1(mean(values)) : null
  return {
    consistency: pair(range => consistencyOf(dailyScores(input.tasks, index, range.from, range.to))),
    // Mesmo critério da página de Foco: só sessão concluída conta como minuto focado.
    focusMinutes: pair(range => Math.round(input.focusSessions
      .filter(session => session.status === 'completed' && inRange(dayOf(session.startedAt), range))
      .reduce((sum, session) => sum + session.actualSeconds / 60, 0))),
    workouts: pair(range => workoutsIn(range).length),
    volumeKg: pair(range => Math.round(workoutsIn(range).reduce((sum, log) => sum + log.volumeKg, 0))),
    booksFinished: pair(range => input.books.filter(book => book.status === 'lido' && book.finishedAt && inRange(dayOf(book.finishedAt), range)).length),
    mood: pair(range => average(input.moods.filter(entry => inRange(dayOf(entry.date), range)).map(entry => entry.mood))),
    sleepHours: pair(range => average(input.sleep.filter(entry => inRange(dayOf(entry.date), range)).map(entry => entry.hours))),
  }
}

export interface Insight { id: string; text: string; withAvg: number; withoutAvg: number; samples: [number, number] }

/** Menos que isso de cada lado e a "descoberta" seria ruído com cara de fato. */
const MIN_SAMPLES = 3

function phrase(subject: string, withAvg: number, withoutAvg: number): string {
  const diff = round1(withAvg - withoutAvg)
  const numbers = `(${decimal(withAvg)} contra ${decimal(withoutAvg)})`
  if (Math.abs(diff) < 0.3) return `${subject}, seu humor ficou praticamente igual ao dos outros dias ${numbers}.`
  const size = Math.abs(diff)
  return `${subject}, seu humor foi ${decimal(size)} ${size === 1 ? 'ponto' : 'pontos'} ${diff > 0 ? 'mais alto' : 'mais baixo'} ${numbers}.`
}

/**
 * Cruza áreas nos dias em que houve registro de humor. É correlação, não
 * causa: o texto diz "nos dias em que", nunca "treinar melhora seu humor".
 */
export function crossInsights(input: Pick<EvolutionInput, 'tasks' | 'events' | 'focusSessions' | 'workoutLogs' | 'moods' | 'sleep'>, today: string, days = 60): Insight[] {
  const range = windowOf(today, days)
  const moods = new Map<string, number>()
  for (const entry of input.moods) {
    const day = dayOf(entry.date)
    if (inRange(day, range)) moods.set(day, entry.mood)
  }
  const workoutDays = new Set(input.workoutLogs.flatMap(log => log.completedAt ? [dayOf(log.completedAt)] : []))
  const focusDays = new Set(input.focusSessions.filter(session => session.status === 'completed').map(session => dayOf(session.startedAt)))
  const sleepHours = new Map(input.sleep.map(entry => [dayOf(entry.date), entry.hours]))
  const scores = new Map(dailyScores(input.tasks, indexEvents(input.events), range.from, range.to).map(score => [score.date, score.ratio]))

  // `null` = não dá para responder naquele dia (sem registro), e o dia sai da conta.
  const questions: { id: string; subject: string; test: (day: string) => boolean | null }[] = [
    { id: 'treino', subject: 'Nos dias em que você treinou', test: day => workoutDays.has(day) },
    { id: 'foco', subject: 'Nos dias com sessão de foco concluída', test: day => focusDays.has(day) },
    { id: 'sono', subject: 'Nos dias com 7h ou mais de sono', test: day => { const hours = sleepHours.get(day); return hours === undefined ? null : hours >= 7 } },
    { id: 'habitos', subject: 'Nos dias em que cumpriu 80% ou mais dos hábitos', test: day => { const ratio = scores.get(day); return ratio === null || ratio === undefined ? null : ratio >= 0.8 } },
  ]

  const insights: Insight[] = []
  for (const question of questions) {
    const yes: number[] = []
    const no: number[] = []
    for (const [day, mood] of moods) {
      const answer = question.test(day)
      if (answer === null) continue
      if (answer) yes.push(mood)
      else no.push(mood)
    }
    if (yes.length < MIN_SAMPLES || no.length < MIN_SAMPLES) continue
    const withAvg = round1(mean(yes))
    const withoutAvg = round1(mean(no))
    insights.push({ id: question.id, text: phrase(question.subject, withAvg, withoutAvg), withAvg, withoutAvg, samples: [yes.length, no.length] })
  }
  return insights
}

export type TimelineKind = 'goal' | 'milestone' | 'book' | 'first-workout' | 'record' | 'streak' | 'first-focus'
export interface TimelineEntry { date: string; kind: TimelineKind; title: string; detail?: string }

/**
 * A evolução contada como história: o que foi conquistado, do mais recente ao
 * mais antigo. Recorde de carga só quando supera o anterior — a primeira vez
 * que você faz um exercício não é recorde de nada.
 */
export function timeline(input: Pick<EvolutionInput, 'goals' | 'books' | 'workoutLogs' | 'focusSessions' | 'events'>, today: string, limit = 12): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  for (const goal of input.goals) {
    if (goal.status === 'completed' && goal.completedAt) entries.push({ date: dayOf(goal.completedAt), kind: 'goal', title: `Meta concluída: ${goal.title}` })
    for (const milestone of goal.milestones) {
      if (milestone.completed && milestone.completedAt) entries.push({ date: dayOf(milestone.completedAt), kind: 'milestone', title: milestone.title, detail: `Marco de "${goal.title}"` })
    }
  }

  for (const book of input.books) {
    if (book.status === 'lido' && book.finishedAt) entries.push({ date: dayOf(book.finishedAt), kind: 'book', title: `Livro terminado: ${book.title}`, detail: book.author || undefined })
  }

  const logs = input.workoutLogs
    .filter((log): log is WorkoutLog & { completedAt: string } => Boolean(log.completedAt))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  if (logs[0]) entries.push({ date: dayOf(logs[0].completedAt), kind: 'first-workout', title: 'Primeiro treino registrado', detail: logs[0].planName })

  const heaviest = new Map<string, number>()
  for (const log of logs) {
    for (const exercise of log.exercises) {
      if (exercise.kind !== 'reps') continue
      const top = Math.max(0, ...exercise.sets.filter(set => set.done).map(set => set.weight ?? 0))
      if (top <= 0) continue
      const key = exercise.name.trim().toLowerCase()
      const previous = heaviest.get(key)
      if (previous !== undefined && top > previous) {
        entries.push({ date: dayOf(log.completedAt), kind: 'record', title: `Recorde em ${exercise.name}: ${formatWeight(top)} kg`, detail: `antes: ${formatWeight(previous)} kg` })
      }
      if (previous === undefined || top > previous) heaviest.set(key, top)
    }
  }

  const firstFocus = input.focusSessions.filter(session => session.status === 'completed').sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0]
  if (firstFocus) entries.push({ date: dayOf(firstFocus.startedAt), kind: 'first-focus', title: 'Primeira sessão de foco concluída', detail: firstFocus.name || undefined })

  const { best, bestEndedOn } = streaks(input.events, today)
  if (best >= 3 && bestEndedOn) entries.push({ date: bestEndedOn, kind: 'streak', title: `Maior sequência: ${best} dias` })

  return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
}
