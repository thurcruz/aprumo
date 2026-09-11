'use client'

import { useEffect, useState } from 'react'
import { Check, Play, SkipForward, Timer, X } from 'lucide-react'
import type { SessionExercise, WorkoutLog } from '@/lib/types'
import {
  describeSet, formatDuration, isFinalSet, lastPerformance, markSet, sessionProgress, sessionVolume, updateSet,
  type ActiveWorkout,
} from '@/lib/workout'
import { DurationField, NumberField } from './fields'

/** Um cronômetro por vez: o descanso depois de uma série, ou uma série medida em tempo. */
type TimerState = { kind: 'rest' | 'set'; exerciseId: string; setIndex: number; endsAt: number; total: number; label: string }

/** Descanso que segue uma série — nenhum depois da última do treino, nem quando o exercício não tem descanso. */
function restAfter(workout: ActiveWorkout, exerciseId: string, setIndex: number, from: number): TimerState | null {
  const exercise = workout.exercises.find(item => item.id === exerciseId)
  if (!exercise || exercise.restSeconds <= 0 || isFinalSet(workout, exerciseId, setIndex)) return null
  return { kind: 'rest', exerciseId, setIndex, endsAt: from + exercise.restSeconds * 1000, total: exercise.restSeconds, label: 'Descanso' }
}

/**
 * Tela de execução. Tudo o que muda aqui vai para o treino em andamento, nunca
 * para a ficha: a carga que você ajusta hoje fica no histórico e vira a
 * sugestão da próxima vez.
 */
export default function WorkoutRunner({ workout, logs, onChange, onFinish, onDiscard }: {
  workout: ActiveWorkout
  logs: WorkoutLog[]
  onChange: (next: ActiveWorkout) => void
  onFinish: () => void
  onDiscard: () => void
}) {
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [now, setNow] = useState(0)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  // Um relógio só, que atualiza a tela e age quando um cronômetro zera.
  // O tempo restante sai do instante final, não de decrementos: assim ele não
  // atrasa quando o navegador segura o intervalo com a aba em segundo plano.
  useEffect(() => {
    const id = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (!timer || current < timer.endsAt) return
      navigator.vibrate?.(timer.kind === 'rest' ? [180, 90, 180] : 320)
      if (timer.kind === 'set') {
        const next = markSet(workout, timer.exerciseId, timer.setIndex, true)
        onChange(next)
        setTimer(restAfter(next, timer.exerciseId, timer.setIndex, current))
      } else {
        setTimer(null)
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [timer, workout, onChange])

  function toggleSet(exercise: SessionExercise, setIndex: number) {
    const done = !exercise.sets[setIndex].done
    const next = markSet(workout, exercise.id, setIndex, done)
    onChange(next)
    const current = Date.now()
    setNow(current)
    if (done) setTimer(restAfter(next, exercise.id, setIndex, current))
    else if (timer && timer.exerciseId === exercise.id && timer.setIndex === setIndex) setTimer(null)
  }

  function startSetTimer(exercise: SessionExercise, setIndex: number) {
    const seconds = exercise.sets[setIndex].seconds ?? 0
    if (seconds <= 0) return
    const current = Date.now()
    setNow(current)
    setTimer({ kind: 'set', exerciseId: exercise.id, setIndex, endsAt: current + seconds * 1000, total: seconds, label: exercise.name })
  }

  /** Pular o descanso, ou concluir antes a série cronometrada. */
  function skipTimer() {
    if (timer?.kind !== 'set') { setTimer(null); return }
    const next = markSet(workout, timer.exerciseId, timer.setIndex, true)
    onChange(next)
    const current = Date.now()
    setNow(current)
    setTimer(restAfter(next, timer.exerciseId, timer.setIndex, current))
  }

  const extend = (seconds: number) => { if (timer) setTimer({ ...timer, endsAt: timer.endsAt + seconds * 1000, total: timer.total + seconds }) }

  const { done, total } = sessionProgress(workout.exercises)
  const volume = sessionVolume(workout.exercises)
  const elapsed = now ? Math.max(0, Math.floor((now - Date.parse(workout.startedAt)) / 1000)) : 0
  const remaining = timer ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000)) : 0

  return <div className="page-wrap pb-44">
    <header>
      <p className="eyebrow">Treino em andamento</p>
      <h1 className="display mt-3 text-4xl font-semibold md:text-5xl">{workout.planName}</h1>
      <p className="muted mt-3 text-sm tabular-nums">
        {formatDuration(elapsed)} · {done}/{total} séries{volume > 0 ? ` · ${volume.toLocaleString('pt-BR')} kg` : ''}
      </p>
      <p className="muted mt-1 text-xs">Pode sair desta tela: o treino fica guardado até você finalizar.</p>
    </header>
    <div className="mt-5 h-1.5 rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-energy transition-all" style={{ width: `${total ? done / total * 100 : 0}%` }}/></div>

    <div className="mt-6 space-y-4">
      {workout.exercises.map(exercise => {
        const last = lastPerformance(exercise, logs)
        return <section key={exercise.id} className="surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">{exercise.name}</h2>
            {exercise.restSeconds > 0 && <span className="muted flex shrink-0 items-center gap-1 text-[11px]"><Timer size={11}/> {formatDuration(exercise.restSeconds)}</span>}
          </div>
          {last && <p className="muted mt-1 text-xs">
            Última vez: {describeSet(exercise.kind, last.best)} · {new Date(last.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </p>}

          <div className="mt-4 space-y-2">
            {exercise.sets.map((set, index) => {
              const timing = timer?.kind === 'set' && timer.exerciseId === exercise.id && timer.setIndex === index
              return <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl border p-2.5"
                style={{ borderColor: set.done ? 'rgba(208,224,39,.45)' : 'var(--line)', background: set.done ? 'rgba(208,224,39,.06)' : 'transparent' }}>
                <span className="muted w-6 text-center text-xs font-bold">{index + 1}</span>
                {exercise.kind === 'time'
                  ? <>
                      <DurationField seconds={set.seconds ?? 60} onChange={seconds => onChange(updateSet(workout, exercise.id, index, { seconds }))}/>
                      <button type="button" onClick={() => startSetTimer(exercise, index)} disabled={set.done || timing}
                        aria-label="Cronometrar série" className="grid h-8 w-8 place-items-center rounded-full border disabled:opacity-30" style={{ borderColor: 'var(--line)' }}><Play size={12} fill="currentColor"/></button>
                    </>
                  : <>
                      <NumberField label="Repetições" value={set.reps} max={1000} onChange={reps => onChange(updateSet(workout, exercise.id, index, { reps }))} suffix="reps"/>
                      <NumberField label="Carga" value={set.weight} max={2000} step={0.5} onChange={weight => onChange(updateSet(workout, exercise.id, index, { weight }))} suffix="kg"/>
                    </>}
                <button type="button" onClick={() => toggleSet(exercise, index)} aria-label={set.done ? 'Desmarcar série' : 'Concluir série'}
                  className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border"
                  style={{ borderColor: set.done ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .2)', background: set.done ? 'var(--energy)' : 'transparent', color: '#11130f' }}>
                  {set.done && <Check size={16}/>}
                </button>
              </div>
            })}
          </div>
        </section>
      })}
    </div>

    <div className="mt-6 grid gap-2">
      <button onClick={onFinish} disabled={done === 0} className="energy-button py-3" style={{ opacity: done === 0 ? .45 : 1 }}>Finalizar treino</button>
      {done === 0 && <p className="muted text-center text-xs">Conclua pelo menos uma série para finalizar.</p>}
      <button onClick={() => confirmDiscard ? onDiscard() : setConfirmDiscard(true)} className="rounded-full border py-2.5 text-sm"
        style={{ borderColor: confirmDiscard ? 'rgba(255,107,107,.45)' : 'var(--line)', color: confirmDiscard ? 'var(--danger)' : 'var(--muted)' }}>
        {confirmDiscard ? 'Confirmar — nada deste treino será salvo' : 'Descartar treino'}
      </button>
    </div>

    {timer && <div className="glass fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md rounded-2xl p-4 md:bottom-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-energy/10 text-energy">
          {timer.kind === 'rest' ? <Timer size={17}/> : <Play size={15} fill="currentColor"/>}
        </span>
        <div className="min-w-0 flex-1">
          <p className="muted truncate text-[11px] uppercase tracking-wider">{timer.label}</p>
          <p className="text-2xl font-semibold tabular-nums">{formatDuration(remaining)}</p>
        </div>
        {timer.kind === 'rest' && <button onClick={() => extend(15)} className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: 'var(--line)' }}>+15s</button>}
        <button onClick={skipTimer} className="flex items-center gap-1 rounded-full bg-energy px-3 py-1.5 text-xs font-semibold text-[#11130f]">
          {timer.kind === 'rest' ? <><SkipForward size={13}/> Pular</> : <><Check size={13}/> Concluir</>}
        </button>
        {timer.kind === 'set' && <button onClick={() => setTimer(null)} aria-label="Cancelar cronômetro" className="muted p-1 hover:text-white"><X size={15}/></button>}
      </div>
      <div className="mt-3 h-1 rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-energy" style={{ width: `${Math.min(100, Math.max(0, (1 - remaining / timer.total) * 100))}%` }}/></div>
    </div>}
  </div>
}
