'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, HeartPulse, Sparkles, Target, WalletCards } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import type { GoalCategory } from '@/lib/types'

const areas = [
  { id: 'carreira' as GoalCategory, label: 'Carreira e negócio', icon: BriefcaseBusiness },
  { id: 'saude' as GoalCategory, label: 'Saúde e energia', icon: HeartPulse },
  { id: 'financeiro' as GoalCategory, label: 'Vida financeira', icon: WalletCards },
  { id: 'relacionamentos' as GoalCategory, label: 'Relacionamentos', icon: Sparkles },
]

export default function OnboardingPage() {
  const router = useRouter(); const { store, setUserName, setPurpose, addGoal } = useAprumoStore()
  const [step, setStep] = useState(1); const [name, setName] = useState(store.userName === 'Arthur' ? '' : store.userName); const [purpose, setLocalPurpose] = useState(''); const [area, setArea] = useState<GoalCategory>('carreira'); const [goal, setGoal] = useState(''); const [loading, setLoading] = useState(false)
  const canContinue = step === 1 ? name.trim().length >= 2 && purpose.trim().length >= 8 : step === 2 ? Boolean(area) : goal.trim().length >= 4
  async function finish() {
    if (!canContinue) return; setLoading(true)
    const displayName = name.trim(); const userPurpose = purpose.trim()
    setUserName(displayName); setPurpose(userPurpose)
    addGoal({ id: crypto.randomUUID(), title: goal.trim(), description: `Primeira meta definida no onboarding em ${areas.find(item=>item.id===area)?.label}.`, category: area, deadline: new Date(Date.now()+90*86400000).toISOString().slice(0,10), progress: 0, milestones: [], linkedTasks: [], status: 'active' })
    try { await fetch('/api/profile', { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify({displayName,purpose:userPurpose}) }) } catch { /* Offline-first store remains available. */ }
    router.push('/hoje'); router.refresh()
  }
  return <main className="onboarding-page"><header><div className="brand-mark"><span>A</span><strong>Aprumo</strong></div><div className="onboarding-progress"><small>ETAPA {step} DE 3</small><div>{[1,2,3].map(item=><span key={item} className={item<=step?'active':''}/>)}</div></div></header><section className="onboarding-card">
    {step===1&&<div className="onboarding-step"><span className="onboarding-icon"><Sparkles size={22}/></span><p className="eyebrow">Comece por você</p><h1>Quem você está<br/><em>construindo?</em></h1><p className="onboarding-lead">Não buscamos uma versão perfeita. Só uma direção que faça sentido.</p><label>Como podemos te chamar?<input autoFocus value={name} maxLength={60} onChange={event=>setName(event.target.value)} placeholder="Seu nome"/></label><label>O que você quer que sua evolução torne possível?<textarea value={purpose} maxLength={180} rows={3} onChange={event=>setLocalPurpose(event.target.value)} placeholder="Ex.: Ter saúde e liberdade para criar..."/></label></div>}
    {step===2&&<div className="onboarding-step"><span className="onboarding-icon"><Target size={22}/></span><p className="eyebrow">Escolha o primeiro foco</p><h1>Qual área mais precisa<br/><em>de movimento?</em></h1><p className="onboarding-lead">Você poderá trabalhar todas depois. Por agora, escolha uma.</p><div className="onboarding-areas">{areas.map(({id,label,icon:Icon})=><button key={id} className={area===id?'active':''} onClick={()=>setArea(id)}><span><Icon size={20}/></span><strong>{label}</strong>{area===id&&<Check size={17}/>}</button>)}</div></div>}
    {step===3&&<div className="onboarding-step"><span className="onboarding-icon"><Target size={22}/></span><p className="eyebrow">Primeira meta</p><h1>O que seria uma vitória<br/><em>nos próximos 90 dias?</em></h1><p className="onboarding-lead">Escreva de forma simples. Vamos transformar isso em ações depois.</p><label>Minha primeira meta<textarea autoFocus value={goal} maxLength={120} rows={3} onChange={event=>setGoal(event.target.value)} placeholder="Ex.: Lançar a primeira versão do meu produto"/></label><div className="onboarding-summary"><small>SUA DIREÇÃO</small><p>{purpose}</p><span>{areas.find(item=>item.id===area)?.label}</span></div></div>}
    <footer>{step>1?<button className="onboarding-back" onClick={()=>setStep(step-1)}><ArrowLeft size={17}/> Voltar</button>:<span/>}<button className="onboarding-next" disabled={!canContinue||loading} onClick={()=>step<3?setStep(step+1):void finish()}>{loading?'Preparando seu sistema...':step<3?'Continuar':'Começar'}<ArrowRight size={18}/></button></footer>
  </section></main>
}
