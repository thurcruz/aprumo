'use client'

import { useState } from 'react'
import { CalendarRange, Target } from 'lucide-react'
import { dayBlocks, weekdays, type DayBlock, type Goal, type HabitFrequency, type Weekday } from '@/lib/types'
import { endFrom, isoDate, minutesBetween } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import FieldLabel from '@/components/ui/FieldLabel'
import Sheet from '@/components/ui/Sheet'
import { ToggleRow } from '@/components/ui/Switch'
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

  return <Sheet managed onClose={onCancel} eyebrow={heading} title="O que se repete?" description={description}
    footer={<div className="flex flex-col gap-2">
      <Button fullWidth disabled={!valid} onClick={save}>{confirmLabel}</Button>
      {skipLabel && <Button fullWidth variant="ghost" onClick={onCancel}>{skipLabel}</Button>}
    </div>}>
    <input autoFocus value={title} onChange={event => setTitle(event.target.value)} maxLength={160}
      className="field" placeholder="Ex.: Ler 10 páginas"/>

    <FieldLabel>Em quais dias da semana</FieldLabel>
    <div className="flex gap-1.5">
      {weekdays.map(day => <Chip key={day.id} shape="square" className="h-10" selected={days.includes(day.id)} onClick={() => toggleDay(day.id)} aria-label={day.label}>{day.short}</Chip>)}
    </div>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {[{ label: 'Todo dia', value: allDays }, { label: 'Dias de semana', value: weekdaysOnly }, { label: 'Fim de semana', value: weekendOnly }].map(preset => (
        <Chip key={preset.label} size="sm" selected={sameDays(days, preset.value)} onClick={() => setDays(preset.value)}>{preset.label}</Chip>
      ))}
    </div>
    {days.length === 0 && <p className="mt-2 text-caption text-alert">Escolha pelo menos um dia.</p>}

    <FieldLabel>Em que parte do dia</FieldLabel>
    <div className="flex flex-wrap gap-1.5">
      {dayBlocks.map(item => <Chip key={item.id} selected={block === item.id} onClick={() => setBlock(item.id)}>{item.label}</Chip>)}
    </div>

    <FieldLabel icon={CalendarRange}>Por quanto tempo</FieldLabel>
    <label className="block text-caption text-fg-2">Começa em
      <input type="date" className="field mt-1.5" value={startsOn} onChange={event => setStartsOn(event.target.value)}/>
    </label>
    <ToggleRow className="mt-3" checked={hasEnd} onChange={setHasEnd} title="Tem data para terminar"
      description={hasEnd ? 'Depois dessa data o hábito para de aparecer.' : 'Sem prazo — segue até você mudar de ideia.'}/>
    {hasEnd && <label className="mt-3 block text-caption text-fg-2">Termina em
      <input type="date" className="field mt-1.5" value={endsOn} min={startsOn} onChange={event => setEndsOn(event.target.value)}/>
    </label>}
    {endBeforeStart && <p className="mt-2 text-caption text-alert">A data final precisa vir depois do começo.</p>}

    <div className="mt-6">
      <TimeRange enabled={timed} start={start} end={end} onToggle={setTimed} onStart={setStart} onEnd={setEnd}/>
    </div>

    {/* Perguntar a meta aqui é o que impede o hábito de virar tarefa solta:
        este é o momento em que a pessoa sabe por que está se comprometendo. */}
    {goals.length > 0 && <>
      <FieldLabel icon={Target}>Serve a qual meta</FieldLabel>
      {lockGoal
        ? <p className="rounded-control border border-area-line bg-area-soft px-3 py-2.5 text-body-s text-area-ink">{goals.find(item => item.id === goalId)?.title}</p>
        : <div className="flex flex-wrap gap-1.5">
            <Chip selected={!goalId} onClick={() => setGoalId(undefined)}>Nenhuma</Chip>
            {goals.map(item => <Chip key={item.id} className="max-w-full" selected={goalId === item.id} onClick={() => setGoalId(item.id)}><span className="truncate">{item.title}</span></Chip>)}
          </div>}
    </>}
  </Sheet>
}
