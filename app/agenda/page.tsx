'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Plus, Repeat2, X } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import type { DayBlock, Task } from '@/lib/types'
import { capitalizeFirst, endTimeOf, indexEvents, isDoneOn, isoDate as iso, minutesBetween, parseDate as parse, taskShowsOn, weekStart } from '@/lib/utils'
import TimeRange from '@/components/modules/TimeRange'

type View = 'semana' | 'mes'

/** Ordena por horário; o que não tem hora marcada vai para o fim do dia. */
const byTime = (a: Task, b: Task) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')

function AgendaContent() {
  const params = useSearchParams()
  const { store, addTask, setTaskDone } = useAprumoStore()
  const today = iso(new Date())
  const [view, setView] = useState<View>('semana')
  const [selected, setSelected] = useState(() => {
    const requested = params.get('dia')
    return requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today
  })
  const [cursor, setCursor] = useState(() => parse(selected))
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [timed, setTimed] = useState(true)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [block, setBlock] = useState<DayBlock>('livre')

  const events = useMemo(() => indexEvents(store.taskEvents), [store.taskEvents])
  /**
   * Fonte única do que acontece num dia — a mesma regra que a página Hoje usa,
   * para as duas telas nunca discordarem sobre o que pertence à data.
   */
  const tasksOn = useMemo(() => (day: string) => store.tasks.filter(task => taskShowsOn(task, day, events)).sort(byTime), [store.tasks, events])
  /** Navegando por semanas e meses, a conclusão precisa ser a daquele dia. */
  const doneOn = (task: Task, day: string) => isDoneOn(events, task.id, day)

  const week = useMemo(() => {
    const start = weekStart(cursor)
    return Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date })
  }, [cursor])

  const monthDays = useMemo(() => {
    const start = weekStart(new Date(cursor.getFullYear(), cursor.getMonth(), 1))
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date })
  }, [cursor])

  const dayTasks = tasksOn(selected)

  /** Navega de semana em semana ou de mês em mês, conforme a visão aberta. */
  function shift(direction: 1 | -1) {
    setCursor(current => {
      const next = new Date(current)
      if (view === 'semana') next.setDate(next.getDate() + 7 * direction)
      else next.setMonth(next.getMonth() + direction, 1)
      return next
    })
  }

  function goToday() { setSelected(today); setCursor(new Date()) }

  function pick(date: Date) {
    setSelected(iso(date))
    if (view === 'mes' && date.getMonth() !== cursor.getMonth()) setCursor(new Date(date.getFullYear(), date.getMonth(), 1))
  }

  function create() {
    if (title.trim().length < 2) return
    addTask({ id: crypto.randomUUID(), title: title.trim(), category: 'hoje', completed: false, createdAt: new Date().toISOString(), scheduledDate: selected, startTime: timed ? start : undefined, durationMinutes: timed ? minutesBetween(start, end) : undefined, dayBlock: block, priority: 2, source: 'manual' })
    setTitle(''); setOpen(false)
  }

  const toggle = (task: Task) => setTaskDone(task, selected, !doneOn(task, selected))

  // capitalizeFirst, não CSS text-transform: capitalize — que maiuscularia cada
  // palavra ("De Setembro"), errado em português.
  const periodLabel = capitalizeFirst(view === 'semana'
    ? `${week[0].getDate()} – ${week[6].getDate()} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(week[6])}`
    : new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(cursor))

  return <div className="page-wrap">
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <Link href="/hoje" className="muted mb-5 inline-flex items-center gap-2 text-sm no-underline"><ArrowLeft size={15}/> Voltar para Hoje</Link>
        <p className="eyebrow">Tempo com intenção</p>
        <h1 className="display mt-3 text-4xl font-semibold md:text-6xl">Agenda</h1>
        <p className="muted mt-4">Tarefas, hábitos e compromissos organizados no mesmo lugar.</p>
      </div>
      <button className="energy-button flex items-center gap-2 px-5 py-3" onClick={() => setOpen(true)}><Plus size={17}/> Agendar</button>
    </header>

    <section className="mt-9 flex flex-wrap items-center gap-3">
      <div className="flex gap-1 rounded-full border p-1" style={{ borderColor: 'var(--line)' }}>
        {(['semana', 'mes'] as View[]).map(item => <button key={item} onClick={() => setView(item)}
          className="rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition"
          style={{ background: view === item ? 'var(--energy)' : 'transparent', color: view === item ? '#11130f' : 'var(--muted)' }}>{item === 'mes' ? 'Mês' : 'Semana'}</button>)}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button aria-label="Anterior" className="icon-button h-9 w-9" onClick={() => shift(-1)}><ChevronLeft size={17}/></button>
        <strong className="min-w-40 text-center text-sm">{periodLabel}</strong>
        <button aria-label="Próximo" className="icon-button h-9 w-9" onClick={() => shift(1)}><ChevronRight size={17}/></button>
        <button onClick={goToday} className="rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>Hoje</button>
      </div>
    </section>

    {view === 'semana'
      ? <section className="mt-5 grid gap-1.5 sm:grid-cols-7">
          {week.map(date => {
            const value = iso(date)
            const active = value === selected
            const list = tasksOn(value)
            return <button key={value} onClick={() => pick(date)}
              className="flex flex-col gap-2 rounded-2xl border p-3 text-left transition"
              style={{ borderColor: active ? 'var(--energy)' : 'var(--line)', background: active ? 'rgba(208,224,39,.06)' : 'transparent' }}>
              <div className="flex items-baseline justify-between">
                <small className="text-[10px] font-bold uppercase" style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}>{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date)}</small>
                <strong className="text-sm" style={{ color: value === today ? 'var(--accent)' : 'var(--ink)' }}>{date.getDate()}</strong>
              </div>
              <div className="space-y-1">
                {list.slice(0, 3).map(task => <p key={task.id} className="muted truncate text-[11px]">{task.startTime ? `${task.startTime} ` : ''}{task.title}</p>)}
                {list.length > 3 && <p className="text-[11px] text-energy">+{list.length - 3}</p>}
                {list.length === 0 && <p className="muted text-[11px] opacity-50">livre</p>}
              </div>
            </button>
          })}
        </section>
      : <section className="surface mt-5 p-4 md:p-6">
          <div className="grid grid-cols-7 gap-1 text-center">
            {['S','T','Q','Q','S','S','D'].map((label, index) => <small key={index} className="muted pb-2 text-[10px] font-bold">{label}</small>)}
            {monthDays.map(date => {
              const value = iso(date)
              const outside = date.getMonth() !== cursor.getMonth()
              const count = tasksOn(value).length
              return <button key={value} onClick={() => pick(date)}
                className="flex aspect-square flex-col items-center justify-center rounded-xl border text-xs transition"
                style={{ borderColor: value === selected ? 'var(--energy)' : 'transparent', background: value === today ? 'rgb(var(--fg-rgb) / .05)' : 'transparent', color: outside ? 'rgb(var(--fg-rgb) / .2)' : 'var(--ink)' }}>
                {date.getDate()}
                <span className="mt-0.5 h-1 w-1 rounded-full" style={{ background: count > 0 && !outside ? 'var(--energy)' : 'transparent' }}/>
              </button>
            })}
          </div>
        </section>}

    <section className="surface mt-5 overflow-hidden p-5 md:p-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(parse(selected))}</p>
          <h2 className="mt-2 text-2xl font-semibold">{dayTasks.length === 0 ? 'Dia livre' : `${dayTasks.length} ${dayTasks.length === 1 ? 'item' : 'itens'} no dia`}</h2>
        </div>
        <CalendarDays className="shrink-0 text-energy"/>
      </div>
      <div className="agenda-timeline">
        {dayTasks.length === 0
          ? <div className="py-16 text-center"><CalendarDays className="mx-auto text-energy"/><p className="mt-4 font-semibold">Nada agendado</p><p className="muted mt-1 text-sm">Agende algo ou preserve este espaço.</p></div>
          : dayTasks.map(task => <article key={task.id} className={doneOn(task, selected) ? 'done' : ''}>
              <time>{task.startTime ?? 'Livre'}</time>
              <button onClick={() => toggle(task)}>
                <span>{doneOn(task, selected) && <Check size={13}/>}</span>
                <div>
                  <strong>{task.title}</strong>
                  <small>
                    {task.category === 'fixa' ? <><Repeat2 size={11}/> Hábito</> : <><Clock3 size={11}/> Tarefa</>}
                    {task.startTime && endTimeOf(task) ? ` · até ${endTimeOf(task)}` : ' · sem hora marcada'}
                  </small>
                </div>
              </button>
            </article>)}
      </div>
    </section>

    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="surface w-full max-w-md p-6" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div><p className="eyebrow">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(parse(selected))}</p><h2 className="mt-1 text-2xl font-semibold">Agendar compromisso</h2></div>
          <button className="icon-button" onClick={() => setOpen(false)} aria-label="Fechar"><X size={18}/></button>
        </div>
        <input autoFocus className="field mt-6" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} placeholder="O que você vai fazer?"/>
        <div className="mt-4">
          <TimeRange enabled={timed} start={start} end={end} onToggle={setTimed} onStart={setStart} onEnd={setEnd}
            offHint="Sem horário — fica no período do dia."/>
        </div>
        <p className="muted mb-2 mt-4 text-xs">Período do dia</p>
        <div className="flex flex-wrap gap-1.5">
          {(['manha','tarde','noite','livre'] as DayBlock[]).map(item => <button key={item} onClick={() => setBlock(item)}
            className="rounded-full border px-3 py-2 text-xs transition"
            style={{ borderColor: block === item ? 'var(--energy)' : 'var(--line)', background: block === item ? 'var(--energy)' : 'transparent', color: block === item ? '#11130f' : 'var(--muted)' }}>{item === 'manha' ? 'Manhã' : item === 'livre' ? 'Sem horário' : capitalizeFirst(item)}</button>)}
        </div>
        <p className="muted mt-5 text-xs">Precisa que se repita toda semana? Crie como <Link href="/tarefas" className="text-energy no-underline">hábito</Link>.</p>
        <button className="energy-button mt-4 w-full py-3" onClick={create}>Salvar na agenda</button>
      </div>
    </div>}
  </div>
}

export default function AgendaPage() {
  return <Suspense fallback={null}><AgendaContent/></Suspense>
}
