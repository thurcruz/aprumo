'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Moon } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
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
    <Link href="/saude" className="muted mb-5 inline-flex items-center gap-2 text-sm no-underline"><ArrowLeft size={15}/> Saúde</Link>
    <header className="mb-8"><p className="eyebrow">Sono</p><h1 className="display mt-3 text-4xl font-semibold md:text-5xl">Descanso também é treino.</h1><p className="muted mt-4 max-w-xl">Registre quanto e como você dormiu. Os padrões aparecem com o tempo.</p></header>
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <section className="surface p-6">
        <p className="eyebrow">Registrar noite</p>
        <label className="muted mt-5 block text-xs">Horas dormidas<input className="field mt-2" type="number" step="0.5" min="0" max="24" value={hours} onChange={event => setHours(event.target.value)}/></label>
        <p className="muted mt-5 text-xs">Qualidade percebida</p>
        <div className="mt-2 flex gap-2">{qualities.map(option => <button key={option.level} onClick={() => setQuality(option.level)} className="flex-1 rounded-xl border px-2 py-2 text-xs" style={{ borderColor: quality === option.level ? 'var(--energy)' : 'var(--line)', color: quality === option.level ? 'var(--accent)' : 'var(--muted)' }}>{option.label}</button>)}</div>
        <label className="muted mt-5 block text-xs">Nota (opcional)<input className="field mt-2" value={note} onChange={event => setNote(event.target.value)} placeholder="Dormi tarde, acordei bem…"/></label>
        <button onClick={save} className="energy-button mt-6 w-full py-3">Salvar noite</button>
      </section>
      <section className="surface p-6">
        <div className="flex items-center justify-between"><p className="eyebrow">Últimas noites</p><span className="muted text-sm">média {avg.toFixed(1)}h</span></div>
        <div className="mt-5 space-y-2">
          {entries.length === 0 && <p className="muted text-sm">Nenhum registro ainda.</p>}
          {entries.map(entry => <div key={entry.id} className="flex items-center gap-3 rounded-2xl border border-white/[.07] p-3">
            <Moon size={16} className="text-energy"/>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{entry.hours}h · {qualities.find(option => option.level === entry.quality)?.label}</p>{entry.note && <p className="muted text-xs">{entry.note}</p>}</div>
            <span className="muted shrink-0 text-xs">{new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
          </div>)}
        </div>
      </section>
    </div>
  </div>
}
