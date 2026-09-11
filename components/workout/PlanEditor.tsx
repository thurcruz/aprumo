'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Dumbbell, Minus, Plus, Timer, Trash2, X } from 'lucide-react'
import type { ExerciseKind, PlanExercise, PlanSet, WorkoutPlan } from '@/lib/types'
import { DEFAULT_REST_SECONDS, expandSets, formatDuration, isUniform, REST_PRESETS } from '@/lib/workout'
import { DurationField, NumberField } from './fields'

const blankSets = (kind: ExerciseKind, count: number): PlanSet[] =>
  kind === 'time' ? expandSets(count, { seconds: 60 }) : expandSets(count, { reps: 12, weight: 0 })

function RestPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="flex flex-wrap items-center gap-1.5">
    <Timer size={12} className="shrink-0" style={{ color: 'var(--muted)' }} aria-label="Descanso"/>
    {REST_PRESETS.map(seconds => <button key={seconds} type="button" onClick={() => onChange(seconds)}
      className="rounded-full border px-2.5 py-1 text-[11px] transition"
      style={{ borderColor: value === seconds ? 'var(--energy)' : 'var(--line)', color: value === seconds ? 'var(--accent)' : 'var(--muted)' }}>
      {seconds === 0 ? 'Sem descanso' : formatDuration(seconds)}
    </button>)}
  </div>
}

/**
 * Monta ou edita uma ficha. Por padrão cada exercício é "N séries × reps × kg",
 * que é como quase todo treino se escreve; "Variar por série" abre a série a
 * série para pirâmide e drop-set.
 */
export default function PlanEditor({ initial, onCancel, onSave, onDelete }: {
  initial?: WorkoutPlan
  onCancel: () => void
  onSave: (draft: { name: string; exercises: PlanExercise[] }) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [exercises, setExercises] = useState<PlanExercise[]>(initial?.exercises ?? [])
  /** Exercícios abertos série a série: os que já chegam com séries diferentes entre si. */
  const [detailed, setDetailed] = useState<string[]>(() => (initial?.exercises ?? []).filter(item => !isUniform(item.sets)).map(item => item.id))
  const [confirmDelete, setConfirmDelete] = useState(false)
  /** Os erros só aparecem depois da primeira tentativa de salvar — não antes de a pessoa digitar. */
  const [tried, setTried] = useState(false)

  const patch = (id: string, change: Partial<PlanExercise>) => setExercises(list => list.map(item => item.id === id ? { ...item, ...change } : item))
  const setAll = (item: PlanExercise, change: Partial<PlanSet>) => patch(item.id, { sets: item.sets.map(set => ({ ...set, ...change })) })
  const setOne = (item: PlanExercise, index: number, change: Partial<PlanSet>) => patch(item.id, { sets: item.sets.map((set, i) => i === index ? { ...set, ...change } : set) })
  const toggleDetailed = (id: string) => setDetailed(list => list.includes(id) ? list.filter(item => item !== id) : [...list, id])

  function addExercise(kind: ExerciseKind) {
    setExercises(list => [...list, {
      id: crypto.randomUUID(), name: '', kind,
      restSeconds: kind === 'time' ? 60 : DEFAULT_REST_SECONDS,
      sets: blankSets(kind, kind === 'time' ? 1 : 3),
    }])
  }

  function move(index: number, offset: -1 | 1) {
    setExercises(list => {
      const target = index + offset
      if (target < 0 || target >= list.length) return list
      const next = [...list]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  /** Trocar reps ↔ tempo recria as séries: "12 × 20 kg" não tem tradução em segundos. */
  function switchKind(item: PlanExercise, kind: ExerciseKind) {
    if (item.kind === kind) return
    patch(item.id, { kind, sets: blankSets(kind, item.sets.length), restSeconds: kind === 'time' ? 60 : DEFAULT_REST_SECONDS })
  }

  const named = name.trim().length >= 2
  const unnamed = exercises.filter(item => !item.name.trim()).length
  const valid = named && exercises.length > 0 && unnamed === 0

  function save() {
    setTried(true)
    if (!valid) return
    onSave({ name: name.trim(), exercises: exercises.map(item => ({ ...item, name: item.name.trim() })) })
  }

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
    <motion.div initial={{ scale: .96, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 15 }}
      className="surface my-auto w-full max-w-xl p-6" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{initial ? 'Editar ficha' : 'Nova ficha'}</p>
          <h2 className="mt-1 text-2xl font-semibold">Monte o treino</h2>
        </div>
        <button className="icon-button shrink-0" onClick={onCancel} aria-label="Fechar"><X size={17}/></button>
      </div>

      <input autoFocus className="field mt-6" placeholder="Ex.: Treino A — peito e tríceps" maxLength={160}
        value={name} onChange={event => setName(event.target.value)}
        style={{ borderColor: tried && !named ? 'rgba(255,107,107,.45)' : undefined }}/>

      <div className="mt-5 space-y-3">
        {exercises.length === 0 && <p className="muted rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs">Nenhum exercício ainda. Adicione o primeiro abaixo.</p>}
        {exercises.map((item, index) => {
          const open = detailed.includes(item.id)
          const first: PlanSet = item.sets[0] ?? {}
          return <div key={item.id} className="rounded-2xl border p-4" style={{ borderColor: tried && !item.name.trim() ? 'rgba(255,107,107,.45)' : 'var(--line)' }}>
            <div className="flex items-center gap-2">
              <span className="muted w-5 shrink-0 text-center text-xs font-bold">{index + 1}</span>
              <input value={item.name} onChange={event => patch(item.id, { name: event.target.value })} maxLength={120}
                placeholder={item.kind === 'time' ? 'Ex.: Prancha' : 'Ex.: Supino reto'} className="field min-w-0 flex-1 py-2 text-sm"/>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir exercício" className="muted rounded-lg p-1 hover:text-white disabled:opacity-25"><ArrowUp size={14}/></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === exercises.length - 1} aria-label="Descer exercício" className="muted rounded-lg p-1 hover:text-white disabled:opacity-25"><ArrowDown size={14}/></button>
              <button type="button" onClick={() => setExercises(list => list.filter(other => other.id !== item.id))} aria-label="Remover exercício" className="rounded-lg p-1 text-white/30 hover:text-danger"><Trash2 size={14}/></button>
            </div>

            <div className="mt-3 flex gap-1.5">
              {(['reps', 'time'] as ExerciseKind[]).map(kind => <button key={kind} type="button" onClick={() => switchKind(item, kind)}
                className="rounded-full border px-3 py-1 text-[11px] font-semibold transition"
                style={{ borderColor: item.kind === kind ? 'var(--energy)' : 'var(--line)', background: item.kind === kind ? 'var(--energy)' : 'transparent', color: item.kind === kind ? '#11130f' : 'var(--muted)' }}>
                {kind === 'reps' ? 'Repetições' : 'Tempo'}
              </button>)}
            </div>

            {open
              ? <div className="mt-3 space-y-2">
                  {item.sets.map((set, setIndex) => <div key={setIndex} className="flex flex-wrap items-center gap-2">
                    <span className="muted w-14 text-xs">Série {setIndex + 1}</span>
                    {item.kind === 'time'
                      ? <DurationField seconds={set.seconds ?? 60} onChange={seconds => setOne(item, setIndex, { seconds })}/>
                      : <>
                          <NumberField label="Repetições" value={set.reps} min={1} max={1000} onChange={reps => setOne(item, setIndex, { reps })} suffix="reps"/>
                          <NumberField label="Carga" value={set.weight} max={2000} step={0.5} onChange={weight => setOne(item, setIndex, { weight })} suffix="kg"/>
                        </>}
                    <button type="button" onClick={() => patch(item.id, { sets: item.sets.filter((_, i) => i !== setIndex) })} disabled={item.sets.length === 1}
                      aria-label="Remover série" className="ml-auto rounded-lg p-1 text-white/30 hover:text-danger disabled:opacity-20"><X size={13}/></button>
                  </div>)}
                  <div className="flex flex-wrap gap-4 pt-1">
                    <button type="button" onClick={() => patch(item.id, { sets: [...item.sets, { ...item.sets[item.sets.length - 1] }] })} disabled={item.sets.length >= 20}
                      className="flex items-center gap-1 text-xs text-energy disabled:opacity-30"><Plus size={12}/> Série</button>
                    <button type="button" onClick={() => { patch(item.id, { sets: expandSets(item.sets.length, first) }); toggleDetailed(item.id) }}
                      className="muted text-xs hover:text-white">Igualar todas à primeira</button>
                  </div>
                </div>
              : <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => patch(item.id, { sets: expandSets(item.sets.length - 1, first) })} disabled={item.sets.length <= 1}
                      aria-label="Menos uma série" className="grid h-7 w-7 place-items-center rounded-full border disabled:opacity-25" style={{ borderColor: 'var(--line)' }}><Minus size={12}/></button>
                    <span className="w-5 text-center text-sm font-semibold">{item.sets.length}</span>
                    <button type="button" onClick={() => patch(item.id, { sets: expandSets(item.sets.length + 1, first) })} disabled={item.sets.length >= 20}
                      aria-label="Mais uma série" className="grid h-7 w-7 place-items-center rounded-full border disabled:opacity-25" style={{ borderColor: 'var(--line)' }}><Plus size={12}/></button>
                    <span className="muted text-xs">séries ×</span>
                  </div>
                  {item.kind === 'time'
                    ? <DurationField seconds={first.seconds ?? 60} onChange={seconds => setAll(item, { seconds })}/>
                    : <>
                        <NumberField label="Repetições" value={first.reps} min={1} max={1000} onChange={reps => setAll(item, { reps })} suffix="reps ×"/>
                        <NumberField label="Carga" value={first.weight} max={2000} step={0.5} onChange={weight => setAll(item, { weight })} suffix="kg"/>
                      </>}
                  <button type="button" onClick={() => toggleDetailed(item.id)} className="muted text-xs hover:text-white">Variar por série</button>
                </div>}

            <div className="mt-3"><RestPicker value={item.restSeconds} onChange={restSeconds => patch(item.id, { restSeconds })}/></div>
          </div>
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => addExercise('reps')} className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs" style={{ borderColor: 'var(--line)' }}><Dumbbell size={13}/> Exercício com carga</button>
        <button type="button" onClick={() => addExercise('time')} className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs" style={{ borderColor: 'var(--line)' }}><Timer size={13}/> Exercício por tempo</button>
      </div>

      {tried && !valid && <p className="mt-4 text-xs" style={{ color: 'var(--danger)' }}>
        {!named ? 'Dê um nome à ficha.' : exercises.length === 0 ? 'Adicione pelo menos um exercício.' : 'Dê um nome a cada exercício.'}
      </p>}

      <button onClick={save} className="energy-button mt-5 w-full py-3">{initial ? 'Salvar ficha' : 'Criar ficha'}</button>
      {onDelete && <button onClick={() => confirmDelete ? onDelete() : setConfirmDelete(true)}
        className="mt-2 w-full rounded-full border py-2.5 text-sm"
        style={{ borderColor: confirmDelete ? 'rgba(255,107,107,.45)' : 'var(--line)', color: confirmDelete ? 'var(--danger)' : 'var(--muted)' }}>
        {confirmDelete ? 'Confirmar exclusão — o histórico continua' : 'Excluir ficha'}
      </button>}
    </motion.div>
  </motion.div>
}
