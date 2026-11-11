'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence } from 'framer-motion'
import { BookOpen, CalendarCheck, Check, Footprints, Languages, Moon, Wallet, Wind, X } from 'lucide-react'
import RoutinePlanDialog from '@/components/modules/RoutinePlanDialog'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import IconButton from '@/components/ui/IconButton'
import ProgressBar from '@/components/ui/ProgressBar'
import SectionHeader from '@/components/ui/SectionHeader'
import { planEndChanges, planHabitToTask, planProgress, ROUTINE_PLANS, type PlanHabit, type PlanIcon, type PlanProgress, type RoutinePlanTemplate } from '@/lib/routine-plans'
import { DIAGNOSIS_SLUG } from '@/lib/diagnosis'
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

  return <Card as="article">
    <div className="flex items-start gap-3">
      <span className="theme-dark grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: item.template?.color ?? '#344d62' }}><Icon size={19} className="text-white/80"/></span>
      <div className="min-w-0 flex-1">
        <p className="text-h3">{item.template?.title ?? 'Plano'}</p>
        <p className="text-caption text-fg-2">{status}</p>
      </div>
    </div>
    <ProgressBar className="mt-5" value={elapsed} label="Andamento do plano"/>
    <div className="mt-2 flex justify-between text-caption text-fg-2">
      <span>{item.due > 0 ? `${item.done} de ${item.due} sessões feitas` : 'Nenhuma sessão devida ainda'}</span>
      {consistency !== undefined && <span className="tabular-nums">{consistency}% de constância</span>}
    </div>
    {item.today.length > 0 && <div className="mt-4 rounded-control border border-line bg-surface-2 p-3">
      <p className="text-label uppercase text-fg-3">Hoje</p>
      {item.today.map(task => <p key={task.id} className="mt-1 text-body-s">{task.title}{task.startTime ? ` · ${task.startTime}` : ''}</p>)}
    </div>}
    {item.status !== 'finished' && (confirming
      ? <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-caption text-fg-2">Encerrar? O que você já fez fica no histórico.</p>
          <Button size="sm" variant="secondary" onClick={onKeep}>Manter</Button>
          <Button size="sm" variant="danger" onClick={onEnd}>Encerrar plano</Button>
        </div>
      : <button onClick={onAskEnd} className="mt-4 text-caption text-fg-3 hover:text-fg-1 hover:underline">Encerrar plano</button>)}
  </Card>
}

/**
 * Planos prontos: caminhos de algumas semanas (corrida, leitura, sono…) que
 * viram hábitos na rotina. Destino próprio no menu (/planos).
 */
export default function RoutinePlans() {
  const { store, addTask, updateTask, deleteTask } = useAprumoStore()
  const today = isoDate(new Date())
  const [selected, setSelected] = useState<RoutinePlanTemplate | null>(null)
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null)
  const [adopted, setAdopted] = useState<string | null>(null)

  // O plano do diagnóstico é acompanhado em Hoje; aqui ficam só os planos prontos.
  const progress = useMemo(() => planProgress(store.tasks, store.taskEvents, today).filter(item => item.slug !== DIAGNOSIS_SLUG), [store.tasks, store.taskEvents, today])
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

  return <div className="space-y-8">
    <p className="text-body-s text-fg-2">Um plano pronto, no ritmo da sua rotina. Escolha um objetivo, diga quando você pode e a Pri encaixa cada etapa nos horários livres da sua semana.</p>

    {adopted && <Card className="flex items-center gap-3" selected>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-area-soft text-area-ink"><Check size={16}/></span>
      <p className="min-w-0 flex-1 text-body-s"><strong className="font-semibold">{adopted}</strong> está na sua rotina. As sessões aparecem em <Link href="/hoje" className="font-medium text-fg-1 underline underline-offset-2">Hoje</Link> nos dias combinados.</p>
      <IconButton label="Fechar aviso" size="sm" onClick={() => setAdopted(null)}><X size={16}/></IconButton>
    </Card>}

    {mine.length > 0 && <section>
      <SectionHeader className="mb-3" title="Seus planos"/>
      <div className="grid gap-3 md:grid-cols-2">
        {mine.map(item => <PlanCard key={item.id} item={item} today={today} confirming={confirmEnd === item.id}
          onAskEnd={() => setConfirmEnd(item.id)} onKeep={() => setConfirmEnd(null)} onEnd={() => endPlan(item)}/>)}
      </div>
    </section>}

    <section>
      <SectionHeader className="mb-3" title="Comece um plano"/>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ROUTINE_PLANS.map(template => {
          const Icon = icons[template.icon]
          return <button key={template.slug} onClick={() => setSelected(template)} className="group text-left">
            <div className="theme-dark relative h-full overflow-hidden rounded-card border border-white/10 p-5 transition duration-200 ease-ap group-hover:-translate-y-0.5" style={{ background: `linear-gradient(145deg,${template.color},#151713)` }}>
              <div className="flex items-start justify-between gap-3">
                <Icon size={24} className="text-white/70"/>
                {running.has(template.slug) && <Badge tone="solid">Em andamento</Badge>}
              </div>
              <p className="mt-10 text-h2 text-white">{template.title}</p>
              <p className="mt-2 text-body-s text-white/60">{template.tagline}</p>
              <p className="mt-5 text-label uppercase text-white/45">{template.area} · {template.weeks} semanas</p>
            </div>
          </button>
        })}
      </div>
    </section>

    <AnimatePresence>
      {selected && <RoutinePlanDialog key={selected.slug} template={selected} today={today}
        running={running.has(selected.slug)} onCancel={() => setSelected(null)} onAdopt={(habits, source) => adopt(selected, habits, source)}/>}
    </AnimatePresence>
  </div>
}
