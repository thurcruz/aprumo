'use client'

import { Clock3 } from 'lucide-react'
import { ToggleRow } from '@/components/ui/Switch'

/**
 * Bloco reutilizável de "hora marcada": um interruptor e o intervalo das/às.
 * A hora é sempre opcional — quem organiza o dia por período (manhã/tarde/noite)
 * não deve ser obrigado a cravar horário, mas quem tem compromisso precisa poder.
 */
export default function TimeRange({ enabled, start, end, onToggle, onStart, onEnd, offHint = 'Opcional — a parte do dia já basta.' }: {
  enabled: boolean
  start: string
  end: string
  onToggle: (enabled: boolean) => void
  onStart: (value: string) => void
  onEnd: (value: string) => void
  offHint?: string
}) {
  return <>
    <ToggleRow checked={enabled} onChange={onToggle} icon={Clock3} title="Hora marcada" description={enabled ? 'Aparece na agenda com horário.' : offHint}/>
    {enabled && <div className="mt-3 grid grid-cols-2 gap-3">
      <label className="text-caption text-fg-2">Das<input type="time" className="field mt-1.5" value={start} onChange={event => onStart(event.target.value)}/></label>
      <label className="text-caption text-fg-2">Às<input type="time" className="field mt-1.5" value={end} onChange={event => onEnd(event.target.value)}/></label>
    </div>}
  </>
}
