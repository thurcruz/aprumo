import { weekdays, type Goal, type HabitFrequency, type Milestone, type Task, type TaskEvent, type Weekday } from './types'

/** Data local no formato YYYY-MM-DD. Evita o deslocamento de fuso do toISOString(). */
export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Lê YYYY-MM-DD como data local. O meio-dia evita viradas de fuso na conversão. */
export function parseDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T12:00:00`)
}

/** Dias inteiros entre duas datas YYYY-MM-DD. Negativo se `to` vier antes de `from`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000)
}

/** O dia seguinte a uma data YYYY-MM-DD. Soma no calendário, não em milissegundos. */
export function nextDay(value: string): string {
  const date = parseDate(value)
  date.setDate(date.getDate() + 1)
  return isoDate(date)
}

/** Segunda-feira da semana que contém a data. */
export function weekStart(date: Date): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Um hábito acontece neste dia? Precisa estar dentro da vigência e cair num dos
 * dias da semana escolhidos. Sem frequência definida vale todo dia — é o
 * comportamento dos registros criados antes da recorrência existir.
 */
export function habitRunsOn(frequency: HabitFrequency | undefined, date: Date): boolean {
  if (!frequency) return true
  const day = isoDate(date)
  if (frequency.startsOn && day < frequency.startsOn) return false
  if (frequency.endsOn && day > frequency.endsOn) return false
  if (!frequency.days || frequency.days.length === 0) return true
  return frequency.days.includes(date.getDay() as Weekday)
}

/** "Seg, Qua e Sex" — como a recorrência se lê na interface. */
export function describeFrequency(frequency: HabitFrequency | undefined): string {
  const days = frequency?.days
  if (!days || days.length === 0 || days.length === 7) return 'Todo dia'
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Dias de semana'
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Fim de semana'
  const names = weekdays.filter(day => days.includes(day.id)).map(day => day.label.slice(0, 3))
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

/** "até 10 de dez" ou "de 1 de out a 20 de dez" — a vigência, quando existe. */
export function describeSpan(frequency: HabitFrequency | undefined): string | undefined {
  if (!frequency?.startsOn && !frequency?.endsOn) return undefined
  const short = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(parseDate(value))
  if (frequency.startsOn && frequency.endsOn) return `de ${short(frequency.startsOn)} a ${short(frequency.endsOn)}`
  return frequency.endsOn ? `até ${short(frequency.endsOn)}` : `a partir de ${short(frequency.startsOn!)}`
}

/** Minutos entre dois horários HH:MM; atravessar a meia-noite conta como no dia seguinte. */
export function minutesBetween(start: string, end: string): number {
  const [startHours, startMinutes] = start.split(':').map(Number)
  const [endHours, endMinutes] = end.split(':').map(Number)
  const diff = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)
  return diff > 0 ? diff : diff + 1440
}

/** Fim somado ao início, para preencher o campo "às" a partir do que está salvo. */
export function endFrom(startTime: string | undefined, durationMinutes: number | undefined, fallback = '08:00'): string {
  if (!startTime) return fallback
  const [hours, minutes] = startTime.split(':').map(Number)
  const total = hours * 60 + minutes + (durationMinutes ?? 60)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Consulta dos eventos por dia, montada uma vez por render. */
export interface EventIndex {
  /** Chaveado por `taskId|data`. */
  byDay: Map<string, TaskEvent>
  /** Primeira data em que cada tarefa foi concluída — encerra o arrasto. */
  firstDone: Map<string, string>
}

export function indexEvents(events: TaskEvent[]): EventIndex {
  const byDay = new Map<string, TaskEvent>()
  const firstDone = new Map<string, string>()
  for (const event of events) {
    byDay.set(`${event.taskId}|${event.date}`, event)
    if (event.status === 'completed') {
      const current = firstDone.get(event.taskId)
      if (!current || event.date < current) firstDone.set(event.taskId, event.date)
    }
  }
  return { byDay, firstDone }
}

/** A tarefa foi concluída neste dia? */
export function isDoneOn(index: EventIndex, taskId: string, day: string): boolean {
  return index.byDay.get(`${taskId}|${day}`)?.status === 'completed'
}

/** O dia a que a tarefa pertence: o agendado ou, na falta, o da criação. */
export function taskDay(task: Task): string {
  return task.scheduledDate?.slice(0, 10) ?? isoDate(new Date(task.createdAt))
}

/**
 * A tarefa aparece neste dia?
 *
 * - Hábito: nos dias da própria recorrência.
 * - Tarefa do dia: no dia dela e, se continuar pendente, nos seguintes — é a
 *   dívida que se arrasta. Uma vez concluída ela pertence ao dia em que foi
 *   feita e para de reaparecer, senão o dia entulharia com o passado.
 */
export function taskShowsOn(task: Task, day: string, index: EventIndex): boolean {
  if (task.category === 'fixa') return habitRunsOn(task.frequency, parseDate(day))
  const own = taskDay(task)
  if (own === day) return true
  if (own > day) return false
  const done = index.firstDone.get(task.id)
  return !done || done > day
}

/**
 * A tarefa era devida neste dia? Hábito, nos dias da recorrência — mas nunca
 * antes de existir, senão um hábito criado hoje chegaria com um mês de faltas.
 * Tarefa avulsa, só no próprio dia: o arrasto de uma pendência não é uma nova
 * obrigação. É a base de toda constância "devido × feito".
 */
export function taskDueOn(task: Task, date: Date): boolean {
  const day = isoDate(date)
  if (task.category !== 'fixa') return taskDay(task) === day
  return day >= isoDate(new Date(task.createdAt)) && habitRunsOn(task.frequency, date)
}

/** O hábito já passou do prazo que o usuário definiu? */
export function habitExpired(frequency: HabitFrequency | undefined, today = new Date()): boolean {
  return Boolean(frequency?.endsOn && isoDate(today) > frequency.endsOn)
}

/** Fim derivado do início mais a duração: o banco guarda start_time + duration_minutes. */
export function endTimeOf(task: Pick<Task, 'startTime'|'durationMinutes'>): string | undefined {
  if (!task.startTime) return undefined
  const [hours, minutes] = task.startTime.split(':').map(Number)
  const total = hours * 60 + minutes + (task.durationMinutes ?? 0)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

/** "6,5 h" — horas com vírgula decimal, como se escreve no Brasil. */
export function formatHours(hours: number): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(hours)} h`
}

/** Só a primeira letra em maiúscula: "setembro de 2026" vira "Setembro de 2026", sem mexer no "de". */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1)
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// --- Metas ------------------------------------------------------------------

/** Situação do prazo, para colorir e ordenar sem repetir a conta na interface. */
export type DeadlineState = 'none' | 'late' | 'today' | 'soon' | 'ok'

export function deadlineState(deadline: string | undefined, today: string, soonDays = 14): DeadlineState {
  if (!deadline) return 'none'
  const days = daysBetween(today, deadline.slice(0, 10))
  if (days < 0) return 'late'
  if (days === 0) return 'today'
  return days <= soonDays ? 'soon' : 'ok'
}

/** "faltam 12 dias", "venceu há 3 dias" — o prazo em linguagem de gente. */
export function describeDeadline(deadline: string | undefined, today: string): string | undefined {
  if (!deadline) return undefined
  const days = daysBetween(today, deadline.slice(0, 10))
  if (days === 0) return 'vence hoje'
  if (days === 1) return 'vence amanhã'
  if (days === -1) return 'venceu ontem'
  if (days < 0) return `venceu há ${-days} dias`
  if (days < 31) return `faltam ${days} dias`
  const months = Math.round(days / 30)
  return months === 1 ? 'falta cerca de 1 mês' : `faltam cerca de ${months} meses`
}

/**
 * Constância das tarefas ligadas a uma meta: dos dias em que elas deviam
 * acontecer na janela, quantos foram cumpridos.
 *
 * Hábitos contam por dia da recorrência. Tarefas avulsas contam só no próprio
 * dia — usar a regra de arrasto aqui puniria duas vezes a mesma pendência.
 * Devolve `undefined` quando não há nada devido: 0% seria mentira.
 */
export function goalConsistency(tasks: Task[], index: EventIndex, today: string, days = 30): number | undefined {
  let due = 0
  let done = 0
  for (let offset = 0; offset < days; offset++) {
    const date = parseDate(today)
    date.setDate(date.getDate() - offset)
    const day = isoDate(date)
    for (const task of tasks) {
      if (!taskDueOn(task, date)) continue
      due++
      if (isDoneOn(index, task.id, day)) done++
    }
  }
  return due === 0 ? undefined : Math.round(done / due * 100)
}

/**
 * Progresso da meta. Marcos são a medida preferida — são o destino que o
 * usuário mesmo definiu. Sem marcos, a constância das tarefas ligadas evita que
 * a meta fique presa em 0% para sempre só porque ninguém quebrou ela em etapas.
 */
export function goalProgress(milestones: Milestone[], consistency?: number): number {
  if (milestones.length > 0) return Math.round(milestones.filter(m => m.completed).length / milestones.length * 100)
  return consistency ?? 0
}

/** Um aviso que a meta merece receber, quando merece. */
export interface GoalAlert {
  tone: 'danger' | 'attention'
  text: string
}

/**
 * O que a meta tem a cobrar de você hoje.
 *
 * Devolve no máximo um aviso — o mais urgente. Cobrar tudo de uma vez vira
 * ruído, e ruído se ignora. Meta encerrada ou pausada não cobra nada: foi uma
 * decisão sua, não um descuido.
 */
export function goalAlert(goal: Goal, options: { today: string; consistency?: number; linkedCount: number }): GoalAlert | undefined {
  if (goal.status !== 'active') return undefined
  const { today, consistency, linkedCount } = options
  const state = deadlineState(goal.deadline, today)

  if (state === 'late') {
    const days = -daysBetween(today, goal.deadline.slice(0, 10))
    return { tone: 'danger', text: days === 1 ? 'Passou do prazo ontem e segue aberta.' : `Passou do prazo há ${days} dias e segue aberta.` }
  }
  // Uma meta sem marcos e sem comportamento é só um desejo escrito.
  if (goal.milestones.length === 0 && linkedCount === 0) {
    return { tone: 'attention', text: 'Ainda não virou comportamento: sem marcos e sem tarefas ligadas.' }
  }
  if (consistency !== undefined && consistency < 40) {
    return { tone: 'attention', text: `Constância em ${consistency}% nos últimos 30 dias. O que você combinou não está acontecendo.` }
  }
  if ((state === 'soon' || state === 'today') && goal.progress < 60) {
    const days = daysBetween(today, goal.deadline.slice(0, 10))
    return { tone: 'attention', text: days === 0 ? `Vence hoje e está em ${goal.progress}%.` : `Faltam ${days} dias e você está em ${goal.progress}%.` }
  }
  return undefined
}
