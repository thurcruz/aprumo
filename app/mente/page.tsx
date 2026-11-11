'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Check, Lightbulb, Plus, Quote, Search, Sparkles, Trash2 } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import type { BookStatus, RepertoireKind } from '@/lib/types'
import { PlusGate } from '@/components/plus/PlusGate'
import { todaysDose } from '@/lib/dose'
import HabitDialog, { type HabitDraft } from '@/components/modules/HabitDialog'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Chip from '@/components/ui/Chip'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import ProgressBar from '@/components/ui/ProgressBar'
import SectionHeader from '@/components/ui/SectionHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import Sheet from '@/components/ui/Sheet'

const colors = ['#4f5844', '#70443c', '#344d62', '#5d4c6d', '#6b5b37']
const labels: Record<BookStatus, string> = { 'quero-ler': 'Quero ler', lendo: 'Lendo', lido: 'Concluído' }
const kinds: { value: RepertoireKind; label: string }[] = [
  { value: 'aprendizado', label: 'Aprendizado' },
  { value: 'ideia', label: 'Ideia' },
  { value: 'citacao', label: 'Citação' },
  { value: 'nota', label: 'Nota' },
]

export default function Conhecimento() {
  const { store, addTask, addBook, updateBook, addRepertoire, deleteRepertoire } = useAprumoStore()
  const dose = todaysDose()
  const [doseSaved, setDoseSaved] = useState(false)
  const [habitFrom, setHabitFrom] = useState<string | null>(null)
  const [repText, setRepText] = useState('')
  const [repKind, setRepKind] = useState<RepertoireKind>('aprendizado')
  const [filter, setFilter] = useState<'todos' | BookStatus>('todos')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [total, setTotal] = useState('')
  const [progressOpen, setProgressOpen] = useState(false)
  const [page, setPage] = useState('')
  const [progressTotal, setProgressTotal] = useState('')

  const books = store.books.filter(b => (filter === 'todos' || b.status === filter) && `${b.title} ${b.author}`.toLowerCase().includes(query.toLowerCase()))
  const reading = store.books.find(b => b.status === 'lendo')
  const readingPct = reading && reading.totalPages ? Math.min(100, Math.round((reading.currentPage ?? 0) / reading.totalPages * 100)) : null
  const doseLabel = `Dose #${String(dose.number).padStart(3, '0')}`

  function createHabit(draft: HabitDraft) {
    setHabitFrom(null)
    addTask({ id: crypto.randomUUID(), title: draft.title, category: 'fixa', completed: false, createdAt: new Date().toISOString(), dayBlock: draft.dayBlock, priority: 2, source: 'manual', frequency: draft.frequency, startTime: draft.startTime, durationMinutes: draft.durationMinutes, goalId: draft.goalId })
  }

  function submit() {
    if (!title.trim()) return
    addBook({ id: crypto.randomUUID(), title: title.trim(), author: author.trim() || 'Autor não informado', status: 'quero-ler', totalPages: total ? Number(total) : undefined })
    setTitle(''); setAuthor(''); setTotal(''); setOpen(false)
  }

  function openProgress() {
    if (!reading) return
    setPage(String(reading.currentPage ?? ''))
    setProgressTotal(String(reading.totalPages ?? ''))
    setProgressOpen(true)
  }

  function saveProgress() {
    if (!reading) return
    updateBook({ ...reading, currentPage: page ? Number(page) : 0, totalPages: progressTotal ? Number(progressTotal) : undefined })
    setProgressOpen(false)
  }

  function saveRepertoire() {
    if (repText.trim().length < 2) return
    addRepertoire({ id: crypto.randomUUID(), kind: repKind, text: repText.trim(), createdAt: new Date().toISOString() })
    setRepText('')
  }

  return <div className="page-wrap">
    <PageHeader title="Mente" description="Consuma com intenção, registre o que entendeu e transforme ideias em ações."
      actions={<Button icon={<Plus size={17}/>} onClick={() => setOpen(true)}>Livro</Button>}/>

    <Card padding="lg">
      <p className="flex items-center gap-1.5 text-label uppercase text-area-ink"><Sparkles size={13}/> {doseLabel}</p>
      <h2 className="mt-3 text-h1">{dose.title}</h2>
      <p className="mt-1 text-caption text-fg-3">{dose.minutes} min · {dose.tags.join(' · ')}</p>
      <p className="mt-4 max-w-2xl text-body text-fg-1">{dose.body}</p>
      <div className="mt-5 max-w-2xl rounded-control border border-line bg-surface-2 p-4">
        <p className="text-caption text-fg-3">Para o repertório</p>
        <p className="mt-1 text-body-s">{dose.takeaway}</p>
      </div>
      <Button className="mt-5" variant={doseSaved ? 'secondary' : 'accent'} disabled={doseSaved} icon={doseSaved ? <Check size={15}/> : <Plus size={15}/>}
        onClick={() => { addRepertoire({ id: crypto.randomUUID(), kind: 'aprendizado', text: dose.takeaway, source: doseLabel, createdAt: new Date().toISOString() }); setDoseSaved(true) }}>
        {doseSaved ? 'Salvo no repertório' : 'Salvar no Repertório'}
      </Button>
    </Card>

    <section className="mt-4">
      <PlusGate title="Doses de todos os dias" description="Reveja e salve todas as Doses anteriores — conteúdo editorial diário para construir repertório.">
        <Card padding="lg"><p className="text-label uppercase text-fg-2">Arquivo de Doses</p><p className="mt-2 text-body-s text-fg-2">Você tem acesso a todas as Doses já publicadas. Role o histórico e salve o que fizer sentido.</p></Card>
      </PlusGate>
    </section>

    {reading && <Card padding="none" className="mt-8 grid overflow-hidden md:grid-cols-[200px_1fr]">
      <div className="theme-dark grid min-h-40 place-items-center bg-[#344d62] p-8"><BookOpen size={48} className="text-white/70"/></div>
      <div className="p-5 md:p-6">
        <p className="text-label uppercase text-fg-2">Continue de onde parou</p>
        <h2 className="mt-2 text-h1">{reading.title}</h2>
        <p className="mt-1 text-body-s text-fg-2">{reading.author}</p>
        {readingPct !== null
          ? <div className="mt-6 max-w-xl">
              <ProgressBar value={readingPct} size="lg" label={`Leitura de ${reading.title}`}/>
              <div className="mt-2 flex justify-between text-caption tabular-nums text-fg-2"><span>Página {reading.currentPage ?? 0} de {reading.totalPages}</span><span>{readingPct}%</span></div>
            </div>
          : <p className="mt-6 max-w-xl text-body-s text-fg-2">Defina o total de páginas para acompanhar seu progresso.</p>}
        <Button className="mt-5" size="sm" variant="secondary" onClick={openProgress}>Atualizar progresso</Button>
      </div>
    </Card>}

    <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SegmentedControl label="Filtrar livros" value={filter} onChange={setFilter}
        options={[{ value: 'todos', label: 'Todos' }, { value: 'lendo', label: labels.lendo }, { value: 'quero-ler', label: labels['quero-ler'] }, { value: 'lido', label: labels.lido }]}/>
      <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface-1 px-4 focus-within:border-line-strong">
        <Search size={15} className="text-fg-3"/>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar" aria-label="Buscar livros" className="min-w-0 flex-1 bg-transparent text-body-s outline-none placeholder:text-fg-3"/>
      </label>
    </div>

    <section className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {books.map((book, i) => <motion.article layout key={book.id} className="group">
        <div className="theme-dark relative aspect-[3/4] overflow-hidden rounded-card border border-white/10 p-5" style={{ background: `linear-gradient(145deg,${colors[i % colors.length]},#151713)` }}>
          <div className="absolute inset-y-0 left-3 w-px bg-white/10"/>
          <BookOpen size={23} className="text-white/45"/>
          <p className="mt-8 text-lg font-semibold leading-tight">{book.title}</p>
          <p className="mt-2 text-xs text-white/55">{book.author}</p>
          {book.status === 'lido' && <span className="absolute bottom-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-area text-on-fill"><Check size={16}/></span>}
        </div>
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="min-w-0"><p className="truncate text-body-s font-medium">{book.title}</p><p className="mt-0.5 text-caption text-fg-3">{labels[book.status]}</p></div>
          <select aria-label={`Status de ${book.title}`} value={book.status} onChange={e => updateBook({ ...book, status: e.target.value as BookStatus })} className="max-w-6 bg-transparent text-transparent outline-none">
            <option value="quero-ler">Quero ler</option><option value="lendo">Lendo</option><option value="lido">Concluído</option>
          </select>
        </div>
      </motion.article>)}
    </section>
    {store.books.length === 0 && <Card padding="none"><EmptyState icon={BookOpen} title="Sua biblioteca está vazia" description="Adicione o livro que você está lendo — ou o próximo da lista."
      action={<Button size="sm" variant="secondary" icon={<Plus size={15}/>} onClick={() => setOpen(true)}>Adicionar livro</Button>}/></Card>}

    <Card className="mt-10 flex flex-col gap-4 md:flex-row md:items-center">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-area-soft text-area-ink"><Lightbulb size={20}/></span>
      <div className="flex-1"><p className="text-h3">Transforme um aprendizado em ação</p><p className="mt-1 text-body-s text-fg-2">&quot;{dose.takeaway}&quot;</p></div>
      <Button variant="secondary" onClick={() => setHabitFrom(dose.takeaway)}>Criar hábito a partir disso</Button>
    </Card>

    <AnimatePresence>
      {habitFrom && <HabitDialog key="mente-habito" heading="Novo hábito" confirmLabel="Adicionar à rotina" goals={store.goals.filter(g => g.status === 'active' || g.status === 'paused')}
        initial={{ title: habitFrom.length <= 160 ? habitFrom : habitFrom.slice(0, 157) + '…', dayBlock: 'livre' }} onCancel={() => setHabitFrom(null)} onSave={createHabit}/>}
    </AnimatePresence>

    <section className="mt-10">
      <SectionHeader className="mb-4" title="Repertório" action={<Quote size={17} className="text-area-ink"/>}/>
      <Card className="mb-4">
        <textarea value={repText} onChange={e => setRepText(e.target.value)} placeholder="Salve uma ideia, citação ou aprendizado…" className="field min-h-17.5 resize-none" maxLength={240}/>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {kinds.map(kind => <Chip key={kind.value} size="sm" selected={repKind === kind.value} onClick={() => setRepKind(kind.value)}>{kind.label}</Chip>)}
          <Button className="ml-auto" size="sm" icon={<Plus size={15}/>} onClick={saveRepertoire}>Salvar</Button>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {store.repertoire.map(item => <Card key={item.id} className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <span className="rounded-full bg-area-soft px-2 py-0.5 text-label uppercase text-area-ink">{kinds.find(kind => kind.value === item.kind)?.label ?? item.kind}</span>
            <p className="mt-2 text-body-s">{item.text}</p>
            {item.source && <p className="mt-1 text-caption text-fg-3">— {item.source}</p>}
          </div>
          <button onClick={() => deleteRepertoire(item.id)} aria-label="Remover" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-fg-3 hover:text-alert"><Trash2 size={15}/></button>
        </Card>)}
        {store.repertoire.length === 0 && <p className="text-body-s text-fg-2">Nada salvo ainda. Comece pela Dose de hoje.</p>}
      </div>
    </section>

    <Sheet open={open} onClose={() => setOpen(false)} eyebrow="Nova leitura" title="Adicionar livro"
      footer={<Button fullWidth onClick={submit}>Adicionar à biblioteca</Button>}>
      <div className="space-y-3">
        <input autoFocus className="field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do livro"/>
        <input className="field" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Autor"/>
        <input className="field" type="number" min="1" inputMode="numeric" value={total} onChange={e => setTotal(e.target.value)} placeholder="Total de páginas (opcional)"/>
      </div>
    </Sheet>

    <Sheet open={progressOpen && Boolean(reading)} onClose={() => setProgressOpen(false)} eyebrow="Leitura em andamento" title="Atualizar progresso" description={reading?.title}
      footer={<Button fullWidth onClick={saveProgress}>Salvar progresso</Button>}>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-caption text-fg-2">Página atual<input autoFocus className="field mt-1.5" type="number" min="0" inputMode="numeric" value={page} onChange={e => setPage(e.target.value)}/></label>
        <label className="text-caption text-fg-2">Total de páginas<input className="field mt-1.5" type="number" min="1" inputMode="numeric" value={progressTotal} onChange={e => setProgressTotal(e.target.value)}/></label>
      </div>
    </Sheet>
  </div>
}
