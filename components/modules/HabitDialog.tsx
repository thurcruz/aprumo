'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarRange, Target, X } from 'lucide-react'
import { dayBlocks, weekdays, type DayBlock, type Goal, type HabitFrequency, type Weekday } from '@/lib/types'
import { endFrom, isoDate, minutesBetween } from '@/lib/utils'
import TimeRange from './TimeRange'

export interface HabitDraft {
  title: string
  dayBlock: DayBlock
  frequency: HabitFrequency
  startTime?: string
  durationMinutes?: number
  /** A meta que este hábito serve. Opcional: nem todo hábito persegue um destino. */
  goalId?: string
}

const allDays = weekdays.map(day => day.id)
const weekdaysOnly: Weekday[] = [1, 2, 3, 4, 5]
const weekendOnly: Weekday[] = [0, 6]
const sameDays = (a: Weekday[], b: Weekday[]) => a.length === b.length && a.every(day => b.includes(day))

/**
 * Configura um hábito: o que se repete, em que dias da semana, por quanto tempo
 * ele vale e — se for um compromisso — entre que horas. Data de término e hora
 * são opcionais de propósito: a maioria dos hábitos não tem prazo nem horário,
 * e exigir os dois travaria a criação à toa.
 */
export default function HabitDialog({ heading, description, confirmLabel, initial, goals = [], lockGoal, skipLabel, onCancel, onSave }: {
  heading: string
  description?: string
  confirmLabel: string
  initial: Partial<HabitDraft>
  /** Metas oferecidas no seletor. Vazio esconde a seção inteira. */
  goals?: Goal[]
  /** Quando o hábito nasce de uma meta, o vínculo não se escolhe: já está dado. */
  lockGoal?: boolean
  /** Rótulo do escape, quando o passo é pulável (ex.: logo após criar a meta). */
  skipLabel?: string
  onCancel: () => void
  onSave: (draft: HabitDraft) => void
}) {
  const [title, setTitle] = useState(initial.title ?? '')
  const [block, setBlock] = useState<DayBlock>(initial.dayBlock ?? 'manha')
  const [days, setDays] = useState<Weekday[]>(initial.frequency?.days?.length ? initial.frequency.days : allDays)
  const [startsOn, setStartsOn] = useState(initial.frequency?.startsOn ?? isoDate(new Date()))
  const [goalId, setGoalId] = useState<string|undefined>(initial.goalId)
  const [hasEnd, setHasEnd] = useState(Boolean(initial.frequency?.endsOn))
  const [endsOn, setEndsOn] = useState(initial.frequency?.endsOn ?? '')
  const [timed, setTimed] = useState(Boolean(initial.startTime))
  const [start, setStart] = useState(initial.startTime ?? '07:00')
  const [end, setEnd] = useState(() => endFrom(initial.startTime, initial.durationMinutes))

  const toggleDay = (day: Weekday) => setDays(current => current.includes(day) ? current.filter(item => item !== day) : [...current, day])
  const endBeforeStart = hasEnd && Boolean(endsOn) && endsOn < startsOn
  const valid = title.trim().length >= 2 && days.length > 0 && !endBeforeStart && (!hasEnd || Boolean(endsOn))

  function save() {
    if (!valid) return
    onSave({
      title: title.trim(),
      dayBlock: block,
      frequency: {
        ...(days.length < 7 ? { days: [...days].sort() } : {}),
        startsOn,
        ...(hasEnd && endsOn ? { endsOn } : {}),
      },
      startTime: timed ? start : undefined,
      durationMinutes: timed ? minutesBetween(start, end) : undefined,
      goalId,
    })
  }

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
    <motion.div initial={{ scale: .96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 16 }}
      className="surface my-auto w-full max-w-md p-6" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{heading}</p>
          <h2 className="mt-1 text-2xl font-semibold">O que se repete?</h2>
        </div>
        <button className="icon-button shrink-0" onClick={onCancel} aria-label="Fechar"><X size={18}/></button>
      </div>
      {description && <p className="muted mt-3 text-sm">{description}</p>}

      <input autoFocus value={title} onChange={event => setTitle(event.target.value)} maxLength={160}
        className="field mt-6" placeholder="Ex.: Ler 10 páginas"/>

      <p className="muted mb-2 mt-6 text-xs font-semibold uppercase tracking-wider">Em quais dias da semana</p>
      <div className="flex gap-1.5">
        {weekdays.map(day => {
          const active = days.includes(day.id)
          return <button key={day.id} onClick={() => toggleDay(day.id)} aria-pressed={active} aria-label={day.label}
            className="grid h-10 flex-1 place-items-center rounded-xl border text-xs font-bold transition"
            style={{ borderColor: active ? 'var(--energy)' : 'var(--line)', background: active ? 'var(--energy)' : 'transparent', color: active ? '#11130f' : 'var(--muted)' }}>{day.short}</button>
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[{ label: 'Todo dia', value: allDays }, { label: 'Dias de semana', value: weekdaysOnly }, { label: 'Fim de semana', value: weekendOnly }].map(preset => (
          <button key={preset.label} onClick={() => setDays(preset.value)}
            className="rounded-full border px-3 py-1 text-xs transition"
            style={{ borderColor: sameDays(days, preset.value) ? 'var(--energy)' : 'var(--line)', color: sameDays(days, preset.value) ? 'var(--accent)' : 'var(--muted)' }}>{preset.label}</button>
        ))}
      </div>
      {days.length === 0 && <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>Escolha pelo menos um dia.</p>}

      <p className="muted mb-2 mt-6 text-xs font-semibold uppercase tracking-wider">Em que parte do dia</p>
      <div className="flex flex-wrap gap-1.5">
        {dayBlocks.map(item => <button key={item.id} onClick={() => setBlock(item.id)}
          className="rounded-full border px-3 py-2 text-xs transition"
          style={{ borderColor: block === item.id ? 'var(--energy)' : 'var(--line)', background: block === item.id ? 'var(--energy)' : 'transparent', color: block === item.id ? '#11130f' : 'var(--muted)' }}>{item.label}</button>)}
      </div>

      <p className="muted mb-2 mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"><CalendarRange size={13}/> Por quanto tempo</p>
      <label className="muted block text-xs">Começa em
        <input type="date" className="field mt-2" value={startsOn} onChange={event => setStartsOn(event.target.value)}/>
      </label>
      <button onClick={() => setHasEnd(value => !value)}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition"
        style={{ borderColor: hasEnd ? 'rgba(208,224,39,.4)' : 'var(--line)' }}>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Tem data para terminar</span>
          <span className="muted block text-xs">{hasEnd ? 'Depois dessa data o hábito para de aparecer.' : 'Sem prazo — segue até você mudar de ideia.'}</span>
        </span>
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border" style={{ borderColor: hasEnd ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .2)', background: hasEnd ? 'var(--energy)' : 'transparent' }}/>
      </button>
      {hasEnd && <label className="muted mt-3 block text-xs">Termina em
        <input type="date" className="field mt-2" value={endsOn} min={startsOn} onChange={event => setEndsOn(event.target.value)}/>
      </label>}
      {endBeforeStart && <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>A data final precisa vir depois do começo.</p>}

      <div className="mt-6">
        <TimeRange enabled={timed} start={start} end={end} onToggle={setTimed} onStart={setStart} onEnd={setEnd}/>
      </div>

      {/* Perguntar a meta aqui é o que impede o hábito de virar tarefa solta:
          este é o momento em que a pessoa sabe por que está se comprometendo. */}
      {goals.length > 0 && <>
        <p className="muted mb-2 mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"><Target size={13}/> Serve a qual meta</p>
        {lockGoal
          ? <p className="rounded-2xl border px-3 py-2.5 text-sm" style={{ borderColor: 'rgba(208,224,39,.4)', color: 'var(--accent)' }}>{goals.find(item => item.id === goalId)?.title}</p>
          : <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setGoalId(undefined)}
                className="rounded-full border px-3 py-2 text-xs transition"
                style={{ borderColor: !goalId ? 'var(--energy)' : 'var(--line)', background: !goalId ? 'var(--energy)' : 'transparent', color: !goalId ? '#11130f' : 'var(--muted)' }}>Nenhuma</button>
              {goals.map(item => <button key={item.id} onClick={() => setGoalId(item.id)}
                className="max-w-full truncate rounded-full border px-3 py-2 text-xs transition"
                style={{ borderColor: goalId === item.id ? 'var(--energy)' : 'var(--line)', background: goalId === item.id ? 'var(--energy)' : 'transparent', color: goalId === item.id ? '#11130f' : 'var(--muted)' }}>{item.title}</button>)}
            </div>}
      </>}

      <button onClick={save} disabled={!valid} className="energy-button mt-6 w-full py-3" style={{ opacity: valid ? 1 : .45 }}>{confirmLabel}</button>
      {skipLabel && <button onClick={onCancel} className="muted mt-2 w-full rounded-full border py-2.5 text-sm" style={{ borderColor: 'var(--line)' }}>{skipLabel}</button>}
    </motion.div>
  </motion.div>
}
