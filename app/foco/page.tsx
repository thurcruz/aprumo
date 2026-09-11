'use client'

import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Coffee, Pause, Play, Repeat, RotateCcw, Share2, Square, Target, X } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import type { FocusSession } from '@/lib/types'
import ShareSessionDialog from '@/components/modules/ShareSessionDialog'
import { isShareable } from '@/lib/share'

type ActiveSession = { id: string; startedAt: string; plannedMinutes: number }
type Phase = 'focus' | 'break'

const focusPresets = [15, 25, 45, 60]
const breakPresets = [5, 10, 15]
const MAX_MINUTES = 240

export default function FocoPage() {
  const { store, saveFocusSession } = useAprumoStore()
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
  const active = useRef<ActiveSession|null>(null)

  const total = (phase === 'focus' ? focusMinutes : breakMinutes) * 60
  /** Fração já cumprida: o anel preenche conforme o tempo passa. */
  const elapsed = total > 0 ? Math.max(0, Math.min(1, 1 - remaining / total)) : 0
  const stroke = 2 * Math.PI * 132

  const persist = (status: FocusSession['status'], actualSeconds: number) => {
    const session = active.current
    if (!session) return
    active.current = null
    setStarted(false)
    const record: FocusSession = {
      id: session.id,
      name: sessionName.trim(),
      plannedMinutes: session.plannedMinutes,
      actualSeconds: Math.max(0, Math.round(actualSeconds)),
      interruptions: 0,
      status,
      startedAt: session.startedAt,
      endedAt: new Date().toISOString(),
    }
    saveFocusSession(record)
    // Interromper não desqualifica: o que foi focado, foi focado.
    if (isShareable(record)) setJustFinished(record)
  }

  /** Abre uma sessão de foco nova — o que dá início ao registro no histórico. */
  function beginFocus() {
    active.current = { id: crypto.randomUUID(), startedAt: new Date().toISOString(), plannedMinutes: focusMinutes }
    setStarted(true)
    setJustFinished(null)
  }

  /**
   * Fecha a etapa que terminou e devolve o tempo da próxima.
   *
   * No modo automático a próxima já começa a correr; fora dele o cronômetro
   * espera você apertar o play, que é o comportamento de sempre.
   */
  function advance(): number {
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
    setRunning(value => !value)
  }

  /** Interromper encerra a sessão e registra o que de fato aconteceu. */
  function stop() {
    if (active.current && phase === 'focus') persist('abandoned', active.current.plannedMinutes * 60 - remaining)
    active.current = null
    setStarted(false)
    setRunning(false)
    setPhase('focus')
    setRemaining(focusMinutes * 60)
  }

  /** Volta o relógio ao começo da etapa. A sessão em curso continua valendo. */
  function restart() {
    setRemaining((phase === 'focus' ? focusMinutes : breakMinutes) * 60)
  }

  /** Pula para a outra etapa sem esperar o cronômetro. */
  function skip() {
    const next: Phase = phase === 'focus' ? 'break' : 'focus'
    if (phase === 'focus' && active.current) persist('abandoned', active.current.plannedMinutes * 60 - remaining)
    if (next === 'focus' && auto) beginFocus()
    setPhase(next)
    setRemaining((next === 'focus' ? focusMinutes : breakMinutes) * 60)
    setRunning(auto)
  }

  /**
   * O tempo da etapa que está correndo não muda — seria trapacear o registro.
   * A outra etapa fica livre: dá para ajustar a próxima pausa durante o foco,
   * e o próximo foco durante a pausa.
   */
  const lockedFocus = started && phase === 'focus'
  const lockedBreak = phase === 'break'

  function applyMinutes(target: Phase, value: number) {
    if (target === 'focus') {
      setFocusMinutes(value)
      if (phase === 'focus' && !active.current) { setRemaining(value * 60); setRunning(false) }
      return
    }
    setBreakMinutes(value)
    if (phase === 'break' && !running) setRemaining(value * 60)
  }

  function applyCustom() {
    const target = customFor
    const value = Math.round(Number(custom))
    setCustomFor(null)
    setCustom('')
    if (!target || !Number.isFinite(value) || value < 1 || value > MAX_MINUTES) return
    applyMinutes(target, value)
  }

  const label = useMemo(() => `${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`, [remaining])
  const sessions = store.focusSessions ?? []
  const recent = sessions.slice(0, 6)
  const totalMinutes = sessions.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.actualSeconds / 60, 0)

  /**
   * Seletor de minutos com atalhos e campo livre.
   * É uma função que devolve JSX, não um componente: declarar um componente
   * aqui dentro o recriaria a cada render e o campo perderia o foco ao digitar.
   */
  function minutePicker(target: Phase, presets: number[], value: number, locked: boolean) {
    const isPreset = presets.includes(value)
    return <div>
      {presets.map(preset => <button key={preset} className={value === preset ? 'active' : ''} disabled={locked} onClick={() => applyMinutes(target, preset)}>{preset} min</button>)}
      {customFor === target
        ? <span className="focus-custom">
            <input autoFocus type="number" min={1} max={MAX_MINUTES} value={custom} placeholder="min"
              onChange={event => setCustom(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') applyCustom(); if (event.key === 'Escape') { setCustomFor(null); setCustom('') } }}
              onBlur={applyCustom}/>
          </span>
        : <button className={isPreset ? '' : 'active'} disabled={locked} onClick={() => { setCustom(String(value)); setCustomFor(target) }}>
            {isPreset ? 'Outro' : `${value} min`}
          </button>}
    </div>
  }

  return <div className="page-wrap focus-page">
    <header>
      <Link href="/hoje" className="muted mb-5 inline-flex items-center gap-2 text-sm no-underline"><ArrowLeft size={15}/> Voltar para Hoje</Link>
      <p className="eyebrow">Presença antes de velocidade</p>
      <h1 className="display mt-3 text-4xl font-semibold md:text-6xl">Modo Foco</h1>
      <p className="muted mt-4">Escolha um tempo, elimine o ruído e faça apenas uma coisa.</p>
    </header>

    <section className="focus-stage mt-10">
      <div className="focus-main">
        <svg viewBox="0 0 300 300" aria-hidden="true">
          <circle className="track" cx="150" cy="150" r="132"/>
          {/* O traço cresce com o tempo cumprido: começa vazio e fecha o anel. */}
          <circle className="progress" cx="150" cy="150" r="132" style={{ strokeDasharray: stroke, strokeDashoffset: stroke * (1 - elapsed) }}/>
        </svg>
        <div>
          <small>{phase === 'focus' ? 'TEMPO DE FOCO' : 'PAUSA'}</small>
          <strong>{label}</strong>
          {auto && <span className="focus-next">{phase === 'focus'
            ? (breakMinutes > 0 ? `depois: ${breakMinutes} min de pausa` : `depois: mais ${focusMinutes} min`)
            : `depois: ${focusMinutes} min de foco`}</span>}
        </div>
      </div>

      {/* Controles embaixo e centralizados: o principal no meio, o resto ao redor. */}
      <div className="focus-actions">
        {/* Rodando, o gesto natural é recomeçar a etapa; parado, é encerrar de vez. */}
        {running
          ? <button className="focus-secondary" onClick={restart} aria-label="Reiniciar etapa"><RotateCcw size={17}/></button>
          : <button className="focus-secondary" onClick={stop} disabled={!started && remaining === total && phase === 'focus'} aria-label="Interromper"><Square size={16} fill="currentColor"/></button>}
        <button className="focus-play" onClick={toggle} aria-label={running ? 'Pausar' : 'Iniciar'}>
          {running ? <Pause size={26}/> : <Play size={26} fill="currentColor"/>}
        </button>
        <button className="focus-secondary" onClick={skip} aria-label={phase === 'break' ? 'Voltar ao foco' : 'Pular para a pausa'}>
          {phase === 'break' ? <Target size={17}/> : <Coffee size={17}/>}
        </button>
      </div>
      {cycles > 0 && <p className="muted mt-4 text-xs">{cycles} {cycles === 1 ? 'ciclo concluído' : 'ciclos concluídos'} nesta sessão</p>}
    </section>

    {/* Compartilhar é oferecido no calor do momento — depois vira só um ícone
        no histórico, que ninguém procura. */}
    {justFinished && <div className="surface mt-6 flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: justFinished.status === 'completed' ? 'var(--energy)' : 'rgba(208,224,39,.12)', color: justFinished.status === 'completed' ? '#11130f' : 'var(--accent)' }}>
        {justFinished.status === 'completed' ? <Check size={18}/> : <Square size={15} fill="currentColor"/>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{Math.round(justFinished.actualSeconds / 60)} min {justFinished.status === 'completed' ? 'concluídos' : 'focados'}</p>
        <p className="muted truncate text-xs">{justFinished.name || 'Sessão de foco'}</p>
      </div>
      <button onClick={() => setSharing(justFinished)} className="energy-button flex shrink-0 items-center gap-2 px-4 py-2 text-sm"><Share2 size={15}/> Compartilhar</button>
      <button onClick={() => setJustFinished(null)} aria-label="Dispensar" className="muted shrink-0 rounded-lg p-1 hover:text-white"><X size={16}/></button>
    </div>}

    <section className="surface mt-9 p-6">
      <label className="muted block text-xs">No que você vai focar? <span className="opacity-60">(opcional)</span>
        <input className="field mt-2" value={sessionName} onChange={e => setSessionName(e.target.value)} maxLength={160} placeholder="Ex.: Terminar a proposta"/>
      </label>
    </section>

    {/* O ciclo automático é o que transforma o timer em pomodoro de verdade. */}
    <button onClick={() => setAuto(value => !value)} aria-pressed={auto}
      className="surface mt-4 flex w-full items-center gap-3 p-4 text-left"
      style={{ borderColor: auto ? 'rgba(208,224,39,.5)' : undefined }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: auto ? 'var(--energy)' : 'rgba(208,224,39,.1)', color: auto ? '#11130f' : 'var(--accent)' }}><Repeat size={17}/></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Modo automático</span>
        <span className="muted block text-xs">{auto
          ? 'Foco e pausa se emendam sozinhos. Você ajusta a próxima etapa enquanto a atual roda.'
          : 'Ative para o ciclo seguir sem você apertar play a cada etapa.'}</span>
      </span>
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border" style={{ borderColor: auto ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .2)', background: auto ? 'var(--energy)' : 'transparent' }}/>
    </button>

    <section className="surface focus-controls mt-4">
      <label>
        Foco {lockedFocus && <span className="opacity-60">· em andamento</span>}
        {minutePicker('focus', focusPresets, focusMinutes, lockedFocus)}
      </label>
      <label>
        Pausa {lockedBreak && <span className="opacity-60">· em andamento</span>}
        {minutePicker('break', breakPresets, breakMinutes, lockedBreak)}
      </label>
    </section>

    <section className="mt-9">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">Suas sessões</h2>
        {totalMinutes > 0 && <span className="muted text-sm">{Math.round(totalMinutes)} min focados</span>}
      </div>
      {recent.length === 0
        ? <div className="surface p-8 text-center"><p className="text-sm font-semibold">Nenhuma sessão ainda</p><p className="muted mt-1 text-xs">Quando você concluir um tempo de foco, ele aparece aqui.</p></div>
        : <div className="space-y-2">{recent.map(session => <div key={session.id} className="surface flex items-center gap-4 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold" style={{ background: session.status === 'completed' ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .06)', color: session.status === 'completed' ? '#11130f' : 'var(--muted)' }}>{Math.round(session.actualSeconds/60)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{session.name || 'Sessão de foco'}</p>
              <p className="muted text-xs">{session.status === 'completed' ? 'Concluída' : 'Interrompida'} · planejado {session.plannedMinutes} min</p>
            </div>
            <span className="muted shrink-0 text-xs">{new Date(session.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
            {/* Sessão curta demais não rende compartilhamento. */}
            {isShareable(session) && <button onClick={() => setSharing(session)} aria-label="Compartilhar sessão" className="muted shrink-0 rounded-lg p-1.5 hover:text-white"><Share2 size={15}/></button>}
          </div>)}</div>}
    </section>

    <AnimatePresence>
      {sharing && <ShareSessionDialog key={sharing.id} session={sharing} userName={store.userName} onClose={() => setSharing(null)}/>}
    </AnimatePresence>
  </div>
}
