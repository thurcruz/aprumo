'use client'

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, CalendarClock, Check, Dumbbell, Pencil, Play, Plus, X } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import type { Task, WorkoutLog, WorkoutPlan } from '@/lib/types'
import { describeFrequency, habitRunsOn, indexEvents, isDoneOn, isoDate } from '@/lib/utils'
import { sessionProgress, sessionVolume, startSession, type ActiveWorkout } from '@/lib/workout'
import { getActiveWorkout, getActiveWorkoutServer, setActiveWorkout, subscribeActiveWorkout } from '@/lib/activeWorkout'
import PlanEditor from '@/components/workout/PlanEditor'
import WorkoutRunner from '@/components/workout/WorkoutRunner'
import HabitDialog, { type HabitDraft } from '@/components/modules/HabitDialog'

/** "47 min · 18/18 séries · 3.240 kg" — o treino feito numa linha. */
function summary(log: WorkoutLog): string {
  const minutes = log.completedAt ? Math.max(1, Math.round((Date.parse(log.completedAt) - Date.parse(log.startedAt)) / 60000)) : 0
  const { done, total } = sessionProgress(log.exercises)
  const parts = [`${minutes} min`, `${done}/${total} séries`]
  if (log.volumeKg > 0) parts.push(`${Math.round(log.volumeKg).toLocaleString('pt-BR')} kg`)
  return parts.join(' · ')
}

function TreinoContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { store, hydrated, addWorkout, updateWorkout, deleteWorkout, saveWorkoutLog, addTask, updateTask, deleteTask, setTaskDone } = useAprumoStore()
  const active = useSyncExternalStore(subscribeActiveWorkout, getActiveWorkout, getActiveWorkoutServer)
  const [editing, setEditing] = useState<WorkoutPlan | 'nova' | null>(null)
  const [scheduling, setScheduling] = useState<WorkoutPlan | null>(null)
  const [unscheduling, setUnscheduling] = useState<string | null>(null)
  const [finished, setFinished] = useState<{ log: WorkoutLog; habits: number } | null>(null)

  const today = isoDate(new Date())
  const events = useMemo(() => indexEvents(store.taskEvents), [store.taskEvents])
  const logs = store.workoutLogs ?? []
  const openGoals = useMemo(() => store.goals.filter(goal => goal.status === 'active' || goal.status === 'paused'), [store.goals])
  const editingPlan = editing && editing !== 'nova' ? editing : null
  /** O hábito que agenda a ficha, se houver: é ele que põe o treino no Hoje. */
  const habitOf = (plan: WorkoutPlan): Task | undefined => store.tasks.find(task => task.workoutPlanId === plan.id && task.category === 'fixa')

  // Vindo do Hoje ("Treinar"), a execução já abre. Espera o store carregar —
  // antes disso a ficha ainda não está na lista — e nunca troca um treino em
  // andamento por outro: o que está aberto é retomado.
  useEffect(() => {
    const planId = params.get('iniciar')
    if (!planId || !hydrated) return
    if (!getActiveWorkout()) {
      const plan = store.workouts.find(item => item.id === planId)
      if (plan) setActiveWorkout(startSession(plan, store.workoutLogs ?? [], new Date().toISOString()))
    }
    router.replace('/treino')
  }, [params, hydrated, store.workouts, store.workoutLogs, router])

  function start(plan: WorkoutPlan) {
    setFinished(null)
    setActiveWorkout(startSession(plan, logs, new Date().toISOString()))
  }

  function finish(workout: ActiveWorkout) {
    const log: WorkoutLog = {
      id: crypto.randomUUID(), planId: workout.planId, planName: workout.planName, exercises: workout.exercises,
      volumeKg: sessionVolume(workout.exercises), startedAt: workout.startedAt, completedAt: new Date().toISOString(),
    }
    saveWorkoutLog(log)
    // O hábito de treino do dia se cumpre sozinho: você acabou de provar que treinou.
    let habits = 0
    for (const task of store.tasks) {
      if (task.workoutPlanId !== workout.planId || task.category !== 'fixa') continue
      if (!habitRunsOn(task.frequency, new Date()) || isDoneOn(events, task.id, today)) continue
      setTaskDone(task, today, true)
      habits++
    }
    setActiveWorkout(null)
    setFinished({ log, habits })
  }

  function savePlan(draft: { name: string; exercises: WorkoutPlan['exercises'] }) {
    if (editingPlan) updateWorkout({ ...editingPlan, ...draft })
    else addWorkout({ id: crypto.randomUUID(), ...draft })
    setEditing(null)
  }

  function removePlan(plan: WorkoutPlan) {
    deleteWorkout(plan.id)
    // O hábito continua existindo — só deixa de abrir uma ficha que sumiu.
    for (const task of store.tasks) if (task.workoutPlanId === plan.id) updateTask({ ...task, workoutPlanId: undefined }, today)
    setEditing(null)
  }

  function saveSchedule(plan: WorkoutPlan, draft: HabitDraft) {
    const existing = habitOf(plan)
    const fields = {
      title: draft.title, dayBlock: draft.dayBlock, frequency: draft.frequency, startTime: draft.startTime,
      durationMinutes: draft.durationMinutes, goalId: draft.goalId, workoutPlanId: plan.id,
    }
    if (existing) updateTask({ ...existing, ...fields }, today)
    else addTask({ id: crypto.randomUUID(), category: 'fixa', completed: false, createdAt: new Date().toISOString(), priority: 2, source: 'manual', ...fields })
    setScheduling(null)
  }

  if (active) return <WorkoutRunner workout={active} logs={logs} onChange={setActiveWorkout} onFinish={() => finish(active)} onDiscard={() => setActiveWorkout(null)}/>

  const scheduledHabit = scheduling ? habitOf(scheduling) : undefined

  return <div className="page-wrap">
    <header className="flex items-start justify-between gap-5">
      <div>
        <Link href="/saude" className="muted mb-5 inline-flex items-center gap-2 text-sm no-underline"><ArrowLeft size={15}/> Saúde</Link>
        <p className="eyebrow">Treino</p>
        <h1 className="display mt-3 text-4xl font-semibold md:text-6xl">Força se constrói<br/>em repetições.</h1>
        <p className="muted mt-4 max-w-xl">Monte a ficha uma vez. Depois é entrar, executar e sair — a carga da última vez já vem sugerida.</p>
      </div>
      <button onClick={() => setEditing('nova')} className="energy-button mt-9 flex items-center gap-2 px-5 py-3"><Plus size={17}/><span className="hidden sm:inline">Nova ficha</span></button>
    </header>

    {finished && <div className="surface mt-8 flex items-center gap-3 p-4" style={{ borderColor: 'rgba(208,224,39,.4)' }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-energy text-[#11130f]"><Check size={18}/></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{finished.log.planName} concluído</p>
        <p className="muted text-xs">{summary(finished.log)}{finished.habits > 0 ? ' · hábito do dia marcado' : ''}</p>
      </div>
      <button onClick={() => setFinished(null)} aria-label="Dispensar" className="muted shrink-0 p-1 hover:text-white"><X size={16}/></button>
    </div>}

    {store.workouts.length === 0
      ? <div className="surface mt-10 grid min-h-56 place-items-center p-8 text-center">
          <div>
            <Dumbbell className="mx-auto text-energy"/>
            <p className="mt-4 font-semibold">Nenhuma ficha ainda</p>
            <p className="muted mx-auto mt-1 max-w-sm text-sm">Uma ficha é o treino que você repete: exercícios, séries, carga e descanso. Monte a primeira e comece hoje.</p>
            <button onClick={() => setEditing('nova')} className="energy-button mt-6 px-5 py-2.5 text-sm">Montar a primeira</button>
          </div>
        </div>
      : <div className="mt-10 grid gap-4 md:grid-cols-2">
          {store.workouts.map(plan => {
            const habit = habitOf(plan)
            const last = logs.find(log => log.planId === plan.id && log.completedAt)
            const sets = plan.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
            return <section key={plan.id} className="surface flex flex-col p-6">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-energy/10 text-energy"><Dumbbell size={20}/></span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold">{plan.name}</h2>
                  <p className="muted mt-1 text-xs">{plan.exercises.length} {plan.exercises.length === 1 ? 'exercício' : 'exercícios'} · {sets} séries</p>
                  {last?.completedAt && <p className="muted mt-1 text-xs">Último: {new Date(last.completedAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</p>}
                </div>
                <button onClick={() => setEditing(plan)} aria-label="Editar ficha" className="muted shrink-0 rounded-lg p-1.5 hover:text-white"><Pencil size={15}/></button>
              </div>
              <p className="muted mt-4 line-clamp-2 text-xs">{plan.exercises.map(exercise => exercise.name).join(' · ')}</p>

              <div className="mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: habit ? 'rgba(208,224,39,.35)' : 'var(--line)' }}>
                <CalendarClock size={14} className="shrink-0 text-energy"/>
                <button onClick={() => { setUnscheduling(null); setScheduling(plan) }} className="min-w-0 flex-1 truncate text-left" style={{ color: habit ? 'var(--ink)' : 'var(--muted)' }}>
                  {habit ? `No seu dia: ${describeFrequency(habit.frequency)}${habit.startTime ? ` às ${habit.startTime}` : ''}` : 'Agendar como hábito'}
                </button>
                {habit && (unscheduling === habit.id
                  ? <button onClick={() => { deleteTask(habit.id); setUnscheduling(null) }} className="shrink-0 font-semibold" style={{ color: 'var(--danger)' }}>Tirar da agenda?</button>
                  : <button onClick={() => setUnscheduling(habit.id)} aria-label="Tirar da agenda" className="muted shrink-0 p-0.5 hover:text-white"><X size={13}/></button>)}
              </div>

              <button onClick={() => start(plan)} className="energy-button mt-4 flex items-center justify-center gap-2 py-3 text-sm"><Play size={15} fill="currentColor"/> Iniciar treino</button>
            </section>
          })}
        </div>}

    {logs.length > 0 && <section className="mt-10">
      <h2 className="mb-4 text-xl font-semibold">Treinos feitos</h2>
      <div className="space-y-2">
        {logs.slice(0, 8).map(log => <div key={log.id} className="surface flex items-center gap-4 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-energy/10 text-energy"><Dumbbell size={15}/></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{log.planName}</p>
            <p className="muted text-xs">{summary(log)}</p>
          </div>
          <span className="muted shrink-0 text-xs">{new Date(log.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
        </div>)}
      </div>
    </section>}

    <AnimatePresence>
      {editing && <PlanEditor key={editingPlan?.id ?? 'nova'} initial={editingPlan ?? undefined}
        onCancel={() => setEditing(null)} onSave={savePlan}
        onDelete={editingPlan ? () => removePlan(editingPlan) : undefined}/>}
      {scheduling && <HabitDialog key={`agenda-${scheduling.id}`}
        heading={scheduledHabit ? 'Agenda do treino' : 'Agendar treino'}
        description="Vira um hábito no seu dia, com um botão que abre a ficha. Ao finalizar o treino, o hábito se marca sozinho."
        confirmLabel="Salvar agenda"
        goals={openGoals}
        initial={scheduledHabit
          ? { title: scheduledHabit.title, dayBlock: scheduledHabit.dayBlock ?? 'livre', frequency: scheduledHabit.frequency, startTime: scheduledHabit.startTime, durationMinutes: scheduledHabit.durationMinutes, goalId: scheduledHabit.goalId }
          : { title: scheduling.name, dayBlock: 'manha', frequency: { days: [1, 3, 5], startsOn: today } }}
        onCancel={() => setScheduling(null)}
        onSave={draft => saveSchedule(scheduling, draft)}/>}
    </AnimatePresence>
  </div>
}

export default function TreinoPage() {
  return <Suspense fallback={null}><TreinoContent/></Suspense>
}
