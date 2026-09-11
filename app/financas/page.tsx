'use client'
import {useState} from 'react';import Link from 'next/link';import {AnimatePresence,motion} from 'framer-motion';import {ArrowDownLeft,ArrowLeft,ArrowUpRight,CheckCircle2,Pencil,PiggyBank,Plus,Trash2,X} from 'lucide-react';import {useAprumoStore} from '@/lib/store';import type {FinancialGoal,TransactionType} from '@/lib/types';import {describeDeadline,formatCurrency,formatDate,isoDate} from '@/lib/utils';import FinancialGoalDialog from '@/components/modules/FinancialGoalDialog'
export default function Financeiro(){const{store,addTransaction,deleteTransaction,addFinancialGoal,updateFinancialGoal,deleteFinancialGoal}=useAprumoStore();const today=isoDate(new Date());const[goalOpen,setGoalOpen]=useState(false);const[editingGoal,setEditingGoal]=useState<FinancialGoal|null>(null);const[open,setOpen]=useState(false);const[type,setType]=useState<TransactionType>('saida');const[amount,setAmount]=useState('');const[desc,setDesc]=useState('');const month=store.transactions.filter(t=>new Date(t.createdAt).getMonth()===new Date().getMonth());const income=month.filter(t=>t.type==='entrada').reduce((s,t)=>s+t.amount,0);const expenses=month.filter(t=>t.type==='saida').reduce((s,t)=>s+t.amount,0);function saveGoal(draft:Omit<FinancialGoal,'id'>){
  if(editingGoal){updateFinancialGoal({...editingGoal,...draft});setEditingGoal(null);return}
  addFinancialGoal({id:crypto.randomUUID(),...draft});setGoalOpen(false)
}
function add(){if(!desc.trim()||!amount)return;addTransaction({id:crypto.randomUUID(),description:desc.trim(),amount:Number(amount),type,category:'Outros',createdAt:new Date().toISOString()});setOpen(false);setAmount('');setDesc('')}return <div className="page-wrap"><header className="flex items-start justify-between"><div><Link href="/perfil" className="muted mb-5 inline-flex items-center gap-2 text-sm no-underline"><ArrowLeft size={15}/> Seu sistema</Link><p className="eyebrow">Financeiro</p><h1 className="display mt-3 text-4xl font-semibold md:text-6xl">Dinheiro também<br/>é comportamento.</h1><p className="muted mt-4">Consciência suficiente para decidir melhor, sem complexidade desnecessária.</p></div><button className="energy-button mt-9 flex items-center gap-2 px-5 py-3" onClick={()=>setOpen(true)}><Plus size={17}/><span className="hidden sm:inline">Transação</span></button></header><section className="mt-10 grid gap-4 sm:grid-cols-3"><div className="surface p-6 sm:col-span-1"><p className="eyebrow">Saldo do mês</p><strong className="mt-5 block text-3xl">{formatCurrency(income-expenses)}</strong><p className="muted mt-2 text-xs">Receitas menos despesas registradas</p></div><div className="surface p-6"><ArrowDownLeft className="text-energy"/><strong className="mt-5 block text-2xl">{formatCurrency(income)}</strong><span className="muted text-xs">entradas</span></div><div className="surface p-6"><ArrowUpRight className="text-danger"/><strong className="mt-5 block text-2xl">{formatCurrency(expenses)}</strong><span className="muted text-xs">saídas</span></div></section><div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_.8fr]"><section><p className="eyebrow mb-3">Movimentos recentes</p><div className="surface overflow-hidden">{[...store.transactions].reverse().map(tx=><div key={tx.id} className="group flex items-center gap-4 border-b border-white/[.07] p-4 last:border-0"><span className="grid h-10 w-10 place-items-center rounded-full bg-white/[.04]">{tx.type==='entrada'?<ArrowDownLeft size={17} className="text-energy"/>:<ArrowUpRight size={17} className="text-danger"/>}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{tx.description}</p><p className="muted mt-1 text-xs">{tx.category} · {formatDate(tx.createdAt)}</p></div><strong className={tx.type==='entrada'?'text-energy':'text-white'}>{tx.type==='entrada'?'+':'−'} {formatCurrency(tx.amount)}</strong><button onClick={()=>deleteTransaction(tx.id)} className="text-white/20 opacity-0 hover:text-danger group-hover:opacity-100"><Trash2 size={14}/></button></div>)}</div></section><aside>
  <div className="mb-3 flex items-center justify-between">
    <p className="eyebrow">Próximos destinos</p>
    <button onClick={()=>setGoalOpen(true)} className="muted flex items-center gap-1 text-xs hover:text-white"><Plus size={13}/> Novo</button>
  </div>
  {/* Objetivo financeiro se mede em dinheiro — por isso vive aqui, e não em
      /metas, onde o progresso vem de marcos e constância de hábito. */}
  {store.financialGoals.length===0
    ? <div className="surface p-6 text-center">
        <PiggyBank size={20} className="mx-auto text-energy"/>
        <p className="mt-3 text-sm font-semibold">Nenhum objetivo ainda</p>
        <p className="muted mx-auto mt-1 max-w-xs text-xs">Uma reserva, uma viagem, uma troca de carro. Diga quanto precisa e acompanhe o quanto já juntou.</p>
        <button onClick={()=>setGoalOpen(true)} className="energy-button mt-4 px-4 py-2 text-xs">Criar objetivo</button>
      </div>
    : <div className="space-y-3">{store.financialGoals.map(g=>{
        const percent=Math.min(100,Math.round(g.current/g.target*100))
        const reached=g.current>=g.target
        const missing=Math.max(0,g.target-g.current)
        return <div key={g.id} className="surface group p-5" style={{borderColor:reached?'rgba(208,224,39,.4)':undefined}}>
          <div className="flex items-center gap-2">
            {reached?<CheckCircle2 size={18} className="shrink-0 text-energy"/>:<PiggyBank size={18} className="shrink-0 text-energy"/>}
            <strong className="min-w-0 flex-1 truncate text-sm">{g.title}</strong>
            <span className="muted text-xs">{percent}%</span>
            <button onClick={()=>setEditingGoal(g)} aria-label="Editar objetivo" className="text-white/25 transition hover:text-white md:opacity-0 md:group-hover:opacity-100"><Pencil size={13}/></button>
            <button onClick={()=>deleteFinancialGoal(g.id)} aria-label="Excluir objetivo" className="text-white/25 transition hover:text-danger md:opacity-0 md:group-hover:opacity-100"><Trash2 size={13}/></button>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-energy transition-all" style={{width:`${percent}%`}}/></div>
          <p className="muted mt-2 text-xs">{formatCurrency(g.current)} de {formatCurrency(g.target)}</p>
          <p className="mt-1 text-xs" style={{color:reached?'var(--accent)':'var(--muted)'}}>
            {reached?'Objetivo alcançado.':`Faltam ${formatCurrency(missing)}`}
            {!reached&&g.deadline&&` · ${describeDeadline(g.deadline,today)}`}
          </p>
        </div>
      })}</div>}
</aside></div><AnimatePresence>
  {goalOpen&&<FinancialGoalDialog key="novo-objetivo" onCancel={()=>setGoalOpen(false)} onSave={saveGoal}/>}
  {editingGoal&&<FinancialGoalDialog key={editingGoal.id} initial={editingGoal} onCancel={()=>setEditingGoal(null)} onSave={saveGoal}/>}
</AnimatePresence>
<AnimatePresence>{open&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={()=>setOpen(false)}><motion.div initial={{scale:.96,y:15}} animate={{scale:1,y:0}} className="surface w-full max-w-md p-6" onClick={e=>e.stopPropagation()}><div className="flex justify-between"><div><p className="eyebrow">Novo movimento</p><h2 className="mt-1 text-2xl font-semibold">Registrar transação</h2></div><button className="icon-button" onClick={()=>setOpen(false)}><X size={17}/></button></div><div className="mt-6 grid grid-cols-2 gap-2">{(['entrada','saida'] as TransactionType[]).map(t=><button key={t} onClick={()=>setType(t)} className="rounded-xl border p-3 text-sm" style={{borderColor:type===t?'var(--energy)':'rgb(var(--fg-rgb) / .1)',color:type===t?'var(--accent)':'var(--muted)',background:type===t?'rgba(208,224,39,.08)':'transparent'}}>{t==='entrada'?'Entrada':'Saída'}</button>)}</div><input className="field mt-3" type="number" placeholder="Valor em reais" value={amount} onChange={e=>setAmount(e.target.value)}/><input className="field mt-3" placeholder="Descrição" value={desc} onChange={e=>setDesc(e.target.value)}/><button className="energy-button mt-5 w-full py-3" onClick={add}>Registrar</button></motion.div></motion.div>}</AnimatePresence></div>}
