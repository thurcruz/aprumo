'use client'

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, Circle, Clock3, Dumbbell, GripVertical, PencilLine, Pin, Plus, Star, Target, Timer, Trash2, X } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import { dayBlocks, type DayBlock, type Task, type Weekday } from '@/lib/types'
import { capitalizeFirst, endTimeOf, indexEvents, isDoneOn, isoDate as iso, parseDate as parse, taskShowsOn, weekStart } from '@/lib/utils'
import PageHeader from '@/components/ui/PageHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import AgendaView from '@/components/today/AgendaView'
import GoalsView from '@/components/today/GoalsView'
import HabitsView from '@/components/today/HabitsView'
import HabitDialog, { type HabitDraft } from '@/components/modules/HabitDialog'
import TimeDialog from '@/components/modules/TimeDialog'
import Skeleton from '@/components/ui/Skeleton'
import { currentDiagnosisPlan } from '@/lib/diagnosis'
import { focusHref, focusMinutesByTask } from '@/lib/focus'

const moods = ['😞','😕','😐','🙂','🔥'] as const
/**
 * Hoje é o único lugar do "o que eu faço": o dia, a agenda, a rotina e as metas
 * são visões da mesma tela (?visao=), não quatro páginas para descobrir.
 */
const views = [
  { value: 'dia', label: 'Dia' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'habitos', label: 'Hábitos' },
  { value: 'metas', label: 'Metas' },
] as const
type View = (typeof views)[number]['value']
const isView = (value: string | null): value is View => views.some(item => item.value === value)

/** O período em que a pessoa está agora: é onde a tarefa nova cai. */
function currentBlock(): DayBlock {
  const hour = new Date().getHours()
  return hour < 12 ? 'manha' : hour < 18 ? 'tarde' : 'noite'
}

// useSearchParams() exige um limite de Suspense para a página poder ser pré-renderizada.
export default function HojePage() {
  return <Suspense fallback={null}><Hoje/></Suspense>
}

function Hoje() {
  const params = useSearchParams()
  const router = useRouter()
  const requested = params.get('visao')
  const view: View = isView(requested) ? requested : 'dia'
  const tabs = <SegmentedControl className="mb-5" label="Visão" value={view} stretch options={[...views]}
    onChange={next => router.replace(next === 'dia' ? '/hoje' : `/hoje?visao=${next}`, { scroll: false })}/>

  if (view === 'dia') return <DayView tabs={tabs}/>
  return <div className="page-wrap">
    <PageHeader title="Hoje"/>
    {tabs}
    {view === 'agenda' ? <AgendaView key={params.get('dia') ?? ''} initialDay={params.get('dia') ?? undefined}/> : view === 'habitos' ? <HabitsView/> : <GoalsView/>}
  </div>
}

function DayView({ tabs }: { tabs: ReactNode }) {
  const { store, hydrated, addTask, updateTask, deleteTask, carryTask, setTaskDone, addMood } = useAprumoStore()
  const today = iso(new Date())
  const [selected, setSelected] = useState(today)
  const [draft, setDraft] = useState('')
  const [openMenu, setOpenMenu] = useState<string|null>(null)
  const [linking, setLinking] = useState<string|null>(null)
  const [renaming, setRenaming] = useState<string|null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null)
  const [minimalDay, setMinimalDay] = useState(false)
  /** Tarefa que está sendo transformada em hábito pelo modal de configuração. */
  const [becomingHabit, setBecomingHabit] = useState<Task|null>(null)
  /** Tarefa com o modal de horário aberto. */
  const [schedulingTime, setSchedulingTime] = useState<Task|null>(null)

  const isToday = selected === today
  const selectedDate = parse(selected)

  const week = useMemo(() => {
    const start = weekStart(parse(selected))
    return Array.from({ length: 7 }, (_, index) => { const d = new Date(start); d.setDate(start.getDate() + index); return d })
  }, [selected])

  const events = useMemo(() => indexEvents(store.taskEvents), [store.taskEvents])
  const openGoals = useMemo(() => store.goals.filter(goal => goal.status === 'active' || goal.status === 'paused'), [store.goals])
  const tasksOn = useMemo(() => (day: string) => store.tasks.filter(task => taskShowsOn(task, day, events)), [store.tasks, events])
  /** Conclusão é sempre relativa ao dia aberto, nunca ao booleano global da tarefa. */
  const doneOn = (task: Task, day: string) => isDoneOn(events, task.id, day)

  const visible = useMemo(() => tasksOn(selected), [tasksOn, selected])

  const grouped = useMemo(() => {
    const map: Record<DayBlock, Task[]> = { manha: [], tarde: [], noite: [], livre: [] }
    for (const task of visible) map[task.dayBlock ?? 'livre'].push(task)
    return map
  }, [visible])

  const done = visible.filter(task => doneOn(task, selected)).length
  const essentials = visible.filter(task => task.priority === 1 && !doneOn(task, selected))
  const focusMinutes = (store.focusSessions ?? [])
    .filter(s => s.status === 'completed' && s.startedAt.slice(0, 10) === selected)
    .reduce((sum, s) => sum + s.actualSeconds / 60, 0)
  const focusByTask = useMemo(() => focusMinutesByTask(store.focusSessions ?? [], selected), [store.focusSessions, selected])
  const moodEntry = store.moods.find(entry => iso(new Date(entry.date)) === selected)
  const selectedMood = moodEntry?.mood

  // O que importa hoje: a próxima ação do plano do diagnóstico, não um painel de números.
  const plan = useMemo(() => currentDiagnosisPlan(store.tasks, store.taskEvents, today), [store.tasks, store.taskEvents, today])
  const planGoal = plan ? store.goals.find(goal => plan.tasks.some(task => task.goalId === goal.id)) : undefined
  const planToday = plan?.today ?? []
  const planDoneToday = planToday.filter(task => doneOn(task, today)).length
  const nextAction = planToday.find(task => !doneOn(task, today))

  /**
   * Um campo só para adicionar. Hoje, a tarefa entra no período em que a pessoa
   * está; em outro dia, fica sem horário. Dá para arrastar depois.
   */
  function create() {
    const title = draft.trim()
    if (title.length < 2) return
    addTask({ id: crypto.randomUUID(), title, category: 'hoje', completed: false, createdAt: new Date().toISOString(), dayBlock: isToday ? currentBlock() : 'livre', priority: 2, source: 'manual', scheduledDate: selected })
    setDraft('')
  }

  const toggle = (task: Task) => setTaskDone(task, selected, !doneOn(task, selected))
  const moveTo = (task: Task, block: DayBlock) => { setOpenMenu(null); if ((task.dayBlock ?? 'livre') !== block) updateTask({ ...task, dayBlock: block }, selected) }
  const toggleEssential = (task: Task) => updateTask({ ...task, priority: task.priority === 1 ? 2 : 1 }, selected)
  /**
   * Fixa = hábito recorrente (sem data), o que alimenta a taxa de constância.
   * Virar hábito abre a configuração de recorrência; desfazer é imediato.
   */
  const toggleFixed = (task: Task) => {
    if (task.category !== 'fixa') { setBecomingHabit(task); return }
    updateTask({ ...task, category: 'hoje', scheduledDate: selected, frequency: undefined }, selected)
  }

  /** O hábito nasce já valendo para o dia da semana que estava aberto. */
  const saveHabit = (task: Task, draft: HabitDraft) => {
    setBecomingHabit(null)
    updateTask({ ...task, title: draft.title, category: 'fixa', scheduledDate: undefined, dayBlock: draft.dayBlock, frequency: draft.frequency, startTime: draft.startTime, durationMinutes: draft.durationMinutes, goalId: draft.goalId }, selected)
  }
  const rename = (task: Task, value: string) => {
    const title = value.trim()
    setRenaming(null)
    if (title.length >= 2 && title !== task.title) updateTask({ ...task, title }, selected)
  }
  const closeMenu = () => { setOpenMenu(null); setConfirmDelete(null); setLinking(null) }
  /** Liga (ou desliga) a tarefa a uma meta — é o que conecta o dia à direção. */
  const linkGoal = (task: Task, goalId?: string) => { closeMenu(); if (task.goalId !== goalId) updateTask({ ...task, goalId }, selected) }

  // --- Arrastar com suporte a mouse e toque -----------------------------
  // Pointer Events unificam os dois. No toque, arrastar e rolar a página são
  // o mesmo gesto, então o arrasto só começa após pressionar e segurar.
  type Drag = { taskId: string; x: number; y: number; over: DayBlock | null }
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const pending = useRef<{ taskId: string; x: number; y: number } | null>(null)
  const blockEls = useRef(new Map<DayBlock, HTMLElement>())
  const isDragging = drag !== null

  const applyDrag = (next: Drag | null) => { dragRef.current = next; setDrag(next) }
  const hitTest = (x: number, y: number): DayBlock | null => {
    for (const [block, element] of blockEls.current) {
      const rect = element.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return block
    }
    return null
  }
  const beginDrag = (taskId: string, x: number, y: number) => applyDrag({ taskId, x, y, over: hitTest(x, y) })

  /**
   * Arrasto a partir do corpo da linha: só no mouse.
   * No toque o corpo precisa continuar rolando a página, e não é possível
   * "desfazer" a rolagem depois que o navegador assume o gesto — por isso o
   * toque arrasta pela alça, que tem touch-action: none.
   */
  const startPress = (event: React.PointerEvent, taskId: string) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    pending.current = { taskId, x: event.clientX, y: event.clientY }
  }

  /** Alça: arrasta imediatamente, em qualquer tipo de ponteiro. */
  const startHandle = (event: React.PointerEvent, taskId: string) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.stopPropagation()
    beginDrag(taskId, event.clientX, event.clientY)
  }

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const start = pending.current
      if (!dragRef.current && start) {
        const dx = Math.abs(event.clientX - start.x), dy = Math.abs(event.clientY - start.y)
        if (dx > 6 || dy > 6) beginDrag(start.taskId, event.clientX, event.clientY)
      }
      const current = dragRef.current
      if (current) applyDrag({ ...current, x: event.clientX, y: event.clientY, over: hitTest(event.clientX, event.clientY) })
    }
    const finish = () => {
      pending.current = null
      const current = dragRef.current
      if (current?.over) {
        const task = store.tasks.find(item => item.id === current.taskId)
        if (task && (task.dayBlock ?? 'livre') !== current.over) moveTo(task, current.over)
      }
      applyDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  })

  // Enquanto arrasta no toque, impede que a página role junto.
  useEffect(() => {
    if (!isDragging) return
    const stop = (event: TouchEvent) => event.preventDefault()
    document.addEventListener('touchmove', stop, { passive: false })
    return () => document.removeEventListener('touchmove', stop)
  }, [isDragging])

  return <div className="page-wrap" onClick={closeMenu}>
    <PageHeader
      eyebrow={capitalizeFirst(new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate))}
      title={isToday ? 'Hoje' : selectedDate < parse(today) ? 'Dia que passou' : 'Dia que vem'}
      description={visible.length === 0
        ? 'Conte o que precisa acontecer. A organização vem depois.'
        : `${done} de ${visible.length} concluídas${focusMinutes > 0 ? ` · ${Math.round(focusMinutes)} min focados` : ''}.`}
      actions={<Link href="/foco" aria-label="Sessão de foco" className="grid h-10 w-10 place-items-center rounded-full border border-line text-fg-1 no-underline"><Timer size={18}/></Link>}/>
    {tabs}

    {isToday && hydrated && <section className="surface mb-5 p-5">
      {!plan ? <>
        <p className="eyebrow">Seu plano</p>
        <h2 className="mt-2 text-xl font-semibold">Onde você quer chegar?</h2>
        <p className="muted mt-1 text-sm">Uma conversa curta com a Pri vira um plano pequeno para as próximas semanas.</p>
        <Link href="/onboarding" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-energy no-underline">Fazer meu diagnóstico <ArrowRight size={15}/></Link>
      </> : plan.status === 'finished' ? <>
        <p className="eyebrow">Seu plano · ciclo concluído</p>
        <h2 className="mt-2 text-xl font-semibold">{planGoal?.title ?? 'Seu plano'}</h2>
        <p className="muted mt-1 text-sm">{plan.done} de {plan.due} ações feitas no ciclo. Hora de revisar o que funcionou e ajustar o próximo passo.</p>
        <div className="mt-4 flex flex-wrap gap-5">
          <Link href="/pri" className="inline-flex items-center gap-2 text-sm font-semibold text-energy no-underline">Revisar com a Pri <ArrowRight size={15}/></Link>
          <Link href="/onboarding" className="muted text-sm no-underline hover:text-white">Novo diagnóstico</Link>
        </div>
      </> : <>
        <div className="flex items-baseline justify-between gap-3">
          <p className="eyebrow">Seu plano · {plan.status === 'upcoming' ? `começa em ${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(parse(plan.startsOn))}` : `semana ${plan.week} de ${plan.totalWeeks}`}</p>
          <Link href="/pri" className="shrink-0 text-xs text-energy no-underline">Ajustar com a Pri</Link>
        </div>
        <h2 className="mt-2 text-xl font-semibold">{planGoal?.title ?? 'Seu plano'}</h2>
        {nextAction
          ? <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/[.07] bg-white/[.025] p-3">
              <div className="min-w-0 flex-1">
                <p className="muted text-xs">Próxima ação de hoje</p>
                <p className="truncate text-sm font-semibold">{nextAction.title}</p>
              </div>
              <Link href={focusHref(nextAction.id)} className="flex shrink-0 items-center gap-1 rounded-full bg-energy/10 px-3 py-1.5 text-xs font-semibold text-energy no-underline"><Timer size={13}/> Focar</Link>
              <button onClick={() => toggle(nextAction)} className="flex shrink-0 items-center gap-1 rounded-full bg-energy px-3 py-1.5 text-xs font-semibold text-[#11130f]"><Check size={13}/> Feito</button>
            </div>
          : <p className="muted mt-3 text-sm">{planToday.length > 0 ? 'Tudo do plano feito hoje. Amanhã tem mais.' : 'Hoje é dia de descanso no plano.'}</p>}
        {plan.status === 'running' && <p className="muted mt-3 text-xs">{planDoneToday} de {planToday.length} de hoje · {plan.done} de {plan.due} no ciclo até agora</p>}
      </>}
    </section>}

    <section className="mb-5 flex items-center gap-2">
      <div className="flex flex-1 gap-1.5 overflow-x-auto">
        {week.map(day => {
          const value = iso(day)
          const active = value === selected
          const dayTasks = tasksOn(value)
          const dayDone = dayTasks.filter(task => doneOn(task, value)).length
          const ratio = dayTasks.length ? dayDone / dayTasks.length : 0
          return <button key={value} onClick={() => setSelected(value)}
            className="flex min-w-11 flex-1 flex-col items-center gap-1 rounded-2xl border px-1 py-2 transition"
            style={{ borderColor: active ? 'var(--energy)' : 'var(--line)', background: active ? 'var(--energy)' : 'transparent', color: active ? '#11130f' : value === today ? 'var(--ink)' : 'var(--muted)' }}>
            <small className="text-[9px] font-bold uppercase">{new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow' }).format(day)}</small>
            <strong className="text-sm">{day.getDate()}</strong>
            {/* Altura fixa mantém os botões alinhados mesmo sem nenhum ponto.
                Hoje = ponto neutro; progresso = ponto na cor de marca. */}
            <span className="flex h-1 items-center gap-1">
              {value === today && <span className="h-1 w-1 rounded-full" style={{ background: active ? '#11130f' : 'var(--ink)' }}/>}
              {ratio > 0 && <span className="h-1 w-1 rounded-full" style={{ background: ratio === 1 ? (active ? '#11130f' : 'var(--energy)') : (active ? 'rgba(17,19,15,.4)' : 'rgba(208,224,39,.4)') }}/>}
            </span>
          </button>
        })}
      </div>
      <Link href={`/hoje?visao=agenda&dia=${selected}`} aria-label="Abrir agenda" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border no-underline" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}><CalendarDays size={18}/></Link>
    </section>

    <form onSubmit={event => { event.preventDefault(); create() }} className="mb-4 flex items-center gap-2">
      <input value={draft} onChange={event => setDraft(event.target.value)} maxLength={160} aria-label="Nova tarefa"
        placeholder={isToday ? 'O que precisa acontecer hoje?' : 'O que precisa acontecer nesse dia?'} className="field py-3 text-sm"/>
      <button type="submit" disabled={draft.trim().length < 2} aria-label="Adicionar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-energy text-[#11130f] transition-opacity disabled:opacity-40"><Plus size={18}/></button>
    </form>

    {/* grid-cols-1 (minmax(0,1fr)): sem ele, um título longo alarga a coluna além da tela no celular. */}
    {!hydrated
      ? <div className="grid grid-cols-1 gap-2">{[0, 1, 2].map(index => <Skeleton key={index} className="h-12"/>)}</div>
      : visible.length === 0
        ? <p className="muted rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm">{isToday ? 'Nada para hoje ainda. Escreva acima a primeira coisa que importa.' : 'Nada marcado nesse dia.'}</p>
        : null}
    <div className="grid grid-cols-1 gap-3">
      {hydrated && dayBlocks.filter(block => grouped[block.id].length > 0 || isDragging).map(block => {
        const tasks = grouped[block.id]
        const isTarget = drag?.over === block.id
        return <section key={block.id}
          ref={element => { if (element) blockEls.current.set(block.id, element); else blockEls.current.delete(block.id) }}
          className="surface p-4 transition"
          style={{ borderColor: isTarget ? 'var(--energy)' : undefined, background: isTarget ? 'rgba(208,224,39,.04)' : undefined }}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">{block.label}</h2>
            <span className="muted text-xs">{tasks.filter(task => doneOn(task, selected)).length}/{tasks.length}</span>
          </div>

          <div className="space-y-2">
            {tasks.length === 0 && <p className="muted rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs">Solte aqui</p>}
            {tasks.map(task => {
              const completed = doneOn(task, selected)
              const dimmed = minimalDay && task.priority !== 1 && !completed
              const essential = task.priority === 1
              const fixed = task.category === 'fixa'
              const editing = renaming === task.id
              const beingDragged = drag?.taskId === task.id
              const goal = task.goalId ? store.goals.find(item => item.id === task.goalId) : undefined
              const workoutPlan = task.workoutPlanId ? store.workouts.find(item => item.id === task.workoutPlanId) : undefined
              return <div key={task.id}
                onPointerDown={event => { if (!editing) startPress(event, task.id) }}
                className="relative flex select-none items-center gap-2 rounded-2xl border border-white/[.07] bg-white/[.025] p-2.5 transition"
                style={{ opacity: beingDragged ? .4 : dimmed ? .35 : 1, borderColor: essential && !completed ? 'rgba(208,224,39,.4)' : undefined }}>
                <span
                  onPointerDown={event => { if (!editing) startHandle(event, task.id) }}
                  role="button" tabIndex={-1} aria-label="Arrastar tarefa"
                  className="muted -ml-1 shrink-0 cursor-grab p-1 active:cursor-grabbing"
                  style={{ touchAction: 'none' }}><GripVertical size={15}/></span>
                <button onPointerDown={event => event.stopPropagation()} onClick={() => toggle(task)} aria-label={completed ? 'Desmarcar' : 'Concluir'} className="grid h-6 w-6 shrink-0 place-items-center rounded-full border" style={{ background: completed ? 'var(--energy)' : 'transparent', borderColor: completed ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .18)', color: '#11130f' }}>{completed && <Check size={14}/>}</button>

                {editing
                  ? <input autoFocus defaultValue={task.title} maxLength={160}
                      onClick={event => event.stopPropagation()}
                      onKeyDown={event => { if (event.key === 'Enter') rename(task, event.currentTarget.value); if (event.key === 'Escape') setRenaming(null) }}
                      onBlur={event => rename(task, event.target.value)}
                      className="field min-w-0 flex-1 py-1 text-sm"/>
                  : <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      {/* Os símbolos são indicadores: só aparecem quando o estado está ativo. */}
                      {task.category === 'repasse' && <ArrowLeft size={13} className="shrink-0 text-energy" aria-label="Veio de outro dia"/>}
                      {fixed && <Pin size={12} className="shrink-0 text-energy" fill="currentColor" aria-label="Hábito"/>}
                      {essential && <Star size={12} className="shrink-0 text-energy" fill="currentColor" aria-label="Essencial"/>}
                      {goal && <Target size={12} className="shrink-0 text-energy" aria-label={`Meta: ${goal.title}`}/>}
                      <p className={`truncate text-sm ${completed ? 'text-white/35 line-through' : 'text-white'}`}>{task.title}</p>
                      {task.startTime && <span className="muted flex shrink-0 items-center gap-1 text-[11px]"><Clock3 size={10}/>{task.startTime}{endTimeOf(task) && `–${endTimeOf(task)}`}</span>}
                      {(focusByTask.get(task.id) ?? 0) >= 1 && <span className="muted flex shrink-0 items-center gap-1 text-[11px]" aria-label="Minutos focados neste dia"><Timer size={10}/>{Math.round(focusByTask.get(task.id)!)} min</span>}
                    </div>}

                {/* Hábito de treino: abre a ficha direto na execução. */}
                {workoutPlan && <Link href={`/treino?iniciar=${workoutPlan.id}`} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} aria-label={`Treinar ${workoutPlan.name}`} className="flex shrink-0 items-center gap-1 rounded-full bg-energy/10 px-2.5 py-1 text-[11px] font-semibold text-energy no-underline"><Dumbbell size={12}/> Treinar</Link>}
                <button onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); setConfirmDelete(null); setOpenMenu(openMenu === task.id ? null : task.id) }} aria-label="Mais opções" className="muted shrink-0 rounded-lg p-1 hover:text-white"><ChevronDown size={14}/></button>

                {openMenu === task.id && <div onClick={event => event.stopPropagation()} className="glass absolute right-2 top-11 z-30 w-60 rounded-2xl p-2 text-sm">
                  {linking === task.id ? <>
                    <button onClick={() => setLinking(null)} className="muted flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider hover:text-white"><ChevronLeft size={12}/> Ligar a uma meta</button>
                    {store.goals.length === 0
                      ? <p className="muted px-2 py-2 text-xs">Você ainda não tem metas. <Link href="/hoje?visao=metas" className="text-energy no-underline">Criar a primeira</Link>.</p>
                      : <div className="max-h-52 overflow-y-auto">
                          {store.goals.map(item => <button key={item.id} onClick={() => linkGoal(task, item.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5">
                            <Target size={14} className="shrink-0" style={{ color: task.goalId === item.id ? 'var(--accent)' : undefined }}/>
                            <span className="truncate">{item.title}</span>
                          </button>)}
                        </div>}
                    {task.goalId && <>
                      <div className="my-1 border-t border-white/10"/>
                      <button onClick={() => linkGoal(task, undefined)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"><X size={14}/> Desligar da meta</button>
                    </>}
                  </> : <>
                    <Link href={focusHref(task.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-white no-underline hover:bg-white/5"><Timer size={14}/> Focar nisto</Link>
                    <button onClick={() => { toggleFixed(task); closeMenu() }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"><Pin size={14} style={{ color: fixed ? 'var(--accent)' : undefined }}/> {fixed ? 'Deixar de ser hábito' : 'Fixar como hábito'}</button>
                    <button onClick={() => { toggleEssential(task); closeMenu() }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"><Star size={14} style={{ color: essential ? 'var(--accent)' : undefined }}/> {essential ? 'Remover de essencial' : 'Marcar como essencial'}</button>
                    <button onClick={() => { closeMenu(); setSchedulingTime(task) }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"><Clock3 size={14} style={{ color: task.startTime ? 'var(--accent)' : undefined }}/> {task.startTime ? `${task.startTime}${endTimeOf(task) ? `–${endTimeOf(task)}` : ''}` : 'Definir horário'}</button>
                    <button onClick={() => { setConfirmDelete(null); setLinking(task.id) }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"><Target size={14} style={{ color: goal ? 'var(--accent)' : undefined }}/> <span className="truncate">{goal ? goal.title : 'Ligar a uma meta'}</span></button>
                    <button onClick={() => { carryTask(task, selected); closeMenu() }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"><ArrowRight size={14}/> Não consegui hoje</button>
                    <div className="my-1 border-t border-white/10"/>
                    <button onClick={() => { setRenaming(task.id); closeMenu() }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"><PencilLine size={14}/> Renomear</button>
                    <button onClick={() => { if (confirmDelete === task.id) { deleteTask(task.id); closeMenu() } else setConfirmDelete(task.id) }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5" style={{ color: confirmDelete === task.id ? 'var(--danger)' : undefined }}><Trash2 size={14}/> {confirmDelete === task.id ? 'Confirmar exclusão' : 'Excluir'}</button>
                  </>}
                </div>}
              </div>
            })}
          </div>

        </section>
      })}
    </div>

    {hydrated && visible.length > 0 && <button onClick={() => setMinimalDay(v => !v)} className="mt-3 flex w-full items-center gap-2 rounded-2xl px-1 py-2 text-left text-xs" style={{ color: minimalDay ? 'var(--accent)' : 'var(--muted)' }}>
      <Circle size={13} fill={minimalDay ? 'currentColor' : 'none'}/>
      {minimalDay
        ? essentials.length > 0 ? `Dia mínimo: só ${essentials.length === 1 ? 'a ação essencial' : `as ${essentials.length} ações essenciais`}. Toque para voltar ao normal.` : 'Dia mínimo: marque de 1 a 3 ações como essenciais na estrela.'
        : 'Hoje está difícil? Ative o dia mínimo e preserve só o essencial.'}
    </button>}

    <section className="surface mt-5 p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Como você está{isToday ? ' hoje' : ' nesse dia'}?</p>
        {selectedMood && <span className="muted text-xs">Registrado</span>}
      </div>
      <div className="mt-4 flex justify-between">
        {moods.map((mood, index) => {
          const level = (index + 1) as 1|2|3|4|5
          const active = selectedMood === level
          return <button key={mood} onClick={() => addMood({ id: crypto.randomUUID(), date: parse(selected).toISOString(), mood: level, note: moodEntry?.note })}
            aria-label={`Humor ${level} de 5`} aria-pressed={active}
            className="grid h-11 w-11 place-items-center rounded-full border text-xl transition hover:-translate-y-1"
            style={{ borderColor: active ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .1)', background: active ? 'rgba(208,224,39,.12)' : 'rgb(var(--fg-rgb) / .03)', transform: active ? 'scale(1.1)' : undefined }}>{mood}</button>
        })}
      </div>
      {moodEntry && <input key={moodEntry.id} defaultValue={moodEntry.note ?? ''} maxLength={280} aria-label="O que pode ter influenciado?"
        onBlur={event => { const note = event.target.value.trim(); if (note !== (moodEntry.note ?? '')) addMood({ ...moodEntry, note }) }}
        onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
        placeholder="O que pode ter influenciado? (opcional)" className="field mt-5 py-2 text-sm"/>}
      {store.moods.length > 1 && <Link href="/emocional" className="mt-4 inline-block text-xs text-energy no-underline">Ver registros</Link>}
    </section>

    {drag && <div className="glass pointer-events-none fixed z-[60] max-w-56 truncate rounded-2xl px-3 py-2 text-sm font-semibold" style={{ left: drag.x + 14, top: drag.y - 18 }}>
      {store.tasks.find(item => item.id === drag.taskId)?.title}
    </div>}

    <AnimatePresence>
      {becomingHabit && <HabitDialog
        key={becomingHabit.id}
        heading="Fixar como hábito"
        description="Isto deixa de valer só para hoje e passa a se repetir. Já preenchemos com o período e o dia em que você está."
        confirmLabel="Transformar em hábito"
        goals={openGoals}
        initial={{
          goalId: becomingHabit.goalId,
          title: becomingHabit.title,
          dayBlock: becomingHabit.dayBlock ?? 'livre',
          frequency: { days: [selectedDate.getDay() as Weekday], startsOn: selected },
          startTime: becomingHabit.startTime,
          durationMinutes: becomingHabit.durationMinutes,
        }}
        onCancel={() => setBecomingHabit(null)}
        onSave={draft => saveHabit(becomingHabit, draft)}
      />}
      {schedulingTime && <TimeDialog
        key={`hora-${schedulingTime.id}`}
        task={schedulingTime}
        onCancel={() => setSchedulingTime(null)}
        onSave={(startTime, durationMinutes) => {
          setSchedulingTime(null)
          updateTask({ ...schedulingTime, startTime, durationMinutes }, selected)
        }}
      />}
    </AnimatePresence>
  </div>
}
