'use client'

import { useState } from 'react'
import { Brain, CalendarDays } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import type { MoodLevel } from '@/lib/types'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import SectionHeader from '@/components/ui/SectionHeader'
import { cx } from '@/lib/cx'

const moods = ['😞', '😕', '😐', '🙂', '🔥']

export default function Emocional() {
  const { store, addMood } = useAprumoStore()
  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<MoodLevel | 0>(0)

  function save() {
    if (!selected) return
    addMood({ id: crypto.randomUUID(), date: new Date().toISOString(), mood: selected, note: note.trim() })
    setNote('')
    setSelected(0)
  }

  return <div className="page-wrap">
    <PageHeader back={{ href: '/hoje', label: 'Hoje' }} title="Humor & bem-estar" description="Perceber antes de reagir. Um registro rápido para encontrar relações entre energia, rotina e execução."/>
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card padding="lg">
        <p className="text-h3">Como você está agora?</p>
        <div className="mt-5 flex justify-between">
          {moods.map((m, i) => {
            const active = selected === i + 1
            return <button key={m} onClick={() => setSelected((i + 1) as MoodLevel)} aria-label={`Humor ${i + 1} de 5`} aria-pressed={active}
              className={cx('grid h-12 w-12 place-items-center rounded-full border text-xl transition duration-200 ease-ap', active ? '-translate-y-1 border-area-line bg-area-soft' : 'border-line bg-surface-2 hover:border-line-strong')}>{m}</button>
          })}
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)} className="field mt-6 resize-none" rows={3} placeholder="O que pode ter influenciado? (opcional)"/>
        <Button className="mt-4" fullWidth disabled={!selected} onClick={save}>Registrar momento</Button>
      </Card>
      <Card padding="lg">
        <SectionHeader as="h3" title="Últimos registros" action={<CalendarDays size={18} className="text-area-ink"/>}/>
        <div className="mt-4 space-y-2">
          {[...store.moods].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 6).map(m => <div key={m.id} className="flex items-center gap-4 rounded-control bg-surface-2 p-3">
            <span className="text-2xl">{moods[m.mood - 1]}</span>
            <div className="min-w-0">
              <p className="text-body-s">{new Date(m.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}</p>
              <p className="mt-0.5 truncate text-caption text-fg-3">{m.note || 'Sem observação'}</p>
            </div>
          </div>)}
          {store.moods.length === 0 && <p className="text-body-s text-fg-2">Nenhum registro ainda.</p>}
        </div>
      </Card>
    </div>
    <Card className="mt-4 flex gap-4">
      <Brain className="shrink-0 text-area-ink"/>
      <div><p className="text-h3">Padrões precisam de contexto</p><p className="mt-1 text-body-s text-fg-2">O registro descreve como você se sentiu; ele não é diagnóstico clínico nem avaliação de desempenho.</p></div>
    </Card>
  </div>
}
