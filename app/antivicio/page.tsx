'use client'

import { useState } from 'react'
import { Brain, Check, Footprints, Plus, Shield, Wind } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'

const interventions = [
  { icon: Wind, title: 'Respire por 60 segundos', text: 'Alongue a expiração e observe a vontade sem precisar agir.' },
  { icon: Footprints, title: 'Mude de ambiente', text: 'Afaste-se do gatilho por dois minutos.' },
  { icon: Brain, title: 'Adie a decisão', text: 'Espere 10 minutos. Você continua no controle.' },
]

const back = { href: '/extensoes', label: 'Extensões' }

export default function Antivicio() {
  const { store, addAddiction, updateAddiction } = useAprumoStore()
  const addiction = store.addictions[0]
  const [openedAt] = useState(() => Date.now())
  const [urge, setUrge] = useState(false)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [replacement, setReplacement] = useState('')

  function create() {
    if (!name.trim()) return
    addAddiction({ id: crypto.randomUUID(), name: name.trim(), startDate: new Date().toISOString(), relapses: [], triggers: [], contingencyPlan: replacement.trim() ? [replacement.trim()] : ['Respirar por 60 segundos', 'Mudar de ambiente', 'Esperar 10 minutos'] })
  }

  if (!addiction) return <div className="page-wrap">
    <PageHeader back={back} title="Antivício" description="Troque o automático por uma escolha. Configure um foco privado — nada desta área é compartilhado automaticamente."/>
    <Card padding="lg" className="max-w-xl">
      <Shield className="text-area-ink"/>
      <label className="mt-6 block text-caption text-fg-2">Comportamento que deseja mudar
        <input className="field mt-1.5" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: cigarro, apostas, redes sociais"/>
      </label>
      <label className="mt-4 block text-caption text-fg-2">Primeira alternativa saudável
        <input className="field mt-1.5" value={replacement} onChange={e => setReplacement(e.target.value)} placeholder="Ex.: caminhar por 10 minutos"/>
      </label>
      <Button className="mt-5" fullWidth icon={<Plus size={16}/>} onClick={create}>Criar meu plano</Button>
    </Card>
  </div>

  const days = Math.max(0, Math.floor((openedAt - new Date(addiction.startDate).getTime()) / 86400000))

  function resisted() {
    updateAddiction({ ...addiction, triggers: [...addiction.triggers, { id: crypto.randomUUID(), date: new Date().toISOString(), description: 'Intervenção rápida', resisted: true }] })
    setUrge(false)
    setStep(0)
  }

  const intervention = interventions[step]
  const InterventionIcon = intervention.icon

  return <div className="page-wrap">
    <PageHeader back={back} title="Antivício" description="A vontade passa. Sua escolha permanece."/>
    <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <Card padding="lg">
        <p className="text-label uppercase text-fg-2">Foco atual</p>
        <h2 className="mt-2 text-h1">{addiction.name}</h2>
        <strong className="mt-8 block text-metric-xl tabular-nums text-area-ink">{days}</strong>
        <p className="mt-2 text-body-s text-fg-2">dias construindo uma resposta diferente</p>
        <Button className="mt-8" size="lg" variant="accent" fullWidth onClick={() => setUrge(true)}>Estou com vontade agora</Button>
      </Card>
      <aside className="space-y-3">
        <Card>
          <Brain size={20} className="text-area-ink"/>
          <p className="mt-3 text-h3">Gatilho mais recente</p>
          <p className="mt-1 text-body-s text-fg-2">{addiction.triggers.at(-1)?.description || 'Nenhum gatilho registrado'}</p>
        </Card>
        <Card>
          <p className="text-label uppercase text-fg-2">Plano de substituição</p>
          {addiction.contingencyPlan.slice(0, 3).map(item => <div key={item} className="mt-3 flex gap-3 text-body-s"><Check size={16} className="shrink-0 text-area-ink"/>{item}</div>)}
        </Card>
      </aside>
    </div>
    {urge && <Card padding="lg" className="mt-4 text-center">
      <InterventionIcon className="mx-auto h-10 w-10 text-area-ink"/>
      <p className="mt-5 text-label uppercase text-fg-2">Passo {step + 1} de 3</p>
      <h2 className="mt-2 text-h1">{intervention.title}</h2>
      <p className="mt-2 text-body-s text-fg-2">{intervention.text}</p>
      <Button className="mt-6" onClick={() => step < 2 ? setStep(step + 1) : resisted()}>{step < 2 ? 'Próximo passo' : 'A vontade diminuiu'}</Button>
    </Card>}
  </div>
}
