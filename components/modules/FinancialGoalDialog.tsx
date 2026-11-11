'use client'

import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import type { FinancialGoal } from '@/lib/types'
import { describeDeadline, formatCurrency, isoDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import Sheet from '@/components/ui/Sheet'
import { ToggleRow } from '@/components/ui/Switch'

/**
 * Cria ou edita um objetivo financeiro. Diferente de uma meta de comportamento,
 * aqui o progresso é um número: quanto você já juntou do quanto precisa.
 */
export default function FinancialGoalDialog({ initial, onCancel, onSave }: {
  initial?: FinancialGoal
  onCancel: () => void
  onSave: (goal: Omit<FinancialGoal, 'id'>) => void
}) {
  const today = isoDate(new Date())
  const [title, setTitle] = useState(initial?.title ?? '')
  const [target, setTarget] = useState(initial ? String(initial.target) : '')
  const [current, setCurrent] = useState(initial ? String(initial.current) : '0')
  const [hasDeadline, setHasDeadline] = useState(Boolean(initial?.deadline))
  const [deadline, setDeadline] = useState(initial?.deadline?.slice(0, 10) ?? '')

  const targetValue = Number(target)
  const currentValue = Number(current)
  const valid = title.trim().length >= 2 && targetValue > 0 && currentValue >= 0 && (!hasDeadline || Boolean(deadline))
  const percent = targetValue > 0 ? Math.min(100, Math.round(currentValue / targetValue * 100)) : 0

  return <Sheet managed onClose={onCancel} eyebrow={initial ? 'Editar objetivo' : 'Novo objetivo'} title="Quanto você precisa?"
    footer={<Button fullWidth disabled={!valid} onClick={() => valid && onSave({ title: title.trim(), target: targetValue, current: currentValue, deadline: hasDeadline ? deadline : undefined })}>
      {initial ? 'Salvar alterações' : 'Criar objetivo'}
    </Button>}>
    <div>
      <input autoFocus className="field" placeholder="Ex.: Reserva de emergência" maxLength={160}
        value={title} onChange={event => setTitle(event.target.value)}/>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-caption text-fg-2">Quanto quero juntar
          <input className="field mt-1.5" type="number" min="1" step="0.01" placeholder="10000" inputMode="decimal"
            value={target} onChange={event => setTarget(event.target.value)}/>
        </label>
        <label className="text-caption text-fg-2">Quanto já tenho
          <input className="field mt-1.5" type="number" min="0" step="0.01" inputMode="decimal"
            value={current} onChange={event => setCurrent(event.target.value)}/>
        </label>
      </div>

      {targetValue > 0 && <div className="mt-4">
        <ProgressBar value={percent} label="Progresso do objetivo"/>
        <p className="mt-2 text-caption text-fg-2">
          <span className="tabular-nums">{percent}%</span> · faltam {formatCurrency(Math.max(0, targetValue - currentValue))}
        </p>
      </div>}

      <ToggleRow className="mt-5" checked={hasDeadline} onChange={setHasDeadline} icon={CalendarRange} title="Tem data para juntar"
        description={hasDeadline ? describeDeadline(deadline, today) ?? 'Escolha a data.' : 'Sem prazo — junte no seu ritmo.'}/>
      {hasDeadline && <input type="date" className="field mt-3" value={deadline} min={today} onChange={event => setDeadline(event.target.value)}/>}
    </div>
  </Sheet>
}
