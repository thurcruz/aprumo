export type TaskCategory = 'fixa' | 'hoje' | 'repasse'

/** Blocos do dia. `livre` = sem período definido (o padrão). */
export type DayBlock = 'manha' | 'tarde' | 'noite' | 'livre'
export const dayBlocks: { id: DayBlock; label: string }[] = [
  { id: 'manha', label: 'Manhã' },
  { id: 'tarde', label: 'Tarde' },
  { id: 'noite', label: 'Noite' },
  { id: 'livre', label: 'Sem horário' },
]

/** 1 = alta, 2 = normal, 3 = baixa (espelha o smallint do banco). */
export type TaskPriority = 1 | 2 | 3

/** Dia da semana no padrão de Date.getDay(): 0 = domingo … 6 = sábado. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Ordem de exibição brasileira: a semana começa na segunda. */
export const weekdays: { id: Weekday; short: string; label: string }[] = [
  { id: 1, short: 'S', label: 'Segunda' },
  { id: 2, short: 'T', label: 'Terça' },
  { id: 3, short: 'Q', label: 'Quarta' },
  { id: 4, short: 'Q', label: 'Quinta' },
  { id: 5, short: 'S', label: 'Sexta' },
  { id: 6, short: 'S', label: 'Sábado' },
  { id: 0, short: 'D', label: 'Domingo' },
]

/**
 * Recorrência de um hábito, gravada na coluna `frequency` (jsonb) de commitments.
 * Registros antigos trazem o default do banco (`{type:'once'}`), que vale como diário.
 */
export interface HabitFrequency {
  /** Dias da semana em que acontece. Ausente ou vazio = todo dia. */
  days?: Weekday[]
  /** Vigência (YYYY-MM-DD): fora desse intervalo o hábito não aparece.
      Sem `startsOn` vale desde sempre; sem `endsOn` não tem prazo para acabar. */
  startsOn?: string
  endsOn?: string
}

export type TaskSource = 'manual' | 'ai' | 'whatsapp'

export interface Task {
  id: string
  title: string
  category: TaskCategory
  completed: boolean
  completedAt?: string
  createdAt: string
  color?: string
  goalId?: string
  scheduledDate?: string
  startTime?: string
  durationMinutes?: number
  dayBlock?: DayBlock
  priority?: TaskPriority
  source?: TaskSource
  /** Só faz sentido em hábitos (category 'fixa'). Ausente = todo dia. */
  frequency?: HabitFrequency
  /** Hábito de treino: abre esta ficha. No banco, mora no jsonb `frequency`. */
  workoutPlanId?: string
}

export type TaskEventStatus = 'pending' | 'completed' | 'skipped' | 'carried'

/**
 * O que aconteceu com um compromisso num dia específico (espelha commitment_events).
 * É isto — e não o booleano `Task.completed` — que diz se algo foi feito numa data:
 * um hábito é concluído muitas vezes, uma vez por dia.
 */
export interface TaskEvent {
  taskId: string
  date: string
  status: TaskEventStatus
  completedAt?: string
}

export type GoalCategory = 'carreira' | 'saude' | 'financeiro' | 'relacionamentos' | 'conhecimento'

export interface Milestone {
  id: string
  title: string
  completed: boolean
  dueDate?: string
  /** Quando foi concluído. Preservado entre salvamentos, não recalculado. */
  completedAt?: string
}

/**
 * Ciclo de vida da meta (espelha o check da coluna `status`).
 * `archived` some da lista; `paused` continua visível, mas fora das contas.
 */
export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived'

export interface Goal {
  id: string
  title: string
  description: string
  category: GoalCategory
  deadline: string
  progress: number
  milestones: Milestone[]
  linkedTasks: string[]
  status: GoalStatus
  completedAt?: string
}

export type TransactionType = 'entrada' | 'saida'

export interface Transaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  category: string
  createdAt: string
}

/**
 * Objetivo financeiro: mede-se em dinheiro, não em marcos nem em constância.
 * Por isso vive fora de [[Goal]], na área de Finanças.
 */
export interface FinancialGoal {
  id: string
  title: string
  target: number
  current: number
  deadline?: string
}

export interface Addiction {
  id: string
  name: string
  startDate: string
  dailyCost?: number
  relapses: RelapseEntry[]
  triggers: TriggerEntry[]
  contingencyPlan: string[]
}

export interface RelapseEntry {
  id: string
  date: string
  note?: string
}

export interface TriggerEntry {
  id: string
  date: string
  description?: string
  resisted: boolean
}

/** Como uma série se mede: repetições com carga, ou tempo (cardio, isometria). */
export type ExerciseKind = 'reps' | 'time'

/** Série planejada. `reps`/`weight` valem para 'reps'; `seconds` para 'time'. */
export interface PlanSet {
  reps?: number
  weight?: number
  seconds?: number
}

export interface PlanExercise {
  id: string
  name: string
  kind: ExerciseKind
  /** Descanso depois de cada série, em segundos. 0 = sem cronômetro. */
  restSeconds: number
  sets: PlanSet[]
}

/**
 * Ficha de treino (tabela `workout_plans`): o modelo, que não muda quando você
 * treina. O que foi feito num dia é um [[WorkoutLog]].
 */
export interface WorkoutPlan {
  id: string
  name: string
  exercises: PlanExercise[]
}

/** Série executada: o que foi feito de verdade, que pode diferir do plano. */
export interface SessionSet extends PlanSet {
  done: boolean
}

export interface SessionExercise {
  /** Id do exercício na ficha — é por ele que a última carga é encontrada. */
  id: string
  name: string
  kind: ExerciseKind
  restSeconds: number
  sets: SessionSet[]
}

/** Um treino realizado (tabela `workout_sessions`), com o retrato do que foi feito. */
export interface WorkoutLog {
  id: string
  planId?: string
  planName: string
  exercises: SessionExercise[]
  volumeKg: number
  startedAt: string
  completedAt?: string
}

export type BookStatus = 'quero-ler' | 'lendo' | 'lido'

export interface Book {
  id: string
  title: string
  author: string
  status: BookStatus
  rating?: 1 | 2 | 3 | 4 | 5
  notes?: string
  startedAt?: string
  finishedAt?: string
  currentPage?: number
  totalPages?: number
}

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export type MoodLevel = 1 | 2 | 3 | 4 | 5

export interface MoodEntry {
  id: string
  date: string
  mood: MoodLevel
  note?: string
}

export type FocusStatus = 'running' | 'completed' | 'abandoned'

export interface FocusSession {
  id: string
  commitmentId?: string
  name: string
  plannedMinutes: number
  actualSeconds: number
  interruptions: number
  reflection?: string
  status: FocusStatus
  startedAt: string
  endedAt?: string
}

export interface SleepEntry {
  id: string
  date: string
  hours: number
  quality: MoodLevel
  note?: string
}

export type RepertoireKind = 'ideia' | 'citacao' | 'aprendizado' | 'nota'

export interface RepertoireItem {
  id: string
  kind: RepertoireKind
  text: string
  source?: string
  createdAt: string
}

export interface AprumoStore {
  tasks: Task[]
  /** Conclusões por dia. Ver [[TaskEvent]]: `Task.completed` só vale para hoje. */
  taskEvents: TaskEvent[]
  goals: Goal[]
  transactions: Transaction[]
  financialGoals: FinancialGoal[]
  addictions: Addiction[]
  workouts: WorkoutPlan[]
  /** Treinos realizados. A ficha nunca é "concluída" — o histórico é que cresce. */
  workoutLogs: WorkoutLog[]
  books: Book[]
  notes: Note[]
  moods: MoodEntry[]
  repertoire: RepertoireItem[]
  sleep: SleepEntry[]
  focusSessions: FocusSession[]
  userName: string
  purpose: string
  metrics: EvolutionMetrics
}

export interface EvolutionMetrics {
  streak: number
  completedCommitments: number
  totalCommitments: number
  carriedCommitments: number
  completedGoals: number
  periodDays: number
  /** Conclusões de todos os tempos, não só da janela carregada. Base do XP. */
  lifetimeCompleted?: number
}
