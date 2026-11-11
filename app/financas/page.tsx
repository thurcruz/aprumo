'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import type { FinancialGoal, TransactionType } from '@/lib/types'
import { describeDeadline, formatCurrency, formatDate, isoDate, isSameMonth } from '@/lib/utils'
import FinancialGoalDialog from '@/components/modules/FinancialGoalDialog'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import ProgressBar from '@/components/ui/ProgressBar'
import SectionHeader from '@/components/ui/SectionHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import Sheet from '@/components/ui/Sheet'

export default function Financeiro() {
  const { store, addTransaction, deleteTransaction, addFinancialGoal, updateFinancialGoal, deleteFinancialGoal } = useAprumoStore()
  const today = isoDate(new Date())
  const [goalOpen, setGoalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TransactionType>('saida')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')

  const now = new Date()
  const month = store.transactions.filter(t => isSameMonth(t.createdAt, now))
  const income = month.filter(t => t.type === 'entrada').reduce((s, t) => s + t.amount, 0)
  const expenses = month.filter(t => t.type === 'saida').reduce((s, t) => s + t.amount, 0)

  function saveGoal(draft: Omit<FinancialGoal, 'id'>) {
    if (editingGoal) { updateFinancialGoal({ ...editingGoal, ...draft }); setEditingGoal(null); return }
    addFinancialGoal({ id: crypto.randomUUID(), ...draft }); setGoalOpen(false)
  }

  function add() {
    if (!desc.trim() || !amount) return
    addTransaction({ id: crypto.randomUUID(), description: desc.trim(), amount: Number(amount), type, category: 'Outros', createdAt: new Date().toISOString() })
    setOpen(false); setAmount(''); setDesc('')
  }

  return <div className="page-wrap">
    <PageHeader title="Finanças" description="Consciência suficiente para decidir melhor, sem complexidade desnecessária."
      actions={<Button icon={<Plus size={17}/>} onClick={() => setOpen(true)}>Transação</Button>}/>

    <section className="grid gap-3 sm:grid-cols-3">
      <Card>
        <p className="text-label uppercase text-fg-2">Saldo do mês</p>
        <strong className="mt-4 block text-metric-l tabular-nums">{formatCurrency(income - expenses)}</strong>
        <p className="mt-2 text-caption text-fg-3">Receitas menos despesas registradas</p>
      </Card>
      <Card>
        <ArrowDownLeft size={20} className="text-area-ink"/>
        <strong className="mt-4 block text-metric-m tabular-nums">{formatCurrency(income)}</strong>
        <span className="text-caption text-fg-2">entradas</span>
      </Card>
      <Card>
        <ArrowUpRight size={20} className="text-fg-2"/>
        <strong className="mt-4 block text-metric-m tabular-nums">{formatCurrency(expenses)}</strong>
        <span className="text-caption text-fg-2">saídas</span>
      </Card>
    </section>

    <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
      <section>
        <SectionHeader className="mb-3" title="Movimentos recentes"/>
        {store.transactions.length === 0
          ? <Card padding="none"><EmptyState compact icon={ArrowDownLeft} title="Nenhum movimento ainda" description="Registre uma entrada ou saída para o saldo do mês aparecer."/></Card>
          : <Card padding="none" className="overflow-hidden">
              {[...store.transactions].reverse().map(tx => <div key={tx.id} className="group flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2">
                  {tx.type === 'entrada' ? <ArrowDownLeft size={17} className="text-area-ink"/> : <ArrowUpRight size={17} className="text-fg-2"/>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-s font-medium">{tx.description}</p>
                  <p className="mt-0.5 text-caption text-fg-3">{tx.category} · {formatDate(tx.createdAt)}</p>
                </div>
                <strong className={`shrink-0 text-body-s font-semibold tabular-nums ${tx.type === 'entrada' ? 'text-area-ink' : 'text-fg-1'}`}>{tx.type === 'entrada' ? '+' : '−'} {formatCurrency(tx.amount)}</strong>
                <button onClick={() => deleteTransaction(tx.id)} aria-label="Excluir transação" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-fg-3 transition hover:text-alert md:opacity-0 md:group-hover:opacity-100"><Trash2 size={14}/></button>
              </div>)}
            </Card>}
      </section>

      <aside>
        <SectionHeader className="mb-3" title="Próximos destinos"
          action={<Button size="sm" variant="ghost" icon={<Plus size={14}/>} onClick={() => setGoalOpen(true)}>Novo</Button>}/>
        {/* Objetivo financeiro se mede em dinheiro — por isso vive aqui, e não em
            /metas, onde o progresso vem de marcos e constância de hábito. */}
        {store.financialGoals.length === 0
          ? <Card padding="none"><EmptyState compact icon={PiggyBank} title="Nenhum objetivo ainda"
              description="Uma reserva, uma viagem, uma troca de carro. Diga quanto precisa e acompanhe o quanto já juntou."
              action={<Button size="sm" variant="secondary" onClick={() => setGoalOpen(true)}>Criar objetivo</Button>}/></Card>
          : <div className="space-y-3">{store.financialGoals.map(g => {
              const percent = Math.min(100, Math.round(g.current / g.target * 100))
              const reached = g.current >= g.target
              const missing = Math.max(0, g.target - g.current)
              return <Card key={g.id} selected={reached} className="group">
                <div className="flex items-center gap-2">
                  {reached ? <CheckCircle2 size={18} className="shrink-0 text-area-ink"/> : <PiggyBank size={18} className="shrink-0 text-area-ink"/>}
                  <strong className="min-w-0 flex-1 truncate text-body-s font-medium">{g.title}</strong>
                  <span className="text-caption tabular-nums text-fg-2">{percent}%</span>
                  <button onClick={() => setEditingGoal(g)} aria-label="Editar objetivo" className="grid h-8 w-8 place-items-center rounded-full text-fg-3 transition hover:text-fg-1 md:opacity-0 md:group-hover:opacity-100"><Pencil size={13}/></button>
                  <button onClick={() => deleteFinancialGoal(g.id)} aria-label="Excluir objetivo" className="grid h-8 w-8 place-items-center rounded-full text-fg-3 transition hover:text-alert md:opacity-0 md:group-hover:opacity-100"><Trash2 size={13}/></button>
                </div>
                <ProgressBar className="mt-4" value={percent} label={g.title}/>
                <p className="mt-2 text-caption text-fg-2">{formatCurrency(g.current)} de {formatCurrency(g.target)}</p>
                <p className={`mt-1 text-caption ${reached ? 'text-area-ink' : 'text-fg-3'}`}>
                  {reached ? 'Objetivo alcançado.' : `Faltam ${formatCurrency(missing)}`}
                  {!reached && g.deadline && ` · ${describeDeadline(g.deadline, today)}`}
                </p>
              </Card>
            })}</div>}
      </aside>
    </div>

    <AnimatePresence>
      {goalOpen && <FinancialGoalDialog key="novo-objetivo" onCancel={() => setGoalOpen(false)} onSave={saveGoal}/>}
      {editingGoal && <FinancialGoalDialog key={editingGoal.id} initial={editingGoal} onCancel={() => setEditingGoal(null)} onSave={saveGoal}/>}
    </AnimatePresence>

    <Sheet open={open} onClose={() => setOpen(false)} eyebrow="Novo movimento" title="Registrar transação"
      footer={<Button fullWidth onClick={add}>Registrar</Button>}>
      <div className="space-y-3">
        <SegmentedControl label="Tipo de movimento" stretch value={type} onChange={setType}
          options={[{ value: 'entrada', label: 'Entrada' }, { value: 'saida', label: 'Saída' }]}/>
        <input autoFocus className="field" type="number" inputMode="decimal" placeholder="Valor em reais" value={amount} onChange={e => setAmount(e.target.value)}/>
        <input className="field" placeholder="Descrição" value={desc} onChange={e => setDesc(e.target.value)}/>
      </div>
    </Sheet>
  </div>
}
