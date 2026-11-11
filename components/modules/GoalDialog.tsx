'use client'

import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import type { GoalCategory } from '@/lib/types'
import { describeDeadline, isoDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import FieldLabel from '@/components/ui/FieldLabel'
import Sheet from '@/components/ui/Sheet'

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

  return <Sheet managed onClose={onCancel} eyebrow={heading} title="Onde você quer chegar?"
    footer={<Button fullWidth disabled={!valid} onClick={() => valid && onSave({ title: title.trim(), description: description.trim(), category, deadline })}>{confirmLabel}</Button>}>
    <div className="space-y-3">
      <input autoFocus className="field" placeholder="O que você quer alcançar?" maxLength={160}
        value={title} onChange={event => setTitle(event.target.value)}/>
      <textarea className="field resize-none" rows={3} placeholder="Por que isso importa?" maxLength={600}
        value={description} onChange={event => setDescription(event.target.value)}/>
    </div>

    <FieldLabel>Área</FieldLabel>
    <div className="flex flex-wrap gap-1.5">
      {options.map(option => <Chip key={option.value} selected={category === option.value} onClick={() => setCategory(option.value)}>{option.label}</Chip>)}
    </div>

    <FieldLabel icon={CalendarRange}>Até quando</FieldLabel>
    <div className="mb-3 flex flex-wrap gap-1.5">
      {presets.map(preset => {
        const value = inDays(preset.days)
        return <Chip key={preset.label} size="sm" selected={deadline === value} onClick={() => setDeadline(value)}>{preset.label}</Chip>
      })}
    </div>
    <input type="date" className="field" value={deadline} min={today} onChange={event => setDeadline(event.target.value)}/>
    {hint && <p className="mt-2 text-caption text-fg-2">{hint}</p>}
  </Sheet>
}
