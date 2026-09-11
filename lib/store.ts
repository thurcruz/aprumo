'use client'

import { useState, useEffect, useCallback } from 'react'
import { AprumoStore, Task, TaskEvent, Goal, Transaction, FinancialGoal, Addiction, WorkoutPlan, WorkoutLog, Book, Note, MoodEntry, RepertoireItem, SleepEntry, FocusSession } from './types'
import { isoDate, nextDay } from './utils'
import { parsePlanExercises } from './workout'

const STORAGE_KEY = 'aprumo-store'
const VERSION_KEY = 'aprumo-store-version'
// Suba esta versão sempre que o estado local precisar ser descartado.
// v2: remoção dos dados fictícios de demonstração.
const STORAGE_VERSION = '2'
const BACKEND_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const initialData: AprumoStore = {
  metrics: { streak: 0, completedCommitments: 0, totalCommitments: 0, carriedCommitments: 0, completedGoals: 0, periodDays: 30, lifetimeCompleted: 0 },
  userName: '',
  purpose: '',
  tasks: [],
  taskEvents: [],
  goals: [],
  transactions: [],
  financialGoals: [],
  addictions: [],
  workouts: [],
  workoutLogs: [],
  books: [],
  notes: [],
  moods: [],
  repertoire: [],
  sleep: [],
  focusSessions: [],
}

function loadStore(): AprumoStore {
  if (typeof window === 'undefined') return initialData
  try {
    // Estado local de uma versão anterior (ex.: seed de demonstração) é descartado.
    if (localStorage.getItem(VERSION_KEY) !== STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.setItem(VERSION_KEY, STORAGE_VERSION)
      return initialData
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialData
    const parsed = JSON.parse(raw) as Partial<AprumoStore>
    const base = { ...initialData, ...parsed, metrics: parsed.metrics ?? initialData.metrics } as AprumoStore
    // Caches antigos guardam a ficha no formato velho, com `completed` dentro da série.
    return { ...base, workouts: (base.workouts ?? []).map((plan) => ({ ...plan, exercises: parsePlanExercises(plan.exercises) })), workoutLogs: base.workoutLogs ?? [] }
  } catch {
    return initialData
  }
}

function saveStore(data: AprumoStore) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

async function loadProfile(): Promise<{ userName?: string; purpose?: string } | null> {
  if (!BACKEND_ENABLED) return null
  const response = await fetch('/api/profile', { cache: 'no-store' })
  if (!response.ok) return null
  const data = await response.json() as { profile?: { display_name?: string | null; purpose?: string | null } }
  return { userName: data.profile?.display_name ?? undefined, purpose: data.profile?.purpose ?? undefined }
}

function saveProfile(payload: { displayName?: string; purpose?: string }) {
  if (!BACKEND_ENABLED) return
  void fetch('/api/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => undefined)
}

async function loadCoreDomains(): Promise<Pick<AprumoStore, 'goals' | 'tasks' | 'taskEvents' | 'metrics'> | null> {
  if (!BACKEND_ENABLED) return null
  const response = await fetch('/api/core', { cache: 'no-store' })
  if (!response.ok) return null
  return response.json() as Promise<Pick<AprumoStore, 'goals' | 'tasks' | 'taskEvents' | 'metrics'>>
}

async function syncCore(action: string, payload: { task?: Task; goal?: Goal; id?: string; eventDate?: string }) {
  if (!BACKEND_ENABLED) return
  await fetch('/api/core', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...payload }) })
}

type DomainState = Pick<AprumoStore, 'moods'|'books'|'notes'|'transactions'|'financialGoals'|'addictions'|'workouts'|'workoutLogs'|'repertoire'|'sleep'|'focusSessions'>
async function loadDomains(): Promise<DomainState | null> {
  if (!BACKEND_ENABLED) return null
  const response = await fetch('/api/domains', { cache: 'no-store' })
  return response.ok ? response.json() as Promise<DomainState> : null
}
async function syncDomain(action:string,payload:Record<string,unknown>){if(!BACKEND_ENABLED)return;await fetch('/api/domains',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...payload})})}

export function useAprumoStore() {
  const [store, setStore] = useState<AprumoStore>(initialData)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let active = true
    queueMicrotask(async () => {
      const local = loadStore()
      let next = local
      try {
        const core = await loadCoreDomains()
        if (core) next = { ...next, goals: core.goals, tasks: core.tasks, taskEvents: core.taskEvents ?? [], metrics: core.metrics }
        const domains = await loadDomains()
        if (domains) next = { ...next, ...domains }
        const profile = await loadProfile()
        if (profile) next = { ...next, userName: profile.userName ?? next.userName, purpose: profile.purpose ?? next.purpose }
      } catch { /* Offline-first: local state remains available. */ }
      if (active) { setStore(next); saveStore(next); setHydrated(true) }
    })
    return () => { active = false }
  }, [])

  const update = useCallback((updater: (prev: AprumoStore) => AprumoStore) => {
    setStore((prev) => {
      const next = updater(prev)
      saveStore(next)
      return next
    })
  }, [])

  const addTask = useCallback((task: Task) => { update((s) => ({ ...s, tasks: [...s.tasks, task] })); void syncCore('addTask', { task }).catch(() => undefined) }, [update])
  const updateTask = useCallback((task: Task, eventDate?: string) => { update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })); void syncCore('updateTask', { task, eventDate }).catch(() => undefined) }, [update])
  const deleteTask = useCallback((id: string) => { update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })); void syncCore('deleteTask', { id }).catch(() => undefined) }, [update])

  /**
   * Marca (ou desmarca) a conclusão de uma tarefa num dia específico.
   * O evento é a verdade — `Task.completed` é só o espelho do dia de hoje,
   * mantido para quem ainda lê esse campo.
   */
  const setTaskDone = useCallback((task: Task, date: string, done: boolean) => {
    const completedAt = done ? new Date().toISOString() : undefined
    const event: TaskEvent = { taskId: task.id, date, status: done ? 'completed' : 'pending', completedAt }
    update((s) => {
      const rest = s.taskEvents.filter((item) => !(item.taskId === task.id && item.date === date))
      const isToday = date === isoDate(new Date())
      return {
        ...s,
        taskEvents: [...rest, event],
        tasks: isToday ? s.tasks.map((t) => (t.id === task.id ? { ...t, completed: done, completedAt } : t)) : s.tasks,
      }
    })
    void syncCore('updateTask', { task: { ...task, completed: done, completedAt }, eventDate: date }).catch(() => undefined)
  }, [update])

  /**
   * "Não consegui hoje": adia para o dia seguinte ao que está sendo visto, sem
   * tratar como fracasso. Usa `eventDate` — não a data de agora — para não
   * discordar do servidor quando o usuário olha um dia que não é hoje.
   */
  const carryTask = useCallback((task: Task, eventDate?: string) => {
    const from = eventDate ?? isoDate(new Date())
    const to = nextDay(from)
    const next: Task = { ...task, category: 'repasse', scheduledDate: to, completed: false }
    update((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === task.id ? next : t)),
      taskEvents: [...s.taskEvents.filter((item) => !(item.taskId === task.id && item.date === from)), { taskId: task.id, date: from, status: 'carried' as const }],
    }))
    void syncCore('carryTask', { task, eventDate: from }).catch(() => undefined)
  }, [update])

  const addGoal = useCallback((goal: Goal) => { update((s) => ({ ...s, goals: [...s.goals, goal] })); void syncCore('addGoal', { goal }).catch(() => undefined) }, [update])
  const updateGoal = useCallback((goal: Goal) => { update((s) => ({ ...s, goals: s.goals.map((g) => (g.id === goal.id ? goal : g)) })); void syncCore('updateGoal', { goal }).catch(() => undefined) }, [update])
  const deleteGoal = useCallback((id: string) => { update((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })); void syncCore('deleteGoal', { id }).catch(() => undefined) }, [update])

  const addTransaction = useCallback((tx: Transaction) => {update((s) => ({ ...s, transactions: [...s.transactions, tx] }));void syncDomain('addTransaction',{transaction:tx}).catch(()=>undefined)}, [update])
  const deleteTransaction = useCallback((id: string) => {update((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));void syncDomain('deleteTransaction',{id}).catch(()=>undefined)}, [update])

  const addAddiction = useCallback((a: Addiction) => {update((s) => ({ ...s, addictions: [...s.addictions, a] }));void syncDomain('addAddiction',{addiction:a}).catch(()=>undefined)}, [update])
  const updateAddiction = useCallback((a: Addiction) => {update((s) => ({ ...s, addictions: s.addictions.map((x) => (x.id === a.id ? a : x)) }));void syncDomain('updateAddiction',{addiction:a}).catch(()=>undefined)}, [update])

  const updateWorkout = useCallback((w: WorkoutPlan) => {update((s) => ({ ...s, workouts: s.workouts.map((x) => (x.id === w.id ? w : x)) }));void syncDomain('updateWorkout',{workout:w}).catch(()=>undefined)}, [update])
  const addWorkout = useCallback((w: WorkoutPlan) => {update((s) => ({ ...s, workouts: [...s.workouts, w] }));void syncDomain('addWorkout',{workout:w}).catch(()=>undefined)}, [update])

  /** Excluir tira a ficha da lista; o histórico de treinos feitos com ela fica. */
  const deleteWorkout = useCallback((id: string) => {update((s) => ({ ...s, workouts: s.workouts.filter((x) => x.id !== id) }));void syncDomain('deleteWorkout',{id}).catch(()=>undefined)}, [update])
  const saveWorkoutLog = useCallback((log: WorkoutLog) => {update((s) => ({ ...s, workoutLogs: [log, ...(s.workoutLogs ?? []).filter((x) => x.id !== log.id)] }));void syncDomain('addWorkoutLog',{workoutLog:log}).catch(()=>undefined)}, [update])

  const addBook = useCallback((b: Book) => {update((s) => ({ ...s, books: [...s.books, b] }));void syncDomain('addBook',{book:b}).catch(()=>undefined)}, [update])
  const updateBook = useCallback((b: Book) => {update((s) => ({ ...s, books: s.books.map((x) => (x.id === b.id ? b : x)) }));void syncDomain('updateBook',{book:b}).catch(()=>undefined)}, [update])
  const deleteBook = useCallback((id: string) => {update((s) => ({ ...s, books: s.books.filter((b) => b.id !== id) }));void syncDomain('deleteBook',{id}).catch(()=>undefined)}, [update])

  const addNote = useCallback((n: Note) => {update((s) => ({ ...s, notes: [...s.notes, n] }));void syncDomain('addNote',{note:n}).catch(()=>undefined)}, [update])
  const updateNote = useCallback((n: Note) => {update((s) => ({ ...s, notes: s.notes.map((x) => (x.id === n.id ? n : x)) }));void syncDomain('updateNote',{note:n}).catch(()=>undefined)}, [update])
  const deleteNote = useCallback((id: string) => {update((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));void syncDomain('deleteNote',{id}).catch(()=>undefined)}, [update])

  const addMood = useCallback((m: MoodEntry) => update((s) => {
    const existing = s.moods.find((x) => new Date(x.date).toDateString() === new Date(m.date).toDateString())
    if (existing) return { ...s, moods: s.moods.map((x) => (x.id === existing.id ? m : x)) }
    return { ...s, moods: [...s.moods, m] }
  }), [update])
  const saveMood = useCallback((m:MoodEntry)=>{addMood(m);void syncDomain('addMood',{mood:m}).catch(()=>undefined)},[addMood])

  /** Nome e propósito só no aparelho — para quando o servidor já confirmou a gravação. */
  const applyProfile = useCallback((profile: { userName?: string; purpose?: string }) => update((s) => ({
    ...s,
    ...(profile.userName !== undefined ? { userName: profile.userName } : {}),
    ...(profile.purpose !== undefined ? { purpose: profile.purpose } : {}),
  })), [update])
  const setPurpose = useCallback((p: string) => { update((s) => ({ ...s, purpose: p })); saveProfile({ purpose: p }) }, [update])
  const setUserName = useCallback((n: string) => { update((s) => ({ ...s, userName: n })); saveProfile({ displayName: n }) }, [update])
  const addFinancialGoal = useCallback((fg: FinancialGoal) => {update((s) => ({ ...s, financialGoals: [...(s.financialGoals ?? []), fg] }));void syncDomain('addFinancialGoal',{financialGoal:fg}).catch(()=>undefined)}, [update])
  const updateFinancialGoal = useCallback((fg: FinancialGoal) => {update((s) => ({ ...s, financialGoals: (s.financialGoals ?? []).map((x) => (x.id === fg.id ? fg : x)) }));void syncDomain('updateFinancialGoal',{financialGoal:fg}).catch(()=>undefined)}, [update])

  const deleteFinancialGoal = useCallback((id: string) => {update((s) => ({ ...s, financialGoals: (s.financialGoals ?? []).filter((x) => x.id !== id) }));void syncDomain('deleteFinancialGoal',{id}).catch(()=>undefined)}, [update])

  const addRepertoire = useCallback((item: RepertoireItem) => { update((s) => ({ ...s, repertoire: [item, ...(s.repertoire ?? [])] })); void syncDomain('addRepertoire', { repertoire: item }).catch(() => undefined) }, [update])
  const deleteRepertoire = useCallback((id: string) => { update((s) => ({ ...s, repertoire: (s.repertoire ?? []).filter((r) => r.id !== id) })); void syncDomain('deleteRepertoire', { id }).catch(() => undefined) }, [update])

  const addSleep = useCallback((entry: SleepEntry) => {
    update((s) => {
      const existing = (s.sleep ?? []).find((x) => new Date(x.date).toDateString() === new Date(entry.date).toDateString())
      return existing ? { ...s, sleep: s.sleep.map((x) => (x.id === existing.id ? entry : x)) } : { ...s, sleep: [entry, ...(s.sleep ?? [])] }
    })
    void syncDomain('addSleep', { sleep: entry }).catch(() => undefined)
  }, [update])

  const saveFocusSession = useCallback((session: FocusSession) => {
    update((s) => {
      const list = s.focusSessions ?? []
      return list.some((x) => x.id === session.id)
        ? { ...s, focusSessions: list.map((x) => (x.id === session.id ? session : x)) }
        : { ...s, focusSessions: [session, ...list] }
    })
    void syncDomain('addFocusSession', { focusSession: session }).catch(() => undefined)
  }, [update])

  return {
    store,
    hydrated,
    addTask, updateTask, deleteTask, carryTask, setTaskDone,
    addGoal, updateGoal, deleteGoal,
    addTransaction, deleteTransaction,
    addAddiction, updateAddiction,
    updateWorkout, addWorkout, deleteWorkout, saveWorkoutLog,
    addBook, updateBook, deleteBook,
    addNote, updateNote, deleteNote,
    addMood: saveMood,
    setPurpose,
    applyProfile,
    setUserName,
    addFinancialGoal,
    updateFinancialGoal,
    deleteFinancialGoal,
    addRepertoire,
    deleteRepertoire,
    addSleep,
    saveFocusSession,
  }
}
