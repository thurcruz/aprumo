'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarRange, X } from 'lucide-react'
import type { GoalCategory } from '@/lib/types'
import { describeDeadline, isoDate } from '@/lib/utils'
import ChipSelect from '@/components/ui/ChipSelect'

export interface GoalDraft {
  title: string
  description: string
  category: GoalCategory
  deadline: string
}

/**
 * Financeiro não entra aqui: dinheiro se mede em valor, não em marcos.
 * Objetivo financeiro vive em /financas, com alvo em reais.
 * A opção reaparece se a meta que está sendo editada já for dessa categoria.
 */
const categories: { value: GoalCategory; label: string }[] = [
  { value: 'carreira', label: 'Carreira' },
  { value: 'saude', label: 'Saúde' },
  { value: 'relacionamentos', label: 'Relacionamentos' },
  { value: 'conhecimento', label: 'Conhecimento' },
]

/** Atalhos de prazo: quase toda meta cabe num destes horizontes. */
const presets = [
  { label: '1 mês', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: '1 ano', days: 365 },
]

const inDays = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

/**
 * Cria ou edita uma meta. O prazo é escolhido aqui — antes toda meta nascia com
 * 90 dias fixos que o usuário nunca via nem podia mudar.
 */
export default function GoalDialog({ heading, confirmLabel, initial, onCancel, onSave }: {
  heading: string
  confirmLabel: string
  initial?: Partial<GoalDraft>
  onCancel: () => void
  onSave: (draft: GoalDraft) => void
}) {
  const today = isoDate(new Date())
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState<GoalCategory>(initial?.category ?? 'carreira')
  const options = categories.some(item => item.value === category)
    ? categories
    : [...categories, { value: category, label: 'Financeiro (antiga)' }]
  const [deadline, setDeadline] = useState(initial?.deadline?.slice(0, 10) || inDays(90))

  const valid = title.trim().length >= 2 && Boolean(deadline)
  const hint = describeDeadline(deadline, today)

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
    <motion.div initial={{ scale: .96, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 15 }}
      className="surface my-auto w-full max-w-lg p-6" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{heading}</p>
          <h2 className="mt-1 text-2xl font-semibold">Onde você quer chegar?</h2>
        </div>
        <button className="icon-button shrink-0" onClick={onCancel} aria-label="Fechar"><X size={17}/></button>
      </div>

      <div className="mt-6 space-y-3">
        <input autoFocus className="field" placeholder="O que você quer alcançar?" maxLength={160}
          value={title} onChange={event => setTitle(event.target.value)}/>
        <textarea className="field resize-none" rows={3} placeholder="Por que isso importa?" maxLength={600}
          value={description} onChange={event => setDescription(event.target.value)}/>
        <ChipSelect size="sm" className="flex flex-wrap gap-2" value={category} onChange={setCategory} options={options}/>
      </div>

      <p className="muted mb-2 mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"><CalendarRange size={13}/> Até quando</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {presets.map(preset => {
          const value = inDays(preset.days)
          return <button key={preset.label} onClick={() => setDeadline(value)}
            className="rounded-full border px-3 py-1 text-xs transition"
            style={{ borderColor: deadline === value ? 'var(--energy)' : 'var(--line)', color: deadline === value ? 'var(--accent)' : 'var(--muted)' }}>{preset.label}</button>
        })}
      </div>
      <input type="date" className="field" value={deadline} min={today} onChange={event => setDeadline(event.target.value)}/>
      {hint && <p className="muted mt-2 text-xs">{hint}</p>}

      <button onClick={() => valid && onSave({ title: title.trim(), description: description.trim(), category, deadline })}
        disabled={!valid} className="energy-button mt-6 w-full py-3" style={{ opacity: valid ? 1 : .45 }}>{confirmLabel}</button>
    </motion.div>
  </motion.div>
}
