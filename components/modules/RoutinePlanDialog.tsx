'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react'
import { PlusBadge } from '@/components/plus/PlusGate'
import { PRI_BILLING_CTA, type PriCta } from '@/lib/pri'
import { defaultAnswers, type PlanAnswers, type PlanHabit, type RoutinePlanTemplate } from '@/lib/routine-plans'
import { dayBlocks, weekdays, type TaskSource, type Weekday } from '@/lib/types'
import { describeFrequency, describeSpan, endFrom } from '@/lib/utils'

interface Preview { habits: PlanHabit[]; source: TaskSource; summary?: string }

const chip = (active: boolean) => ({
  borderColor: active ? 'var(--energy)' : 'var(--line)',
  background: active ? 'var(--energy)' : 'transparent',
  color: active ? '#11130f' : 'var(--muted)',
})

function Section({ label, children }: { label: string; children: ReactNode }) {
  return <div className="mt-6">
    <p className="muted mb-2 text-xs font-semibold uppercase tracking-wider">{label}</p>
    {children}
  </div>
}

/**
 * Monta um plano pronto: a pessoa diz quando pode, confere a prévia e só então
 * as etapas viram hábitos. Planos são do Aprumo+: quem é Free vê as etapas e o
 * convite para assinar. Para quem assina, a Pri encaixa o plano na rotina — e o
 * plano padrão, já moldado pelas respostas, fica como alternativa sem crédito.
 */
export default function RoutinePlanDialog({ template, today, isPlus, planLoading, running, onCancel, onAdopt }: {
  template: RoutinePlanTemplate
  today: string
  isPlus: boolean
  planLoading: boolean
  /** Já existe um plano deste modelo em andamento. */
  running: boolean
  onCancel: () => void
  onAdopt: (habits: PlanHabit[], source: TaskSource) => void
}) {
  const [answers, setAnswers] = useState<PlanAnswers>(() => defaultAnswers(template, today))
  const [timed, setTimed] = useState(Boolean(template.defaults.startTime))
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; cta?: PriCta } | null>(null)

  const set = (patch: Partial<PlanAnswers>) => setAnswers(current => ({ ...current, ...patch }))
  const toggleDay = (day: Weekday) => set({ days: answers.days.includes(day) ? answers.days.filter(item => item !== day) : [...answers.days, day].sort((a, b) => a - b) })
  const final: PlanAnswers = { ...answers, startTime: timed ? answers.startTime ?? '07:00' : undefined, note: answers.note?.trim() || undefined }
  const valid = answers.days.length > 0 && Boolean(answers.startsOn)

  function showDefault() {
    if (!valid) return
    setError(null)
    setPreview({ habits: template.build(final), source: 'manual' })
  }

  async function adapt() {
    if (!valid || loading) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/routine-plans/adapt', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: template.slug, answers: final }),
      })
      const data = await response.json().catch(() => null) as { habits?: PlanHabit[]; summary?: string; error?: string; code?: string } | null
      if (!response.ok || !data?.habits?.length) {
        setError({ message: data?.error ?? 'A Pri não conseguiu montar agora. Tente de novo em instantes.', cta: data?.code ? PRI_BILLING_CTA[data.code] : undefined })
        return
      }
      setPreview({ habits: data.habits, source: 'ai', summary: data.summary || undefined })
    } catch {
      setError({ message: 'A conexão falhou. Tente novamente em instantes.' })
    } finally {
      setLoading(false)
    }
  }

  const eyebrow = preview ? (preview.source === 'ai' ? 'Adaptado pela Pri' : 'Plano padrão') : `${template.area} · ${template.weeks} semanas`

  let body: ReactNode
  if (planLoading) {
    body = <div className="mt-6 animate-pulse space-y-2"><div className="h-3 w-2/3 rounded bg-white/10"/><div className="h-3 w-1/2 rounded bg-white/5"/></div>
  } else if (!isPlus) {
    // A vitrine mostra o que tem dentro: as etapas no formato padrão.
    const stages = template.build(defaultAnswers(template, today))
    body = <>
      <p className="muted mt-3 text-sm">{template.description}</p>
      <Section label="As etapas">
        <ol className="space-y-2">
          {stages.map((habit, index) => <li key={index} className="rounded-2xl border p-3" style={{ borderColor: 'var(--line)' }}>
            <p className="text-sm">{habit.title}</p>
            <p className="muted mt-0.5 text-xs">{describeFrequency({ days: habit.days })} · {habit.durationMinutes} min</p>
          </li>)}
        </ol>
      </Section>
      <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'rgba(208,224,39,.4)' }}>
        <PlusBadge/>
        <p className="mt-2 text-sm font-semibold">Planos fazem parte do Aprumo+</p>
        <p className="muted mt-1 text-xs">A Pri lê sua agenda, encaixa cada sessão nos horários livres e ajusta o plano ao seu ponto de partida.</p>
        <Link href="/configuracoes?tab=aprumo-plus" className="mt-4 inline-flex items-center gap-2 rounded-full bg-energy px-4 py-2 text-sm font-semibold text-[#11130f] no-underline">Desbloquear com Aprumo+ <ArrowRight size={15}/></Link>
      </div>
    </>
  } else if (preview) {
    body = <>
      {preview.summary && <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: 'rgba(208,224,39,.4)' }}>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-energy"><Sparkles size={13}/> O que a Pri ajustou</p>
        <p className="mt-1 text-sm leading-relaxed">{preview.summary}</p>
      </div>}
      <ol className="mt-5 space-y-2">
        {preview.habits.map((habit, index) => <li key={index} className="rounded-2xl border p-3" style={{ borderColor: 'var(--line)' }}>
          <p className="text-sm font-semibold">{habit.title}</p>
          <p className="muted mt-1 text-xs">
            {describeFrequency({ days: habit.days })} · {habit.startTime
              ? `${habit.startTime}–${endFrom(habit.startTime, habit.durationMinutes)}`
              : `${dayBlocks.find(block => block.id === habit.dayBlock)?.label ?? 'Sem horário'}, ${habit.durationMinutes} min`}
          </p>
          <p className="muted text-xs">{describeSpan({ startsOn: habit.startsOn, endsOn: habit.endsOn })}</p>
        </li>)}
      </ol>
      <p className="muted mt-4 text-xs">Cada etapa vira um hábito na sua agenda e aparece em Hoje nos dias combinados. Dá para editar ou encerrar quando quiser.</p>
      <button onClick={() => onAdopt(preview.habits, preview.source)} className="energy-button mt-5 w-full py-3">Adicionar à minha rotina</button>
      <button onClick={() => setPreview(null)} className="muted mt-2 flex w-full items-center justify-center gap-2 rounded-full border py-2.5 text-sm" style={{ borderColor: 'var(--line)' }}><ArrowLeft size={15}/> Voltar e ajustar</button>
    </>
  } else {
    body = <>
      <p className="muted mt-3 text-sm">{template.description}</p>
      {running && <p className="mt-3 rounded-2xl border px-3 py-2 text-xs" style={{ borderColor: 'rgba(208,224,39,.4)', color: 'var(--accent)' }}>Você já tem este plano em andamento. Adotar de novo cria um segundo.</p>}

      {template.levels && <Section label="Seu ponto de partida">
        <div className="flex flex-wrap gap-1.5">
          {([['iniciante', 'Começando do zero'], ['intermediario', 'Já pratico']] as const).map(([level, label]) =>
            <button key={level} onClick={() => set({ level })} className="rounded-full border px-3 py-2 text-xs transition" style={chip(answers.level === level)}>{label}</button>)}
        </div>
      </Section>}

      <Section label="Em quais dias você pode">
        <div className="flex gap-1.5">
          {weekdays.map(day => <button key={day.id} onClick={() => toggleDay(day.id)} aria-pressed={answers.days.includes(day.id)} aria-label={day.label}
            className="grid h-10 flex-1 place-items-center rounded-xl border text-xs font-bold transition" style={chip(answers.days.includes(day.id))}>{day.short}</button>)}
        </div>
        {answers.days.length === 0 && <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>Escolha pelo menos um dia.</p>}
      </Section>

      <Section label="Em que parte do dia">
        <div className="flex flex-wrap gap-1.5">
          {dayBlocks.map(block => <button key={block.id} onClick={() => set({ dayBlock: block.id })} className="rounded-full border px-3 py-2 text-xs transition" style={chip(answers.dayBlock === block.id)}>{block.label}</button>)}
        </div>
        <button onClick={() => setTimed(value => !value)} className="mt-3 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition" style={{ borderColor: timed ? 'rgba(208,224,39,.4)' : 'var(--line)' }}>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Horário fixo</span>
            <span className="muted block text-xs">{timed ? 'As sessões entram na agenda neste horário.' : 'Sem horário — fica no período escolhido.'}</span>
          </span>
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border" style={{ borderColor: timed ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .2)', background: timed ? 'var(--energy)' : 'transparent' }}/>
        </button>
        {timed && <input type="time" className="field mt-3" value={answers.startTime ?? '07:00'} onChange={event => set({ startTime: event.target.value })}/>}
      </Section>

      {template.minutesOptions.length > 0 && <Section label="Quanto tempo por sessão">
        <div className="flex flex-wrap gap-1.5">
          {template.minutesOptions.map(minutes => <button key={minutes} onClick={() => set({ minutes })} className="rounded-full border px-3 py-2 text-xs transition" style={chip(answers.minutes === minutes)}>{minutes} min</button>)}
        </div>
      </Section>}

      <Section label="Começa em">
        <input type="date" className="field" value={answers.startsOn} min={today} onChange={event => set({ startsOn: event.target.value })}/>
      </Section>

      <Section label="Algo que a Pri deve saber? (opcional)">
        <textarea value={answers.note ?? ''} onChange={event => set({ note: event.target.value })} maxLength={400}
          className="field min-h-[70px] resize-none" placeholder="Ex.: tenho reunião toda terça às 7h; joelho sensível"/>
      </Section>

      {error && <div className="mt-5 rounded-2xl border p-3 text-sm" style={{ borderColor: 'var(--danger)' }}>
        <p>{error.message}</p>
        {error.cta && <Link href={error.cta.href} className="mt-2 inline-block text-sm font-semibold text-energy">{error.cta.label}</Link>}
      </div>}

      <div className="mt-6 space-y-2">
        <button onClick={adapt} disabled={!valid || loading} className="energy-button flex w-full items-center justify-center gap-2 py-3" style={{ opacity: valid && !loading ? 1 : .45 }}>
          <Sparkles size={16}/> {loading ? 'A Pri está encaixando na sua rotina…' : 'Adaptar à minha rotina com a Pri'}
        </button>
        <button onClick={showDefault} disabled={!valid || loading} className="muted w-full rounded-full border py-2.5 text-sm" style={{ borderColor: 'var(--line)' }}>Montar sem a Pri (não usa crédito)</button>
      </div>
    </>
  }

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
    <motion.div initial={{ scale: .96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 16 }}
      className="surface my-auto w-full max-w-lg p-6" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold">{template.title}</h2>
        </div>
        <button className="icon-button shrink-0" onClick={onCancel} aria-label="Fechar"><X size={18}/></button>
      </div>
      {body}
    </motion.div>
  </motion.div>
}
