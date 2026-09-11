'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Archive, Check, CheckCircle2, ChevronDown, MoreVertical, PauseCircle, Pencil, Play, Plus, Target, Trash2 } from 'lucide-react'
import type { Goal, GoalStatus, Milestone, Task } from '@/lib/types'
import { deadlineState, describeDeadline, goalAlert, goalProgress, isoDate } from '@/lib/utils'

const labels = { carreira: 'Carreira', saude: 'Saúde', financeiro: 'Financeiro', relacionamentos: 'Relacionamentos', conhecimento: 'Conhecimento' }

/** Cor do prazo: só chama atenção quando merece. */
const deadlineColor: Record<string, string | undefined> = { late: 'var(--danger)', today: 'var(--accent)', soon: 'var(--accent)' }

export default function GoalCard({ goal, tasks = [], consistency, doneOn, onUpdateGoal, onEdit, onDelete }: {
  goal: Goal
  tasks?: Task[]
  /** Constância das tarefas ligadas nos últimos 30 dias, quando há o que medir. */
  consistency?: number
  /** Conclusão da tarefa hoje — o card não conhece o índice de eventos. */
  doneOn?: (task: Task) => boolean
  onUpdateGoal?: (goal: Goal) => void
  onEdit?: (goal: Goal) => void
  onDelete?: (goal: Goal) => void
}) {
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draft, setDraft] = useState('')

  const today = isoDate(new Date())
  const done = goal.milestones.filter(m => m.completed).length
  const linked = tasks.filter(task => task.goalId === goal.id)
  const linkedDone = doneOn ? linked.filter(doneOn).length : 0
  const finished = goal.status === 'completed'
  const paused = goal.status === 'paused'
  /** Meta encerrada não tem prazo a cobrar. */
  const state = finished ? 'none' : deadlineState(goal.deadline, today)
  const deadlineText = finished ? undefined : describeDeadline(goal.deadline, today)
  const alert = goalAlert(goal, { today, consistency, linkedCount: linked.length })

  const commit = (milestones: Milestone[]) =>
    onUpdateGoal?.({ ...goal, milestones, progress: goalProgress(milestones, consistency) })

  const setStatus = (status: GoalStatus) => {
    setMenu(false)
    onUpdateGoal?.({
      ...goal,
      status,
      // Concluir manualmente fecha a barra; reabrir devolve a medida real.
      progress: status === 'completed' ? 100 : goalProgress(goal.milestones, consistency),
      completedAt: status === 'completed' ? (goal.completedAt ?? new Date().toISOString()) : undefined,
    })
  }

  const toggle = (id: string) => commit(goal.milestones.map(m => m.id === id
    ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : undefined }
    : m))
  const remove = (id: string) => commit(goal.milestones.filter(m => m.id !== id))

  function addMilestone() {
    const title = draft.trim()
    if (title.length < 2) return
    setDraft('')
    commit([...goal.milestones, { id: crypto.randomUUID(), title, completed: false }])
  }

  const closeMenu = () => { setMenu(false); setConfirmDelete(false) }

  return <article className="surface relative overflow-hidden p-6" style={{ opacity: paused ? .6 : 1 }} onClick={closeMenu}>
    <div className="flex items-start gap-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: finished ? 'var(--energy)' : 'rgba(208,224,39,.1)', color: finished ? '#11130f' : 'var(--accent)' }}>
        {finished ? <CheckCircle2 size={19}/> : <Target size={19}/>}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-energy">{labels[goal.category]}</span>
          {deadlineText && <span className="text-xs" style={{ color: deadlineColor[state] ?? 'var(--muted)' }}>· {deadlineText}</span>}
          {finished && <span className="text-xs text-energy">· concluída</span>}
          {paused && <span className="muted text-xs">· pausada</span>}
        </div>
        <h3 className={`mt-2 text-xl font-semibold ${finished ? 'text-white/50 line-through' : ''}`}>{goal.title}</h3>
        {goal.description && <p className="muted mt-1 text-sm">{goal.description}</p>}

        <div className="mt-5 h-2 rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-energy transition-all" style={{ width: `${goal.progress}%` }}/></div>
        <div className="muted mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>
            {goal.milestones.length === 0 ? 'Sem marcos ainda' : `${done} de ${goal.milestones.length} marcos`}
            {consistency !== undefined && ` · ${consistency}% de constância em 30 dias`}
          </span>
          <strong className="text-white">{goal.progress}%</strong>
        </div>
        {/* Uma cobranca por vez, e so quando ha o que cobrar: aviso demais vira ruido. */}
        {alert && <div className="mt-4 flex items-start gap-2 rounded-2xl border p-3 text-xs"
          style={{ borderColor: alert.tone === 'danger' ? 'rgba(255,107,107,.35)' : 'rgba(208,224,39,.3)', color: alert.tone === 'danger' ? 'var(--danger)' : 'var(--ink)' }}>
          <AlertTriangle size={14} className="mt-px shrink-0"/>
          <span>{alert.text}</span>
        </div>}
        <button onClick={() => setOpen(!open)} className="mt-4 flex items-center gap-2 bg-transparent p-0 text-sm text-energy">{open ? 'Ocultar caminho' : 'Ver o caminho'}<ChevronDown size={15} className={open ? 'rotate-180' : ''}/></button>
      </div>

      {(onUpdateGoal || onEdit || onDelete) && <div className="relative shrink-0">
        <button onClick={event => { event.stopPropagation(); setConfirmDelete(false); setMenu(!menu) }} aria-label="Ações da meta" className="muted rounded-lg p-1 hover:text-white"><MoreVertical size={17}/></button>
        {menu && <div onClick={event => event.stopPropagation()} className="glass absolute right-0 top-9 z-30 w-56 rounded-2xl p-2 text-sm">
          {onEdit && <button onClick={() => { setMenu(false); onEdit(goal) }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"><Pencil size={14}/> Editar meta</button>}
          {onUpdateGoal && <>
            <button onClick={() => setStatus(finished ? 'active' : 'completed')} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5">
              {finished ? <><Play size={14}/> Reabrir meta</> : <><CheckCircle2 size={14}/> Marcar como concluída</>}
            </button>
            <button onClick={() => setStatus(paused ? 'active' : 'paused')} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5">
              {paused ? <><Play size={14}/> Retomar</> : <><PauseCircle size={14}/> Pausar</>}
            </button>
            <button onClick={() => setStatus('archived')} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"><Archive size={14}/> Arquivar</button>
          </>}
          {onDelete && <>
            <div className="my-1 border-t border-white/10"/>
            <button onClick={() => { if (confirmDelete) { closeMenu(); onDelete(goal) } else setConfirmDelete(true) }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"
              style={{ color: confirmDelete ? 'var(--danger)' : undefined }}><Trash2 size={14}/> {confirmDelete ? 'Confirmar exclusão' : 'Excluir'}</button>
          </>}
        </div>}
      </div>}
    </div>

    {open && <div className="mt-5 border-t border-white/[.07] pt-5">
      {/* Sem marcos o progresso passa a vir da constância das tarefas ligadas —
          mas marcos continuam sendo a medida mais honesta de "onde cheguei". */}
      {goal.milestones.length === 0 && <p className="muted mb-3 text-xs">Quebre a meta em marcos. Sem eles, o progresso vem da constância das tarefas ligadas.</p>}
      <div className="space-y-2">
        {goal.milestones.map(m => <div key={m.id} className="group flex items-center gap-3 rounded-xl bg-white/[.025] p-3 text-sm">
          <button onClick={() => toggle(m.id)} aria-label={m.completed ? 'Desmarcar marco' : 'Concluir marco'} className="grid h-5 w-5 shrink-0 place-items-center rounded-full border" style={{ borderColor: m.completed ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .18)', background: m.completed ? 'var(--energy)' : 'transparent', color: '#11130f' }}>{m.completed && <Check size={12}/>}</button>
          <span className={`min-w-0 flex-1 ${m.completed ? 'text-white/35 line-through' : ''}`}>{m.title}</span>
          {onUpdateGoal && <button onClick={() => remove(m.id)} aria-label="Excluir marco" className="shrink-0 text-white/25 transition hover:text-danger md:opacity-0 md:group-hover:opacity-100"><Trash2 size={14}/></button>}
        </div>)}
      </div>
      {onUpdateGoal && <div className="mt-3 flex items-center gap-2">
        <input value={draft} onChange={event => setDraft(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') addMilestone() }}
          placeholder="Adicionar um marco…" maxLength={160} className="field py-2 text-sm"/>
        <button onClick={addMilestone} aria-label="Adicionar marco" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-energy text-[#11130f]"><Plus size={17}/></button>
      </div>}
    </div>}

    {/* O que esta meta virou no dia a dia. Marcos são o destino; isto é o caminho. */}
    <div className="mt-5 border-t border-white/[.07] pt-5">
      <div className="flex items-center justify-between">
        <p className="muted text-[10px] font-bold uppercase tracking-wider">No seu dia</p>
        {linked.length > 0 && <span className="muted text-xs">{linkedDone}/{linked.length} hoje</span>}
      </div>
      {linked.length === 0
        ? <p className="muted mt-2 text-xs">Nenhuma tarefa ligada ainda. Em <Link href="/hoje" className="text-energy no-underline">Hoje</Link>, abra o menu de uma tarefa e escolha “Ligar a uma meta”.</p>
        : <div className="mt-3 space-y-2">{linked.map(task => {
            const completed = doneOn?.(task) ?? false
            return <div key={task.id} className="flex items-center gap-2.5 text-sm">
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border" style={{ borderColor: completed ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .18)', background: completed ? 'var(--energy)' : 'transparent', color: '#11130f' }}>{completed && <Check size={10}/>}</span>
              <span className={`truncate ${completed ? 'text-white/35 line-through' : ''}`}>{task.title}</span>
            </div>
          })}</div>}
    </div>
  </article>
}
