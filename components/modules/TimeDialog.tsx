'use client'

import { useState } from 'react'
import type { Task } from '@/lib/types'
import { endFrom, minutesBetween } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Sheet from '@/components/ui/Sheet'
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

  return <Sheet managed onClose={onCancel} size="sm" eyebrow="Horário" title={task.title}
    footer={<Button fullWidth onClick={() => onSave(timed ? start : undefined, timed ? minutesBetween(start, end) : undefined)}>Salvar</Button>}>
    <TimeRange enabled={timed} start={start} end={end} onToggle={setTimed} onStart={setStart} onEnd={setEnd}
      offHint="Sem horário — fica no período do dia."/>
  </Sheet>
}
