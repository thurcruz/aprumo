'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { Task } from '@/lib/types'
import { endFrom, minutesBetween } from '@/lib/utils'
import TimeRange from './TimeRange'

/**
 * Define ou remove a hora marcada de uma tarefa avulsa. Existe porque nem todo
 * item do dia é um hábito: um compromisso pontual também precisa de horário,
 * sem passar pela configuração de recorrência.
 */
export default function TimeDialog({ task, onCancel, onSave }: {
  task: Task
  onCancel: () => void
  onSave: (startTime: string | undefined, durationMinutes: number | undefined) => void
}) {
  const [timed, setTimed] = useState(Boolean(task.startTime))
  const [start, setStart] = useState(task.startTime ?? '09:00')
  const [end, setEnd] = useState(() => endFrom(task.startTime, task.durationMinutes, '10:00'))

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
    <motion.div initial={{ scale: .96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 16 }}
      className="surface w-full max-w-sm p-6" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Horário</p>
          <h2 className="mt-1 truncate text-xl font-semibold">{task.title}</h2>
        </div>
        <button className="icon-button shrink-0" onClick={onCancel} aria-label="Fechar"><X size={18}/></button>
      </div>

      <div className="mt-6">
        <TimeRange enabled={timed} start={start} end={end} onToggle={setTimed} onStart={setStart} onEnd={setEnd}
          offHint="Sem horário — fica no período do dia."/>
      </div>

      <button onClick={() => onSave(timed ? start : undefined, timed ? minutesBetween(start, end) : undefined)}
        className="energy-button mt-6 w-full py-3">Salvar</button>
    </motion.div>
  </motion.div>
}
