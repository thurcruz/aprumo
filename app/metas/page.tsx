'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, Edit3, Plus, Target } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import type { Goal, GoalCategory } from '@/lib/types'
import { deadlineState, goalConsistency, indexEvents, isDoneOn, isoDate } from '@/lib/utils'
import GoalCard from '@/components/modules/GoalCard'
import GoalDialog, { type GoalDraft } from '@/components/modules/GoalDialog'
import HabitDialog, { type HabitDraft } from '@/components/modules/HabitDialog'
import ChipSelect from '@/components/ui/ChipSelect'

type Filter = 'ativas' | 'concluidas' | 'todas' | GoalCategory
const filters: { value: Filter; label: string }[] = [
  { value: 'ativas', label: 'Em movimento' },
  { value: 'concluidas', label: 'Concluídas' },
  { value: 'todas', label: 'Todas' },
  { value: 'carreira', label: 'Carreira' },
  { value: 'saude', label: 'Saúde' },
  { value: 'relacionamentos', label: 'Relacionamentos' },
  { value: 'conhecimento', label: 'Conhecimento' },
]

export default function Metas() {
  const { store, setPurpose, addGoal, updateGoal, deleteGoal, addTask } = useAprumoStore()
  const today = isoDate(new Date())
  const events = useMemo(() => indexEvents(store.taskEvents), [store.taskEvents])

  const [filter, setFilter] = useState<Filter>('ativas')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  /** Meta recém-criada aguardando o hábito que vai realizá-la. */
  const [seeding, setSeeding] = useState<Goal | null>(null)
  const [editPurpose, setEditPurpose] = useState(false)
  const [purpose, setPurposeText] = useState(store.purpose)

  /** Constância por meta, calculada uma vez a partir das tarefas ligadas a ela. */
  const consistencyOf = useMemo(() => {
    const map = new Map<string, number | undefined>()
    for (const goal of store.goals) {
      map.set(goal.id, goalConsistency(store.tasks.filter(task => task.goalId === goal.id), events, today))
    }
    return map
  }, [store.goals, store.tasks, events, today])

  const active = store.goals.filter(goal => goal.status !== 'completed' && goal.status !== 'archived')
  const late = active.filter(goal => deadlineState(goal.deadline, today) === 'late').length
  const completed = store.goals.filter(goal => goal.status === 'completed').length

  const visible = useMemo(() => {
    const list = store.goals.filter(goal => {
      if (filter === 'ativas') return goal.status !== 'completed' && goal.status !== 'archived'
      if (filter === 'concluidas') return goal.status === 'completed'
      if (filter === 'todas') return true
      return goal.category === filter
    })
    // Atrasadas primeiro, depois o prazo mais próximo: o que cobra vem à frente.
    const rank = { late: 0, today: 1, soon: 2, ok: 3, none: 4 }
    return [...list].sort((a, b) => {
      if ((a.status === 'completed') !== (b.status === 'completed')) return a.status === 'completed' ? 1 : -1
      const diff = rank[deadlineState(a.deadline, today)] - rank[deadlineState(b.deadline, today)]
      return diff !== 0 ? diff : (a.deadline || '9999').localeCompare(b.deadline || '9999')
    })
  }, [store.goals, filter, today])

  function create(draft: GoalDraft) {
    setCreating(false)
    const goal: Goal = { id: crypto.randomUUID(), ...draft, progress: 0, milestones: [], linkedTasks: [], status: 'active' }
    addGoal(goal)
    // Uma meta sem comportamento é só um desejo escrito: emendamos a pergunta
    // enquanto a intenção ainda está fresca, mas dá para pular.
    setSeeding(goal)
  }

  /** O hábito nasce já ligado à meta que o originou. */
  function seedHabit(goal: Goal, draft: HabitDraft) {
    setSeeding(null)
    addTask({
      id: crypto.randomUUID(), title: draft.title, category: 'fixa', completed: false,
      createdAt: new Date().toISOString(), dayBlock: draft.dayBlock, priority: 2, source: 'manual',
      frequency: draft.frequency, startTime: draft.startTime, durationMinutes: draft.durationMinutes,
      goalId: goal.id,
    })
  }

  function saveEdit(goal: Goal, draft: GoalDraft) {
    setEditing(null)
    updateGoal({ ...goal, ...draft })
  }

  return <div className="page-wrap">
    <header className="flex items-start justify-between gap-5">
      <div>
        <Link href="/hoje" className="muted mb-5 inline-flex items-center gap-2 text-sm no-underline"><ArrowLeft size={15}/> Voltar para Hoje</Link>
        <p className="eyebrow">Metas</p>
        <h1 className="display mt-3 text-4xl font-semibold md:text-6xl">Direção antes<br/>de velocidade.</h1>
        <p className="muted mt-4">Conecte quem você quer ser ao comportamento de hoje.</p>
      </div>
      <button className="energy-button mt-9 flex items-center gap-2 px-5 py-3" onClick={() => setCreating(true)}><Plus size={17}/> <span className="hidden sm:inline">Nova meta</span></button>
    </header>

    <section className="surface relative mt-10 p-6 md:p-8">
      <p className="eyebrow">Meu norte</p>
      {editPurpose
        ? <>
            <textarea className="field mt-4 resize-none text-lg" rows={3} maxLength={180} value={purpose} onChange={event => setPurposeText(event.target.value)}/>
            <div className="mt-3 flex gap-2">
              <button className="energy-button px-4 py-2 text-sm" onClick={() => { setPurpose(purpose); setEditPurpose(false) }}>Salvar</button>
              <button className="rounded-full border border-white/10 px-4 py-2 text-sm" onClick={() => { setPurposeText(store.purpose); setEditPurpose(false) }}>Cancelar</button>
            </div>
          </>
        : <>
            <p className="display mt-4 max-w-3xl text-2xl leading-snug md:text-3xl">{store.purpose ? `“${store.purpose}”` : 'Defina o propósito que guia sua evolução.'}</p>
            <button aria-label="Editar propósito" className="icon-button absolute right-5 top-5" onClick={() => { setPurposeText(store.purpose); setEditPurpose(true) }}><Edit3 size={16}/></button>
          </>}
    </section>

    {store.goals.length > 0 && <section className="mt-5 grid gap-3 sm:grid-cols-3">
      <div className="surface p-5"><strong className="block text-2xl">{active.length}</strong><span className="muted text-xs">em movimento</span></div>
      <div className="surface p-5" style={{ borderColor: late > 0 ? 'rgba(255,107,107,.35)' : undefined }}>
        <strong className="block text-2xl" style={{ color: late > 0 ? 'var(--danger)' : undefined }}>{late}</strong>
        <span className="muted text-xs">{late === 1 ? 'passou do prazo' : 'passaram do prazo'}</span>
      </div>
      <div className="surface p-5"><strong className="block text-2xl">{completed}</strong><span className="muted text-xs">concluídas</span></div>
    </section>}

    {store.goals.length > 0 && <ChipSelect className="mt-7 flex gap-1.5 overflow-x-auto pb-1" value={filter} onChange={setFilter} options={filters} size="sm"/>}

    {visible.length === 0
      ? <div className="surface mt-6 grid min-h-56 place-items-center p-8 text-center">
          <div>
            <Target className="mx-auto text-energy"/>
            <p className="mt-4 font-semibold">{store.goals.length === 0 ? 'Nenhuma meta ainda' : 'Nada neste filtro'}</p>
            <p className="muted mx-auto mt-1 max-w-sm text-sm">
              {store.goals.length === 0
                ? 'Uma meta é um destino com prazo. Comece por uma só — a que muda o resto.'
                : 'Experimente outro filtro ou crie uma meta nesta categoria.'}
            </p>
            {store.goals.length === 0 && <button onClick={() => setCreating(true)} className="energy-button mt-6 px-5 py-2.5 text-sm">Criar a primeira</button>}
          </div>
        </div>
      : <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {visible.map(goal => <GoalCard key={goal.id} goal={goal} tasks={store.tasks}
            consistency={consistencyOf.get(goal.id)}
            doneOn={task => isDoneOn(events, task.id, today)}
            onUpdateGoal={updateGoal}
            onEdit={setEditing}
            onDelete={target => deleteGoal(target.id)}/>)}
        </div>}

    <AnimatePresence>
      {creating && <GoalDialog key="nova" heading="Novo destino" confirmLabel="Criar meta" onCancel={() => setCreating(false)} onSave={create}/>}
      {editing && <GoalDialog key={editing.id} heading="Editar meta" confirmLabel="Salvar alterações"
        initial={{ title: editing.title, description: editing.description, category: editing.category, deadline: editing.deadline }}
        onCancel={() => setEditing(null)}
        onSave={draft => saveEdit(editing, draft)}/>}
      {seeding && <HabitDialog key={`semente-${seeding.id}`}
        heading="Meta criada"
        description={`Que comportamento te leva a “${seeding.title}”? Um hábito basta para começar.`}
        confirmLabel="Criar hábito e concluir"
        skipLabel="Agora não"
        goals={[seeding]}
        lockGoal
        initial={{ goalId: seeding.id }}
        onCancel={() => setSeeding(null)}
        onSave={draft => seedHabit(seeding, draft)}/>}
    </AnimatePresence>
  </div>
}
