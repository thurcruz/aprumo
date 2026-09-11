'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { FinancialGoal } from '@/lib/types'
import { describeDeadline, formatCurrency, isoDate } from '@/lib/utils'

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

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
    <motion.div initial={{ scale: .96, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 15 }}
      className="surface my-auto w-full max-w-md p-6" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{initial ? 'Editar objetivo' : 'Novo objetivo'}</p>
          <h2 className="mt-1 text-2xl font-semibold">Quanto você precisa?</h2>
        </div>
        <button className="icon-button shrink-0" onClick={onCancel} aria-label="Fechar"><X size={17}/></button>
      </div>

      <input autoFocus className="field mt-6" placeholder="Ex.: Reserva de emergência" maxLength={160}
        value={title} onChange={event => setTitle(event.target.value)}/>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="muted text-xs">Quanto quero juntar
          <input className="field mt-2" type="number" min="1" step="0.01" placeholder="10000"
            value={target} onChange={event => setTarget(event.target.value)}/>
        </label>
        <label className="muted text-xs">Quanto já tenho
          <input className="field mt-2" type="number" min="0" step="0.01"
            value={current} onChange={event => setCurrent(event.target.value)}/>
        </label>
      </div>

      {targetValue > 0 && <div className="mt-4">
        <div className="h-2 rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-energy transition-all" style={{ width: `${percent}%` }}/></div>
        <p className="muted mt-2 text-xs">
          {percent}% · faltam {formatCurrency(Math.max(0, targetValue - currentValue))}
        </p>
      </div>}

      <button onClick={() => setHasDeadline(value => !value)}
        className="mt-5 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition"
        style={{ borderColor: hasDeadline ? 'rgba(208,224,39,.4)' : 'var(--line)' }}>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Tem data para juntar</span>
          <span className="muted block text-xs">{hasDeadline ? describeDeadline(deadline, today) ?? 'Escolha a data.' : 'Sem prazo — junte no seu ritmo.'}</span>
        </span>
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border" style={{ borderColor: hasDeadline ? 'var(--energy)' : 'rgb(var(--fg-rgb) / .2)', background: hasDeadline ? 'var(--energy)' : 'transparent' }}/>
      </button>
      {hasDeadline && <input type="date" className="field mt-3" value={deadline} min={today} onChange={event => setDeadline(event.target.value)}/>}

      <button onClick={() => valid && onSave({ title: title.trim(), target: targetValue, current: currentValue, deadline: hasDeadline ? deadline : undefined })}
        disabled={!valid} className="energy-button mt-6 w-full py-3" style={{ opacity: valid ? 1 : .45 }}>
        {initial ? 'Salvar alterações' : 'Criar objetivo'}
      </button>
    </motion.div>
  </motion.div>
}
