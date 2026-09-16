'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence } from 'framer-motion'
import { BookOpen, CalendarCheck, Check, Footprints, Languages, Lock, Moon, Wallet, Wind, X } from 'lucide-react'
import RoutinePlanDialog from '@/components/modules/RoutinePlanDialog'
import { PlusBadge } from '@/components/plus/PlusGate'
import { usePlan } from '@/lib/plan'
import { planEndChanges, planHabitToTask, planProgress, ROUTINE_PLANS, type PlanHabit, type PlanIcon, type PlanProgress, type RoutinePlanTemplate } from '@/lib/routine-plans'
import { useAprumoStore } from '@/lib/store'
import type { TaskSource } from '@/lib/types'
import { daysBetween, isoDate, parseDate } from '@/lib/utils'

const icons: Record<PlanIcon, typeof BookOpen> = { run: Footprints, book: BookOpen, breath: Wind, moon: Moon, wallet: Wallet, language: Languages }
const shortDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(parseDate(value))

function PlanCard({ item, today, confirming, onAskEnd, onKeep, onEnd }: {
  item: PlanProgress
  today: string
  confirming: boolean
  onAskEnd: () => void
  onKeep: () => void
  onEnd: () => void
}) {
  const Icon = item.template ? icons[item.template.icon] : CalendarCheck
  const span = daysBetween(item.startsOn, item.endsOn) + 1
  const elapsed = item.status === 'upcoming' ? 0 : item.status === 'finished' ? 100 : Math.round((daysBetween(item.startsOn, today) + 1) / span * 100)
  const consistency = item.due > 0 ? Math.round(item.done / item.due * 100) : undefined
  const status = item.status === 'upcoming' ? `Começa em ${shortDate(item.startsOn)}` : item.status === 'finished' ? `Concluído em ${shortDate(item.endsOn)}` : `Semana ${item.week} de ${item.totalWeeks}`

  return <article className="surface p-5">
    <div className="flex items-start gap-3">
      <span className="theme-dark grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: item.template?.color ?? '#344d62' }}><Icon size={19} className="text-white/80"/></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{item.template?.title ?? 'Plano'}</p>
        <p className="muted text-xs">{status}</p>
      </div>
    </div>
    <div className="mt-5 h-2 rounded-full bg-white/7"><div className="h-full rounded-full bg-energy" style={{ width: `${elapsed}%` }}/></div>
    <div className="muted mt-2 flex justify-between text-xs">
      <span>{item.due > 0 ? `${item.done} de ${item.due} sessões feitas` : 'Nenhuma sessão devida ainda'}</span>
      {consistency !== undefined && <span>{consistency}% de constância</span>}
    </div>
    {item.today.length > 0 && <div className="mt-4 rounded-2xl border p-3" style={{ borderColor: 'var(--line)' }}>
      <p className="muted text-[10px] font-bold uppercase tracking-wider">Hoje</p>
      {item.today.map(task => <p key={task.id} className="mt-1 text-sm">{task.title}{task.startTime ? ` · ${task.startTime}` : ''}</p>)}
    </div>}
    {item.status !== 'finished' && (confirming
      ? <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="muted min-w-0 flex-1 text-xs">Encerrar? O que você já fez fica no histórico.</p>
          <button onClick={onKeep} className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: 'var(--line)' }}>Manter</button>
          <button onClick={onEnd} className="rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ background: 'var(--danger)' }}>Encerrar plano</button>
        </div>
      : <button onClick={onAskEnd} className="muted mt-4 text-xs hover:underline">Encerrar plano</button>)}
  </article>
}

export default function Planos() {
  const { store, addTask, updateTask, deleteTask } = useAprumoStore()
  const { plan, loading: planLoading } = usePlan()
  const today = isoDate(new Date())
  const [selected, setSelected] = useState<RoutinePlanTemplate | null>(null)
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null)
  const [adopted, setAdopted] = useState<string | null>(null)

  const progress = useMemo(() => planProgress(store.tasks, store.taskEvents, today), [store.tasks, store.taskEvents, today])
  // Um plano concluído fica à vista por um mês: é a hora de ver o resultado.
  const mine = progress.filter(item => item.status !== 'finished' || daysBetween(item.endsOn, today) <= 30)
  const running = new Set(progress.filter(item => item.status !== 'finished').map(item => item.slug))

  function adopt(template: RoutinePlanTemplate, habits: PlanHabit[], source: TaskSource) {
    const planId = crypto.randomUUID()
    const now = new Date()
    for (const habit of habits) addTask(planHabitToTask(habit, { id: planId, slug: template.slug }, { id: crypto.randomUUID(), source, now }))
    setSelected(null)
    setAdopted(template.title)
  }

  function endPlan(item: PlanProgress) {
    const { remove, update } = planEndChanges(item.tasks, today)
    for (const id of remove) deleteTask(id)
    for (const task of update) updateTask(task)
    setConfirmEnd(null)
  }

  return <div className="page-wrap">
    <header>
      <div className="flex items-center gap-2"><p className="eyebrow">Planos</p><PlusBadge/></div>
      <h1 className="display mt-3 text-4xl font-semibold md:text-6xl">Um plano pronto,<br/>no ritmo da sua rotina.</h1>
      <p className="muted mt-4 max-w-xl">Escolha um objetivo, diga quando você pode e a Pri encaixa cada etapa nos horários livres da sua semana. Cada sessão vira um hábito na sua agenda.</p>
    </header>

    {adopted && <div className="surface mt-6 flex items-center gap-3 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-energy/10 text-energy"><Check size={16}/></span>
      <p className="min-w-0 flex-1 text-sm"><strong>{adopted}</strong> está na sua rotina. As sessões aparecem em <Link href="/hoje">Hoje</Link> nos dias combinados.</p>
      <button className="icon-button shrink-0" onClick={() => setAdopted(null)} aria-label="Fechar aviso"><X size={16}/></button>
    </div>}

    {mine.length > 0 && <section className="mt-10">
      <h2 className="text-xl font-semibold">Seus planos</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {mine.map(item => <PlanCard key={item.id} item={item} today={today} confirming={confirmEnd === item.id}
          onAskEnd={() => setConfirmEnd(item.id)} onKeep={() => setConfirmEnd(null)} onEnd={() => endPlan(item)}/>)}
      </div>
    </section>}

    <section className="mt-10">
      <h2 className="text-xl font-semibold">Comece um plano</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ROUTINE_PLANS.map(template => {
          const Icon = icons[template.icon]
          return <button key={template.slug} onClick={() => setSelected(template)} className="group text-left">
            <div className="theme-dark relative h-full overflow-hidden rounded-[22px] border border-white/10 p-5 transition group-hover:-translate-y-0.5" style={{ background: `linear-gradient(145deg,${template.color},#151713)` }}>
              <div className="flex items-start justify-between gap-3">
                <Icon size={24} className="text-white/70"/>
                {running.has(template.slug) && <span className="rounded-full bg-energy px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#11130f]">Em andamento</span>}
                {plan !== 'plus' && !planLoading && !running.has(template.slug) && <Lock size={15} className="text-white/50" aria-label="Aprumo+"/>}
              </div>
              <p className="mt-10 text-xl font-semibold leading-tight text-white">{template.title}</p>
              <p className="mt-2 text-sm text-white/60">{template.tagline}</p>
              <p className="mt-5 text-[11px] uppercase tracking-wider text-white/45">{template.area} · {template.weeks} semanas</p>
            </div>
          </button>
        })}
      </div>
    </section>

    <AnimatePresence>
      {selected && <RoutinePlanDialog key={selected.slug} template={selected} today={today} isPlus={plan === 'plus'} planLoading={planLoading}
        running={running.has(selected.slug)} onCancel={() => setSelected(null)} onAdopt={(habits, source) => adopt(selected, habits, source)}/>}
    </AnimatePresence>
  </div>
}
