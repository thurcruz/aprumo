'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, CalendarRange, Check, ChevronDown, Clock3, Flame, PencilLine, Plus, Repeat2, Star, Target, Trash2 } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import { dayBlocks, type DayBlock, type Task } from '@/lib/types'
import { describeFrequency, describeSpan, endTimeOf, habitExpired, habitRunsOn, indexEvents, isDoneOn, isoDate as iso } from '@/lib/utils'
import HabitDialog, { type HabitDraft } from '@/components/modules/HabitDialog'
import { streaks } from '@/lib/evolution'

export default function HabitosPage() {
  const { store, addTask, updateTask, deleteTask, setTaskDone } = useAprumoStore()
  const today = iso(new Date())
  const [creating, setCreating] = useState(false)
  /** Hábito aberto no modal de configuração; null quando ninguém está sendo editado. */
  const [editing, setEditing] = useState<Task|null>(null)
  const [openMenu, setOpenMenu] = useState<string|null>(null)
  const [renaming, setRenaming] = useState<string|null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null)

  /** Esta página cuida só da rotina: hábitos recorrentes, que não têm data.
      Tarefas soltas de um dia nascem em Hoje, que já as agenda. */
  const habits = useMemo(() => store.tasks.filter(task => task.category === 'fixa'), [store.tasks])
  const grouped = useMemo(() => {
    const map: Record<DayBlock, Task[]> = { manha: [], tarde: [], noite: [], livre: [] }
    for (const habit of habits) map[habit.dayBlock ?? 'livre'].push(habit)
    return map
  }, [habits])

  const events = useMemo(() => indexEvents(store.taskEvents), [store.taskEvents])
  /** Só metas em aberto: ligar um hábito novo a uma meta encerrada não faz sentido. */
  const openGoals = useMemo(() => store.goals.filter(goal => goal.status === 'active' || goal.status === 'paused'), [store.goals])
  /** Esta página fala sempre de hoje: a conclusão vem do evento do dia de hoje. */
  const doneToday = (task: Task) => isDoneOn(events, task.id, today)

  /** As métricas do topo falam do dia de hoje, então ignoram o que não vale hoje. */
  const activeToday = useMemo(() => habits.filter(habit => habitRunsOn(habit.frequency, new Date())), [habits])
  const done = activeToday.filter(doneToday).length
  const essentials = habits.filter(habit => habit.priority === 1).length
  /** A mesma sequência da página de evolução, em datas locais (a do servidor conta em UTC). */
  const currentStreak = streaks(store.taskEvents, today).current

  const closeMenu = () => { setOpenMenu(null); setConfirmDelete(null) }

  function create(draft: HabitDraft) {
    setCreating(false)
    addTask({ id: crypto.randomUUID(), title: draft.title, category: 'fixa', completed: false, createdAt: new Date().toISOString(), dayBlock: draft.dayBlock, priority: 2, source: 'manual', frequency: draft.frequency, startTime: draft.startTime, durationMinutes: draft.durationMinutes, goalId: draft.goalId })
  }

  function saveEdit(task: Task, draft: HabitDraft) {
    setEditing(null)
    updateTask({ ...task, title: draft.title, dayBlock: draft.dayBlock, frequency: draft.frequency, startTime: draft.startTime, durationMinutes: draft.durationMinutes, goalId: draft.goalId }, today)
  }

  const toggle = (task: Task) => setTaskDone(task, today, !doneToday(task))
  const toggleEssential = (task: Task) => { closeMenu(); updateTask({ ...task, priority: task.priority === 1 ? 2 : 1 }, today) }
  const rename = (task: Task, value: string) => {
    const next = value.trim()
    setRenaming(null)
    if (next.length >= 2 && next !== task.title) updateTask({ ...task, title: next }, today)
  }

  return <div className="page-wrap" onClick={closeMenu}>
    <header className="flex items-start justify-between gap-5">
      <div>
        <Link href="/hoje" className="muted mb-5 inline-flex items-center gap-2 text-sm no-underline"><ArrowLeft size={15}/> Voltar para Hoje</Link>
        <p className="eyebrow">Editar rotina</p>
        <h1 className="display mt-3 text-4xl font-semibold md:text-6xl">Decida uma vez.<br/>Execute todos os dias.</h1>
        <p className="muted mt-4 max-w-xl">Mantenha apenas os hábitos que sustentam quem você quer se tornar. O que é só de hoje pertence ao <Link href="/hoje" className="text-energy no-underline">seu dia</Link>.</p>
      </div>
      <button onClick={() => setCreating(true)} className="energy-button mt-9 flex items-center gap-2 px-5 py-3"><Plus size={17}/><span className="hidden sm:inline">Novo hábito</span></button>
    </header>

    <section className="mt-10 grid gap-3 sm:grid-cols-3">
      <div className="surface p-5"><Check size={19} className="text-energy"/><strong className="mt-5 block text-2xl">{done}/{activeToday.length}</strong><span className="muted text-xs">cumpridos hoje</span></div>
      <div className="surface p-5"><Flame size={19} className="text-energy"/><strong className="mt-5 block text-2xl">{currentStreak}</strong><span className="muted text-xs">dias de sequência</span></div>
      <div className="surface p-5"><Star size={19} className="text-energy"/><strong className="mt-5 block text-2xl">{essentials}</strong><span className="muted text-xs">marcados como essenciais</span></div>
    </section>

    {habits.length === 0
      ? <div className="surface mt-9 grid min-h-56 place-items-center p-8 text-center">
          <div>
            <Check className="mx-auto text-energy"/>
            <p className="mt-4 font-semibold">Sua rotina está vazia</p>
            <p className="muted mx-auto mt-1 max-w-sm text-sm">Comece com um hábito só. Uma rotina leve também é uma boa rotina — e é a que sobrevive.</p>
            <button onClick={() => setCreating(true)} className="energy-button mt-6 px-5 py-2.5 text-sm">Criar o primeiro</button>
          </div>
        </div>
      : <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-2">
          {dayBlocks.map(({ id, label }) => {
            const list = grouped[id]
            return <section key={id} className="surface p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-semibold">{label}</h2>
                <span className="muted text-xs">{list.filter(doneToday).length}/{list.length}</span>
              </div>
              <div className="space-y-2">
                {list.length === 0 && <p className="muted rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs">Nenhum hábito neste período</p>}
                {list.map(habit => {
                  const essential = habit.priority === 1
                  const isRenaming = renaming === habit.id
                  const goal = habit.goalId ? store.goals.find(item => item.id === habit.goalId) : undefined
                  const span = describeSpan(habit.frequency)
                  const expired = habitExpired(habit.frequency)
                  const completed = doneToday(habit)
                  return <div key={habit.id} className="relative flex items-center gap-2 rounded-2xl border border-white/[.07] bg-white/[.025] p-2.5" style={{ borderColor: essential && !completed ? 'rgba(208,224,39,.4)' : undefined, opacity: expired ? .5 : 1 }}>
                    <button onClick={() => toggle(habit)} aria-label={completed ? 'Desmarcar' : 'Cumprir hoje'} className="grid h-6 w-6 shrink-0 place-items-center rounded-full border" style={{ background: completed ? 'var(--energy)' : 'transparent', borderColor: completed ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .18)', color: '#11130f' }}>{completed && <Check size={14}/>}</button>

                    {isRenaming
                      ? <input autoFocus defaultValue={habit.title} maxLength={160}
                          onClick={event => event.stopPropagation()}
                          onKeyDown={event => { if (event.key === 'Enter') rename(habit, event.currentTarget.value); if (event.key === 'Escape') setRenaming(null) }}
                          onBlur={event => rename(habit, event.target.value)}
                          className="field min-w-0 flex-1 py-1 text-sm"/>
                      : <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            {essential && <Star size={12} className="shrink-0 text-energy" fill="currentColor" aria-label="Essencial"/>}
                            {goal && <Target size={12} className="shrink-0 text-energy" aria-label={`Meta: ${goal.title}`}/>}
                            <p className={`truncate text-sm ${completed ? 'text-white/35 line-through' : 'text-white'}`}>{habit.title}</p>
                          </div>
                          <div className="muted mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px]">
                            <span className="flex items-center gap-1"><Repeat2 size={10}/>{describeFrequency(habit.frequency)}</span>
                            {habit.startTime && <span className="flex items-center gap-1"><Clock3 size={10}/>{habit.startTime}{endTimeOf(habit) && `–${endTimeOf(habit)}`}</span>}
                            {span && <span className="flex items-center gap-1" style={{ color: expired ? 'var(--danger)' : undefined }}><CalendarRange size={10}/>{expired ? 'prazo encerrado' : span}</span>}
                          </div>
                        </div>}

                    <button onClick={event => { event.stopPropagation(); setConfirmDelete(null); setOpenMenu(openMenu === habit.id ? null : habit.id) }} aria-label="Mais opções" className="muted shrink-0 rounded-lg p-1 hover:text-white"><ChevronDown size={14}/></button>

                    {openMenu === habit.id && <div onClick={event => event.stopPropagation()} className="glass absolute right-2 top-11 z-30 w-60 rounded-2xl p-2 text-sm">
                      <button onClick={() => { closeMenu(); setEditing(habit) }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"><Repeat2 size={14}/> Dias e horário</button>
                      <button onClick={() => toggleEssential(habit)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"><Star size={14} style={{ color: essential ? 'var(--accent)' : undefined }}/> {essential ? 'Remover de essencial' : 'Marcar como essencial'}</button>
                      <button onClick={() => { setRenaming(habit.id); closeMenu() }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"><PencilLine size={14}/> Renomear</button>
                      <button onClick={() => { if (confirmDelete === habit.id) { deleteTask(habit.id); closeMenu() } else setConfirmDelete(habit.id) }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5" style={{ color: confirmDelete === habit.id ? 'var(--danger)' : undefined }}><Trash2 size={14}/> {confirmDelete === habit.id ? 'Confirmar exclusão' : 'Excluir da rotina'}</button>
                    </div>}
                  </div>
                })}
              </div>
            </section>
          })}
        </div>}

    <AnimatePresence>
      {creating && <HabitDialog
        key="novo"
        heading="Novo hábito"
        confirmLabel="Adicionar à rotina"
        goals={openGoals}
        initial={{}}
        onCancel={() => setCreating(false)}
        onSave={create}
      />}
      {editing && <HabitDialog
        key={editing.id}
        heading="Editar hábito"
        confirmLabel="Salvar alterações"
        goals={openGoals}
        initial={{ goalId: editing.goalId, title: editing.title, dayBlock: editing.dayBlock ?? 'livre', frequency: editing.frequency, startTime: editing.startTime, durationMinutes: editing.durationMinutes }}
        onCancel={() => setEditing(null)}
        onSave={draft => saveEdit(editing, draft)}
      />}
    </AnimatePresence>
  </div>
}
