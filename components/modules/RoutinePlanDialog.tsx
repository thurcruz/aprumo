'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import FieldLabel from '@/components/ui/FieldLabel'
import Sheet from '@/components/ui/Sheet'
import { ToggleRow } from '@/components/ui/Switch'
import { PRI_BILLING_CTA, type PriCta } from '@/lib/pri'
import { defaultAnswers, type PlanAnswers, type PlanHabit, type RoutinePlanTemplate } from '@/lib/routine-plans'
import { dayBlocks, weekdays, type TaskSource, type Weekday } from '@/lib/types'
import { describeFrequency, describeSpan, endFrom } from '@/lib/utils'

interface Preview { habits: PlanHabit[]; source: TaskSource; summary?: string }

/** Uma etapa do plano, na vitrine e na prévia. */
const stageClass = 'rounded-control border border-line bg-surface-2 p-3'

function Section({ label, children }: { label: string; children: ReactNode }) {
  return <div className="mt-6">
    <FieldLabel className="mt-0">{label}</FieldLabel>
    {children}
  </div>
}

/**
 * Monta um plano pronto: a pessoa diz quando pode, confere a prévia e só então
 * as etapas viram hábitos. Começar um plano é de todo mundo: a Pri encaixa o
 * plano na rotina (gasta crédito) e o plano padrão, já moldado pelas respostas,
 * fica como alternativa sem crédito.
 */
export default function RoutinePlanDialog({ template, today, running, onCancel, onAdopt }: {
  template: RoutinePlanTemplate
  today: string
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
  if (preview) {
    body = <>
      {preview.summary && <div className="mb-5 rounded-card border border-line bg-surface-2 p-4">
        <p className="flex items-center gap-1.5 text-label uppercase text-fg-1"><span aria-hidden>✦</span> O que a Pri ajustou</p>
        <p className="mt-1.5 text-body-s text-fg-1">{preview.summary}</p>
      </div>}
      <ol className="space-y-2">
        {preview.habits.map((habit, index) => <li key={index} className={stageClass}>
          <p className="text-body-s font-medium text-fg-1">{habit.title}</p>
          <p className="mt-1 text-caption text-fg-2">
            {describeFrequency({ days: habit.days })} · {habit.startTime
              ? `${habit.startTime}–${endFrom(habit.startTime, habit.durationMinutes)}`
              : `${dayBlocks.find(block => block.id === habit.dayBlock)?.label ?? 'Sem horário'}, ${habit.durationMinutes} min`}
          </p>
          <p className="text-caption text-fg-2">{describeSpan({ startsOn: habit.startsOn, endsOn: habit.endsOn })}</p>
        </li>)}
      </ol>
      <p className="mt-4 text-caption text-fg-2">Cada etapa vira um hábito na sua agenda e aparece em Hoje nos dias combinados. Dá para editar ou encerrar quando quiser.</p>
      <div className="mt-5 flex flex-col gap-2">
        <Button fullWidth onClick={() => onAdopt(preview.habits, preview.source)}>Adicionar à minha rotina</Button>
        <Button fullWidth variant="ghost" icon={<ArrowLeft size={15}/>} onClick={() => setPreview(null)}>Voltar e ajustar</Button>
      </div>
    </>
  } else {
    body = <>
      <p className="text-body-s text-fg-2">{template.description}</p>
      {running && <p className="mt-3 rounded-control border border-area-line bg-area-soft px-3 py-2 text-caption text-area-ink">Você já tem este plano em andamento. Adotar de novo cria um segundo.</p>}

      {template.levels && <Section label="Seu ponto de partida">
        <div className="flex flex-wrap gap-1.5">
          {([['iniciante', 'Começando do zero'], ['intermediario', 'Já pratico']] as const).map(([level, label]) =>
            <Chip key={level} selected={answers.level === level} onClick={() => set({ level })}>{label}</Chip>)}
        </div>
      </Section>}

      <Section label="Em quais dias você pode">
        <div className="flex gap-1.5">
          {weekdays.map(day => <Chip key={day.id} shape="square" className="h-10" selected={answers.days.includes(day.id)} onClick={() => toggleDay(day.id)} aria-label={day.label}>{day.short}</Chip>)}
        </div>
        {answers.days.length === 0 && <p className="mt-2 text-caption text-alert">Escolha pelo menos um dia.</p>}
      </Section>

      <Section label="Em que parte do dia">
        <div className="flex flex-wrap gap-1.5">
          {dayBlocks.map(block => <Chip key={block.id} selected={answers.dayBlock === block.id} onClick={() => set({ dayBlock: block.id })}>{block.label}</Chip>)}
        </div>
        <ToggleRow className="mt-3" checked={timed} onChange={setTimed} title="Horário fixo"
          description={timed ? 'As sessões entram na agenda neste horário.' : 'Sem horário — fica no período escolhido.'}/>
        {timed && <input type="time" className="field mt-3" value={answers.startTime ?? '07:00'} onChange={event => set({ startTime: event.target.value })}/>}
      </Section>

      {template.minutesOptions.length > 0 && <Section label="Quanto tempo por sessão">
        <div className="flex flex-wrap gap-1.5">
          {template.minutesOptions.map(minutes => <Chip key={minutes} selected={answers.minutes === minutes} onClick={() => set({ minutes })}>{minutes} min</Chip>)}
        </div>
      </Section>}

      <Section label="Começa em">
        <input type="date" className="field" value={answers.startsOn} min={today} onChange={event => set({ startsOn: event.target.value })}/>
      </Section>

      <Section label="Algo que a Pri deve saber? (opcional)">
        <textarea value={answers.note ?? ''} onChange={event => set({ note: event.target.value })} maxLength={400}
          className="field min-h-17.5 resize-none" placeholder="Ex.: tenho reunião toda terça às 7h; joelho sensível"/>
      </Section>

      {error && <div className="mt-5 rounded-control border border-alert/30 p-3 text-body-s">
        <p className="text-fg-1">{error.message}</p>
        {error.cta && <Link href={error.cta.href} className="mt-2 inline-block text-body-s font-medium text-fg-1 underline underline-offset-2">{error.cta.label}</Link>}
      </div>}

      <div className="mt-6 flex flex-col gap-2">
        <Button fullWidth onClick={adapt} disabled={!valid} loading={loading} icon={<Sparkles size={16}/>}>
          {loading ? 'A Pri está encaixando na sua rotina…' : 'Adaptar à minha rotina com a Pri'}
        </Button>
        <Button fullWidth variant="secondary" onClick={showDefault} disabled={!valid || loading}>Montar sem a Pri (não usa crédito)</Button>
      </div>
    </>
  }

  return <Sheet managed onClose={onCancel} size="lg" eyebrow={eyebrow} title={template.title}>
    {body}
  </Sheet>
}
