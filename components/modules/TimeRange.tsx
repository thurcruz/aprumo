'use client'

import { Clock3 } from 'lucide-react'

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
    <button onClick={() => onToggle(!enabled)} aria-pressed={enabled}
      className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition"
      style={{ borderColor: enabled ? 'rgba(208,224,39,.4)' : 'var(--line)' }}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-energy/10 text-energy"><Clock3 size={15}/></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Hora marcada</span>
        <span className="muted block text-xs">{enabled ? 'Aparece na agenda com horário.' : offHint}</span>
      </span>
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border" style={{ borderColor: enabled ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .2)', background: enabled ? 'var(--energy)' : 'transparent' }}/>
    </button>
    {enabled && <div className="mt-3 grid grid-cols-2 gap-3">
      <label className="muted text-xs">Das<input type="time" className="field mt-2" value={start} onChange={event => onStart(event.target.value)}/></label>
      <label className="muted text-xs">Às<input type="time" className="field mt-2" value={end} onChange={event => onEnd(event.target.value)}/></label>
    </div>}
  </>
}
