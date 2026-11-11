'use client'

import { useState } from 'react'
import { Moon } from 'lucide-react'
import Chip from '@/components/ui/Chip'
import PageHeader from '@/components/ui/PageHeader'
import { useAprumoStore } from '@/lib/store'
import { formatHours } from '@/lib/utils'
import type { MoodLevel } from '@/lib/types'

const qualities: { level: MoodLevel; label: string }[] = [
  { level: 1, label: 'Péssimo' },
  { level: 2, label: 'Ruim' },
  { level: 3, label: 'Ok' },
  { level: 4, label: 'Bom' },
  { level: 5, label: 'Ótimo' },
]

export default function SonoPage() {
  const { store, addSleep } = useAprumoStore()
  const [hours, setHours] = useState('7.5')
  const [quality, setQuality] = useState<MoodLevel>(4)
  const [note, setNote] = useState('')

  const entries = [...store.sleep].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 7)
  const avg = entries.length ? entries.reduce((sum, entry) => sum + entry.hours, 0) / entries.length : 0

  const save = () => {
    const value = Number(hours)
    if (!Number.isFinite(value) || value <= 0 || value > 24) return
    addSleep({ id: crypto.randomUUID(), date: new Date().toISOString(), hours: value, quality, note: note.trim() || undefined })
    setNote('')
  }

  return <div className="page-wrap">
    <PageHeader back={{ href: '/extensoes', label: 'Áreas' }} title="Sono" description="Descanso também é treino. Registre quanto e como você dormiu — os padrões aparecem com o tempo."/>
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <section className="surface p-6">
        <p className="eyebrow">Registrar noite</p>
        <label className="muted mt-5 block text-xs">Horas dormidas<input className="field mt-2" type="number" step="0.5" min="0" max="24" value={hours} onChange={event => setHours(event.target.value)}/></label>
        <p className="muted mt-5 text-xs">Qualidade percebida</p>
        <div className="mt-2 flex gap-1.5">{qualities.map(option => <Chip key={option.level} shape="square" size="sm" className="h-10" selected={quality === option.level} onClick={() => setQuality(option.level)}>{option.label}</Chip>)}</div>
        <label className="muted mt-5 block text-xs">Nota (opcional)<input className="field mt-2" value={note} onChange={event => setNote(event.target.value)} placeholder="Dormi tarde, acordei bem…"/></label>
        <button onClick={save} className="energy-button mt-6 w-full py-3">Salvar noite</button>
      </section>
      <section className="surface p-6">
        <div className="flex items-center justify-between"><p className="eyebrow">Últimas noites</p>{entries.length > 0 && <span className="muted text-sm">média {formatHours(avg)}</span>}</div>
        <div className="mt-5 space-y-2">
          {entries.length === 0 && <p className="muted text-sm">Nenhum registro ainda.</p>}
          {entries.map(entry => <div key={entry.id} className="flex items-center gap-3 rounded-2xl border border-white/[.07] p-3">
            <Moon size={16} className="text-energy"/>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{formatHours(entry.hours)} · {qualities.find(option => option.level === entry.quality)?.label}</p>{entry.note && <p className="muted text-xs">{entry.note}</p>}</div>
            <span className="muted shrink-0 text-xs">{new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
          </div>)}
        </div>
      </section>
    </div>
  </div>
}
