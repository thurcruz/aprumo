'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check, Coffee, Pause, Play, Plus, Repeat, RotateCcw, Share2, SlidersHorizontal, Square, Target, Timer, X } from 'lucide-react'
import RadialTimer, { type RadialTimerStatus } from '@/components/data/RadialTimer'
import Widget from '@/components/data/Widget'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Chip from '@/components/ui/Chip'
import EmptyState from '@/components/ui/EmptyState'
import FieldLabel from '@/components/ui/FieldLabel'
import IconButton from '@/components/ui/IconButton'
import PageHeader from '@/components/ui/PageHeader'
import SectionHeader from '@/components/ui/SectionHeader'
import Sheet from '@/components/ui/Sheet'
import { ToggleRow } from '@/components/ui/Switch'
import { useAprumoStore } from '@/lib/store'
import type { FocusSession } from '@/lib/types'
import ShareSessionDialog from '@/components/modules/ShareSessionDialog'
import { isShareable } from '@/lib/share'
import { formatFocusMinutes } from '@/lib/radial'
import { indexEvents, isDoneOn, isoDate } from '@/lib/utils'
import { enter } from '@/lib/motion'

type ActiveSession = { id: string; startedAt: string; plannedMinutes: number; commitmentId?: string }
type Phase = 'focus' | 'break'

const focusPresets = [15, 25, 45, 60]
const breakPresets = [5, 10, 15]
const MAX_MINUTES = 240
/** Quanto o "+5 min" estende a etapa em curso. */
const EXTRA_SECONDS = 5 * 60
/** Quanto tempo o anel fica fechado comemorando antes de mostrar a próxima etapa. */
const CELEBRATION_MS = 2600

/** Controle secundário: ícone em círculo com a legenda embaixo — alvo de 44px, visual discreto. */
function SecondaryAction({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled}
    className="group flex w-16 flex-col items-center gap-1.5 text-fg-2 transition-colors disabled:pointer-events-none disabled:opacity-35">
    <span className="grid h-11 w-11 place-items-center rounded-full border border-line transition-colors duration-200 ease-ap group-hover:border-line-strong group-hover:text-fg-1 group-active:bg-surface-pressed">{icon}</span>
    <span className="text-[11px] leading-none">{label}</span>
  </button>
}

// useSearchParams() exige um limite de Suspense para a página poder ser pré-renderizada.
export default function FocoPage() {
  return <Suspense fallback={null}><Foco/></Suspense>
}

function Foco() {
  const { store, saveFocusSession, setTaskDone } = useAprumoStore()
  /** Foco aberto a partir de uma tarefa ou hábito (?tarefa=<id>). */
  const taskId = useSearchParams().get('tarefa')
  const linkedTask = taskId ? store.tasks.find(task => task.id === taskId) : undefined
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<Phase>('focus')
  const [sessionName, setSessionName] = useState('')
  /** Ciclo contínuo: ao fim de uma etapa a seguinte começa sozinha. */
  const [auto, setAuto] = useState(false)
  const [cycles, setCycles] = useState(0)
  const [customFor, setCustomFor] = useState<Phase|null>(null)
  const [custom, setCustom] = useState('')
  const [sharing, setSharing] = useState<FocusSession|null>(null)
  /** Última sessão concluída, em destaque para poder ser compartilhada na hora. */
  const [justFinished, setJustFinished] = useState<FocusSession|null>(null)
  /** Espelha `active` para o render: ref não pode ser lido durante a renderização. */
  const [started, setStarted] = useState(false)
  /** Tempo somado à etapa atual pelo "+5 min". Volta a zero quando a etapa muda. */
  const [extraSeconds, setExtraSeconds] = useState(0)
  /** O anel fica fechado por um instante quando um foco termina. */
  const [celebrating, setCelebrating] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const active = useRef<ActiveSession|null>(null)

  const total = (phase === 'focus' ? focusMinutes : breakMinutes) * 60 + extraSeconds
  const focusName = sessionName.trim() || linkedTask?.title || ''

  const persist = (status: FocusSession['status'], actualSeconds: number) => {
    const session = active.current
    if (!session) return
    active.current = null
    setStarted(false)
    const record: FocusSession = {
      id: session.id,
      ...(session.commitmentId ? { commitmentId: session.commitmentId } : {}),
      name: focusName,
      plannedMinutes: session.plannedMinutes,
      actualSeconds: Math.max(0, Math.round(actualSeconds)),
      interruptions: 0,
      status,
      startedAt: session.startedAt,
      endedAt: new Date().toISOString(),
    }
    saveFocusSession(record)
    if (status === 'completed') setCelebrating(true)
    // Interromper não desqualifica: o que foi focado, foi focado.
    if (isShareable(record)) setJustFinished(record)
  }

  useEffect(() => {
    if (!celebrating) return
    const timer = window.setTimeout(() => setCelebrating(false), CELEBRATION_MS)
    return () => window.clearTimeout(timer)
  }, [celebrating])

  /** Abre uma sessão de foco nova — o que dá início ao registro no histórico. */
  function beginFocus() {
    active.current = { id: crypto.randomUUID(), startedAt: new Date().toISOString(), plannedMinutes: focusMinutes, commitmentId: linkedTask?.id }
    setStarted(true)
    setJustFinished(null)
    setCelebrating(false)
  }

  /**
   * Fecha a etapa que terminou e devolve o tempo da próxima.
   *
   * No modo automático a próxima já começa a correr; fora dele o cronômetro
   * espera você apertar o play, que é o comportamento de sempre.
   */
  function advance(): number {
    setExtraSeconds(0)
    if (phase === 'focus') {
      // Chegou ao fim: o tempo realizado é o planejado.
      persist('completed', (active.current?.plannedMinutes ?? focusMinutes) * 60)
      setCycles(value => value + 1)
      if (breakMinutes > 0) {
        setPhase('break')
        setRunning(auto)
        return breakMinutes * 60
      }
      if (auto) beginFocus()
      setRunning(auto)
      return focusMinutes * 60
    }
    setPhase('focus')
    if (auto) beginFocus()
    setRunning(auto)
    return focusMinutes * 60
  }

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setRemaining(value => (value > 1 ? value - 1 : advance())), 1000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, focusMinutes, breakMinutes, auto])

  function toggle() {
    if (!running && phase === 'focus' && !active.current) beginFocus()
    if (!running) setCelebrating(false)
    setRunning(value => !value)
  }

  /** Cancelar encerra a sessão e registra o que de fato aconteceu. */
  function stop() {
    if (active.current && phase === 'focus') persist('abandoned', active.current.plannedMinutes * 60 - remaining)
    active.current = null
    setStarted(false)
    setRunning(false)
    setPhase('focus')
    setExtraSeconds(0)
    setRemaining(focusMinutes * 60)
  }

  /** Volta o relógio ao começo da etapa. A sessão em curso continua valendo. */
  function restart() {
    setRemaining(total)
    setSettingsOpen(false)
  }

  /** Pula para a outra etapa sem esperar o cronômetro. */
  function skip() {
    const next: Phase = phase === 'focus' ? 'break' : 'focus'
    if (phase === 'focus' && active.current) persist('abandoned', active.current.plannedMinutes * 60 - remaining)
    if (next === 'focus' && auto) beginFocus()
    setPhase(next)
    setExtraSeconds(0)
    setRemaining((next === 'focus' ? focusMinutes : breakMinutes) * 60)
    setRunning(auto)
  }

  /**
   * Mais tempo para a etapa. Com uma sessão de foco aberta, o planejado cresce
   * junto — assim o registro continua dizendo a verdade sobre o que foi feito.
   * Antes de começar, é só escolher uma duração maior.
   */
  function addTime() {
    if (phase === 'focus' && !active.current) { applyMinutes('focus', Math.min(MAX_MINUTES, focusMinutes + 5)); return }
    if (total + EXTRA_SECONDS > MAX_MINUTES * 60) return
    setExtraSeconds(value => value + EXTRA_SECONDS)
    setRemaining(value => value + EXTRA_SECONDS)
    if (phase === 'focus' && active.current) active.current = { ...active.current, plannedMinutes: active.current.plannedMinutes + 5 }
  }

  /**
   * O tempo da etapa que está correndo não diminui — seria trapacear o registro.
   * A outra etapa fica livre: dá para ajustar a próxima pausa durante o foco,
   * e o próximo foco durante a pausa.
   */
  const lockedFocus = started && phase === 'focus'
  const lockedBreak = phase === 'break'

  function applyMinutes(target: Phase, value: number) {
    if (target === 'focus') {
      setFocusMinutes(value)
      if (phase === 'focus' && !active.current) { setRemaining(value * 60); setExtraSeconds(0); setRunning(false) }
      return
    }
    setBreakMinutes(value)
    if (phase === 'break' && !running) { setRemaining(value * 60); setExtraSeconds(0) }
  }

  function applyCustom() {
    const target = customFor
    const value = Math.round(Number(custom))
    setCustomFor(null)
    setCustom('')
    if (!target || !Number.isFinite(value) || value < 1 || value > MAX_MINUTES) return
    applyMinutes(target, value)
  }

  const today = isoDate(new Date())
  const sessions = useMemo(() => store.focusSessions ?? [], [store.focusSessions])
  const recent = sessions.slice(0, 6)
  const totalMinutes = sessions.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.actualSeconds / 60, 0)
  const todayMinutes = sessions.filter(s => isoDate(new Date(s.startedAt)) === today).reduce((sum, s) => sum + s.actualSeconds / 60, 0)
  // Foco que terminou ligado a uma tarefa: o passo natural é marcá-la como feita.
  const finishedTask = justFinished?.status === 'completed' && justFinished.commitmentId ? store.tasks.find(task => task.id === justFinished.commitmentId) : undefined
  const finishedTaskDone = finishedTask ? isDoneOn(indexEvents(store.taskEvents), finishedTask.id, today) : false

  const paused = !running && (started || remaining < total)
  const status: RadialTimerStatus = celebrating ? 'completed' : running ? 'running' : paused ? 'paused' : 'idle'
  const idleFocus = status === 'idle' && phase === 'focus'
  const nextStep = phase === 'focus'
    ? (breakMinutes > 0 ? `${breakMinutes} min de pausa` : `mais ${focusMinutes} min de foco`)
    : `${focusMinutes} min de foco`

  const primary = running
    ? { label: 'Pausar', icon: <Pause size={18} fill="currentColor"/> }
    : paused
      ? { label: 'Continuar', icon: <Play size={18} fill="currentColor"/> }
      : { label: phase === 'focus' ? 'Iniciar foco' : 'Iniciar pausa', icon: <Play size={18} fill="currentColor"/> }

  /**
   * Seletor de minutos com atalhos e campo livre.
   * É uma função que devolve JSX, não um componente: declarar um componente
   * aqui dentro o recriaria a cada render e o campo perderia o foco ao digitar.
   */
  function minutePicker(target: Phase, presets: number[], value: number, locked: boolean) {
    const isPreset = presets.includes(value)
    return <div className="flex flex-wrap items-center gap-1.5">
      {presets.map(preset => <Chip key={preset} selected={value === preset} disabled={locked} onClick={() => applyMinutes(target, preset)}>{preset} min</Chip>)}
      {customFor === target
        ? <input autoFocus type="number" min={1} max={MAX_MINUTES} value={custom} placeholder="min" inputMode="numeric" aria-label="Minutos"
            onChange={event => setCustom(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') applyCustom(); if (event.key === 'Escape') { setCustomFor(null); setCustom('') } }}
            onBlur={applyCustom}
            className="h-9 w-20 rounded-full border border-area-line bg-transparent px-3 text-center text-body-s text-fg-1 outline-none"/>
        : <Chip selected={!isPreset} disabled={locked} onClick={() => { setCustom(String(value)); setCustomFor(target) }}>
            {isPreset ? 'Outro' : `${value} min`}
          </Chip>}
    </div>
  }

  return <div className="page-wrap">
    <PageHeader back={{ href: '/hoje', label: 'Hoje' }} title="Foco"
      actions={<IconButton label="Ajustes do foco" variant="outline" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={18}/></IconButton>}/>

    <section className="flex flex-col items-center" aria-label="Temporizador">
      <RadialTimer className="w-[min(86vw,54svh,440px)] md:w-[min(460px,56svh)]"
        duration={total} remaining={remaining} status={status}
        label={phase === 'focus' ? 'Foco' : 'Pausa'}
        detail={phase === 'focus' ? focusName || undefined : 'respire'}/>

      {linkedTask && <Link href="/foco" replace className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-area-line px-3 py-1 text-caption text-fg-2 no-underline hover:text-fg-1">
        <Target size={13} className="shrink-0 text-area-ink"/><span className="truncate">Ligado a {linkedTask.title}</span><X size={13} className="shrink-0" aria-label="Desligar da tarefa"/>
      </Link>}

      {/* Antes de começar, a duração está a um toque — sem abrir ajustes. */}
      <div className="mt-5 flex h-9 items-center">
        {idleFocus && <div className="flex flex-wrap justify-center gap-1.5">
          {focusPresets.map(preset => <Chip key={preset} size="sm" selected={focusMinutes === preset && extraSeconds === 0} onClick={() => applyMinutes('focus', preset)}>{preset} min</Chip>)}
          <Chip size="sm" selected={!focusPresets.includes(focusMinutes)} onClick={() => setSettingsOpen(true)}>{focusPresets.includes(focusMinutes) ? 'Outro' : `${focusMinutes} min`}</Chip>
        </div>}
        {!idleFocus && auto && status !== 'completed' && <p className="text-caption text-fg-3">Depois: {nextStep}</p>}
      </div>

      <Button size="lg" className="mt-4 min-w-44" icon={primary.icon} onClick={toggle}>{primary.label}</Button>

      <div className="mt-6 flex items-start justify-center gap-2 sm:gap-4">
        <SecondaryAction icon={<Square size={15} fill="currentColor"/>} label="Cancelar" onClick={stop}
          disabled={!started && remaining === total && phase === 'focus'}/>
        <SecondaryAction icon={<Plus size={18}/>} label="+5 min" onClick={addTime}
          disabled={phase === 'focus' && !started ? focusMinutes >= MAX_MINUTES : total + EXTRA_SECONDS > MAX_MINUTES * 60}/>
        <SecondaryAction icon={phase === 'break' ? <Target size={17}/> : <Coffee size={17}/>} label={phase === 'break' ? 'Ir ao foco' : 'Pausa'} onClick={skip}/>
        <SecondaryAction icon={<SlidersHorizontal size={17}/>} label="Ajustes" onClick={() => setSettingsOpen(true)}/>
      </div>
    </section>

    {/* Compartilhar é oferecido no calor do momento — depois vira só um ícone
        no histórico, que ninguém procura. */}
    <AnimatePresence>
      {justFinished && <motion.div {...enter} className="mx-auto mt-8 max-w-xl">
        <Card className="flex items-center gap-4" selected={justFinished.status === 'completed'}>
          <div className="min-w-0 flex-1">
            <p className="text-label uppercase text-area-ink">{justFinished.status === 'completed' ? 'Sessão concluída' : 'Sessão encerrada'}</p>
            <p className="mt-1.5 text-metric-m tabular-nums">{formatFocusMinutes(justFinished.actualSeconds / 60)} <span className="text-body-s font-normal text-fg-2">de foco</span></p>
            <p className="mt-1 truncate text-caption text-fg-3">
              {justFinished.name || 'Sessão de foco'} · {formatFocusMinutes(todayMinutes)} hoje{cycles > 0 ? ` · ${cycles} ${cycles === 1 ? 'ciclo' : 'ciclos'}` : ''}
            </p>
          </div>
          {finishedTask && !finishedTaskDone && <Button size="sm" icon={<Check size={15}/>} onClick={() => setTaskDone(finishedTask, today, true)}>Concluir tarefa</Button>}
          <Button size="sm" variant="secondary" icon={<Share2 size={15}/>} onClick={() => setSharing(justFinished)}>Compartilhar</Button>
          <IconButton label="Dispensar" size="sm" onClick={() => setJustFinished(null)}><X size={16}/></IconButton>
        </Card>
      </motion.div>}
    </AnimatePresence>

    <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-3">
      <Widget label="Hoje" icon={Timer}><p className="text-metric-s tabular-nums">{formatFocusMinutes(todayMinutes)}</p></Widget>
      <Widget label="Ciclos" icon={Repeat}><p className="text-metric-s tabular-nums">{cycles}</p></Widget>
      <Widget label="Próxima" icon={phase === 'focus' ? Coffee : Target}><p className="truncate text-body-s font-medium">{nextStep}</p></Widget>
    </div>

    <section className="mx-auto mt-10 max-w-3xl">
      <SectionHeader className="mb-3" title="Suas sessões" meta={totalMinutes > 0 ? `${formatFocusMinutes(totalMinutes)} focados` : undefined}/>
      {recent.length === 0
        ? <Card padding="none"><EmptyState compact icon={Timer} title="Nenhuma sessão ainda" description="Quando você concluir um tempo de foco, ele aparece aqui."/></Card>
        : <Card padding="none" className="overflow-hidden">{recent.map(session => <div key={session.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-caption font-semibold tabular-nums ${session.status === 'completed' ? 'bg-area-soft text-area-ink' : 'bg-surface-2 text-fg-3'}`}>{Math.round(session.actualSeconds / 60)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-s font-medium">{session.name || 'Sessão de foco'}</p>
              <p className="text-caption text-fg-3">{session.status === 'completed' ? 'Concluída' : 'Interrompida'} · planejado {session.plannedMinutes} min</p>
            </div>
            <span className="shrink-0 text-caption tabular-nums text-fg-3">{new Date(session.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
            {/* Sessão curta demais não rende compartilhamento. */}
            {isShareable(session) && <IconButton label="Compartilhar sessão" size="sm" onClick={() => setSharing(session)}><Share2 size={15}/></IconButton>}
          </div>)}</Card>}
    </section>

    <Sheet open={settingsOpen} onClose={() => { setSettingsOpen(false); setCustomFor(null) }} eyebrow="Foco" title="Ajustes da sessão">
      <label className="block text-caption text-fg-2">No que você vai focar? <span className="text-fg-3">(opcional)</span>
        <input className="field mt-1.5" value={sessionName} onChange={e => setSessionName(e.target.value)} maxLength={160} placeholder={linkedTask?.title ?? 'Ex.: Terminar a proposta'}/>
      </label>

      {/* O ciclo automático é o que transforma o timer em pomodoro de verdade. */}
      <ToggleRow className="mt-4" checked={auto} onChange={setAuto} icon={Repeat} title="Modo automático"
        description={auto
          ? 'Foco e pausa se emendam sozinhos. Você ajusta a próxima etapa enquanto a atual roda.'
          : 'Ative para o ciclo seguir sem você apertar play a cada etapa.'}/>

      <FieldLabel>Foco {lockedFocus && <span className="normal-case tracking-normal">· em andamento</span>}</FieldLabel>
      {minutePicker('focus', focusPresets, focusMinutes, lockedFocus)}

      <div>
        <FieldLabel>Pausa {lockedBreak && <span className="normal-case tracking-normal">· em andamento</span>}</FieldLabel>
        {minutePicker('break', breakPresets, breakMinutes, lockedBreak)}
      </div>

      <Button className="mt-6" variant="secondary" fullWidth icon={<RotateCcw size={16}/>} onClick={restart} disabled={status === 'idle'}>Reiniciar etapa</Button>
    </Sheet>

    <AnimatePresence>
      {sharing && <ShareSessionDialog key={sharing.id} session={sharing} userName={store.userName} onClose={() => setSharing(null)}/>}
    </AnimatePresence>
  </div>
}
