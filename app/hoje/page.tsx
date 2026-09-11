'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckSquare, ChevronDown, ChevronLeft, Circle, Clock3, Dumbbell, GripVertical, PencilLine, Pin, Plus, Star, Target, Timer, Trash2, X } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import { dayBlocks, type DayBlock, type Task, type Weekday } from '@/lib/types'
import { endTimeOf, indexEvents, isDoneOn, isoDate as iso, parseDate as parse, taskShowsOn, weekStart } from '@/lib/utils'
import HabitDialog, { type HabitDraft } from '@/components/modules/HabitDialog'
import TimeDialog from '@/components/modules/TimeDialog'
import { PlusGate } from '@/components/plus/PlusGate'

const moods = ['😞','😕','😐','🙂','🔥'] as const
/** As quatro frentes de Performance. O dia acontece aqui; elas dão a estrutura. */
const subAreas = [
  { href: '/tarefas', label: 'Hábitos', icon: CheckSquare },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/metas', label: 'Metas', icon: Target },
  { href: '/foco', label: 'Foco', icon: Timer },
]

export default function HojePage() {
  const { store, addTask, updateTask, deleteTask, carryTask, setTaskDone, addMood } = useAprumoStore()
  const today = iso(new Date())
  const [selected, setSelected] = useState(today)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
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
  const selectedMood = store.moods.find(entry => iso(new Date(entry.date)) === selected)?.mood

  function create(block: DayBlock) {
    const title = (drafts[block] ?? '').trim()
    if (title.length < 2) return
    addTask({ id: crypto.randomUUID(), title, category: 'hoje', completed: false, createdAt: new Date().toISOString(), dayBlock: block, priority: 2, source: 'manual', scheduledDate: selected })
    setDrafts(d => ({ ...d, [block]: '' }))
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
    <header className="mb-6">
      <p className="eyebrow">{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate)}</p>
      <h1 className="display mt-3 max-w-2xl text-4xl font-semibold md:text-6xl">{isToday ? <>Como vai ser<br/>o seu dia?</> : <>Seu dia<br/>{selectedDate < parse(today) ? 'que passou.' : 'que vem.'}</>}</h1>
      <p className="muted mt-4 max-w-xl">
        {visible.length === 0
          ? 'Conte o que precisa acontecer. A organização vem depois.'
          : `${done} de ${visible.length} concluídas${focusMinutes > 0 ? ` · ${Math.round(focusMinutes)} min focados` : ''}.`}
      </p>
    </header>

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
      <Link href={`/agenda?dia=${selected}`} aria-label="Abrir agenda" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border no-underline" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}><CalendarDays size={18}/></Link>
    </section>

    <nav className="mb-5 grid grid-cols-2 gap-3">
      {subAreas.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="surface flex items-center gap-3 p-4 text-white no-underline"><Icon size={18} className="shrink-0 text-energy"/><span className="text-sm font-semibold">{label}</span></Link>)}
    </nav>

    {visible.length > 0 && <button onClick={() => setMinimalDay(v => !v)} className="surface mb-5 flex w-full items-center gap-3 p-4 text-left" style={{ borderColor: minimalDay ? 'rgba(208,224,39,.5)' : undefined }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-energy/10 text-energy"><Circle size={16}/></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{minimalDay ? 'Dia mínimo ativado' : 'Hoje está difícil?'}</p>
        <p className="muted text-xs">{minimalDay
          ? essentials.length > 0 ? `Preservando ${essentials.length} ${essentials.length === 1 ? 'ação essencial' : 'ações essenciais'}. O resto pode esperar.` : 'Marque de 1 a 3 ações como essenciais na estrela.'
          : 'Ative o dia mínimo e preserve só o essencial. Rotina perfeita não existe.'}</p>
      </div>
    </button>}

    {/* grid-cols-1 (minmax(0,1fr)): sem ele, um título longo alarga a coluna além da tela no celular. */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {dayBlocks.map(block => {
        const tasks = grouped[block.id]
        const isTarget = drag?.over === block.id
        return <section key={block.id}
          ref={element => { if (element) blockEls.current.set(block.id, element); else blockEls.current.delete(block.id) }}
          className="surface p-5 transition"
          style={{ borderColor: isTarget ? 'var(--energy)' : undefined, background: isTarget ? 'rgba(208,224,39,.04)' : undefined }}>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-semibold">{block.label}</h2>
            <span className="muted text-xs">{tasks.filter(task => doneOn(task, selected)).length}/{tasks.length}</span>
          </div>

          <div className="space-y-2">
            {tasks.length === 0 && <p className="muted rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs">Nada aqui ainda</p>}
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
                    </div>}

                {/* Hábito de treino: abre a ficha direto na execução. */}
                {workoutPlan && <Link href={`/treino?iniciar=${workoutPlan.id}`} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} aria-label={`Treinar ${workoutPlan.name}`} className="flex shrink-0 items-center gap-1 rounded-full bg-energy/10 px-2.5 py-1 text-[11px] font-semibold text-energy no-underline"><Dumbbell size={12}/> Treinar</Link>}
                <button onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); setConfirmDelete(null); setOpenMenu(openMenu === task.id ? null : task.id) }} aria-label="Mais opções" className="muted shrink-0 rounded-lg p-1 hover:text-white"><ChevronDown size={14}/></button>

                {openMenu === task.id && <div onClick={event => event.stopPropagation()} className="glass absolute right-2 top-11 z-30 w-60 rounded-2xl p-2 text-sm">
                  {linking === task.id ? <>
                    <button onClick={() => setLinking(null)} className="muted flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider hover:text-white"><ChevronLeft size={12}/> Ligar a uma meta</button>
                    {store.goals.length === 0
                      ? <p className="muted px-2 py-2 text-xs">Você ainda não tem metas. <Link href="/metas" className="text-energy no-underline">Criar a primeira</Link>.</p>
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

          <div className="mt-3 flex items-center gap-2">
            <input value={drafts[block.id] ?? ''} onChange={event => setDrafts(d => ({ ...d, [block.id]: event.target.value }))}
              onKeyDown={event => { if (event.key === 'Enter') create(block.id) }}
              placeholder="Adicionar…" maxLength={160} className="field py-2 text-sm"/>
            <button onClick={() => create(block.id)} aria-label={`Adicionar em ${block.label}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-energy text-[#11130f]"><Plus size={17}/></button>
          </div>
        </section>
      })}
    </div>

    <section className="surface mt-5 p-6">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Como você está{isToday ? ' hoje' : ' nesse dia'}?</p>
        {selectedMood && <span className="muted text-xs">Registrado</span>}
      </div>
      <div className="mt-5 flex justify-between">
        {moods.map((mood, index) => {
          const level = (index + 1) as 1|2|3|4|5
          const active = selectedMood === level
          return <button key={mood} onClick={() => addMood({ id: crypto.randomUUID(), date: parse(selected).toISOString(), mood: level })}
            aria-label={`Humor ${level} de 5`} aria-pressed={active}
            className="grid h-11 w-11 place-items-center rounded-full border text-xl transition hover:-translate-y-1"
            style={{ borderColor: active ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .1)', background: active ? 'rgba(208,224,39,.12)' : 'rgb(var(--fg-rgb) / .03)', transform: active ? 'scale(1.1)' : undefined }}>{mood}</button>
        })}
      </div>
      <p className="muted mt-4 text-xs">{selectedMood ? 'Pode trocar quando quiser — vale o que você sente agora.' : 'Leva 2 segundos e ajuda a entender seus padrões.'}</p>
    </section>

    <section className="mt-5">
      <PlusGate title="Entenda sua semana, não só registre" description="Constância detalhada, disciplina, taxa de repasses e padrões semanais. A Pri transforma seus registros em análise e planejamento.">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface p-6">
          <p className="eyebrow">Insights da Pri</p>
          <h2 className="mt-2 text-xl font-semibold">Sua semana em análise</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[.07] p-4"><p className="muted text-xs">Concluídas</p><p className="mt-1 text-2xl font-semibold">{done}</p></div>
            <div className="rounded-2xl border border-white/[.07] p-4"><p className="muted text-xs">Adiadas</p><p className="mt-1 text-2xl font-semibold">{store.metrics.carriedCommitments}</p></div>
            <div className="rounded-2xl border border-white/[.07] p-4"><p className="muted text-xs">Foco no dia</p><p className="mt-1 text-2xl font-semibold">{Math.round(focusMinutes)}m</p></div>
          </div>
          <Link href="/pri" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-energy no-underline">Ver relatório completo <ArrowRight size={15}/></Link>
        </motion.div>
      </PlusGate>
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
