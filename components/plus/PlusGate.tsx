'use client'

import Link from 'next/link'
import { ArrowRight, Lock, Sparkles } from 'lucide-react'
import { usePlan } from '@/lib/plan'

export function PlusBadge({ className = '' }: { className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full bg-energy/[.12] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-energy ${className}`}><Sparkles size={11}/> Aprumo+</span>
}

export function PlusLock({ title, description }: { title: string; description: string }) {
  // A assinatura em si (mensal, anual, gerenciar) mora em Configurações — o
  // checkout precisa de uma chamada autenticada, não é mais um link estático.
  return <div className="surface relative overflow-hidden p-6">
    <Lock className="absolute -right-4 -top-4 h-24 w-24 text-energy/[.05]"/>
    <div className="mb-3 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-energy/10 text-energy"><Lock size={16}/></span><PlusBadge/></div>
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="muted mt-1 max-w-md text-sm">{description}</p>
    <Link href="/configuracoes?tab=aprumo-plus" className="mt-4 inline-flex items-center gap-2 rounded-full bg-energy px-4 py-2 text-sm font-semibold text-[#11130f] no-underline">Desbloquear com Aprumo+ <ArrowRight size={15}/></Link>
  </div>
}

/** Renderiza `children` para assinantes Aprumo+; caso contrário mostra o card de upsell. */
export function PlusGate({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const { plan, loading } = usePlan()
  if (loading) return <div className="surface animate-pulse p-6 opacity-60"><div className="h-4 w-1/3 rounded bg-white/10"/><div className="mt-3 h-3 w-2/3 rounded bg-white/5"/></div>
  if (plan === 'plus') return <>{children}</>
  return <PlusLock title={title} description={description}/>
}
