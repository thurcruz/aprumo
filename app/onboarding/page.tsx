'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUp, RotateCcw } from 'lucide-react'
import PriOrb from '@/components/pri/PriOrb'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import { basicDiagnosisPlan, DIAGNOSIS_FOCUSES, DIAGNOSIS_MINUTES, extensionsForFocuses, focusLabels, MAX_DIAGNOSIS_FOCUSES, type DiagnosisFocus, DIAGNOSIS_SLUG, DIAGNOSIS_WEEKS, diagnosisGoal, type DiagnosisAnswers, type DiagnosisPlan } from '@/lib/diagnosis'
import { PRI_BILLING_CTA, type PriCta } from '@/lib/pri'
import { planHabitToTask } from '@/lib/routine-plans'
import { useAprumoStore } from '@/lib/store'
import { dayBlocks, type TaskSource } from '@/lib/types'
import { describeFrequency, isoDate } from '@/lib/utils'
import { cx } from '@/lib/cx'

type Step = 'name' | 'focus' | 'destination' | 'obstacle' | 'minutes' | 'block' | 'thinking' | 'preview' | 'error'
type Draft = Partial<DiagnosisAnswers>

const minuteLabel = (minutes: number) => minutes === 60 ? '1 hora' : `${minutes} min`

/** O que a Pri pergunta em cada passo. A conversa é a lista das perguntas já feitas com as respostas. */
function question(step: Step, draft: Draft): string {
  switch (step) {
    case 'name': return 'Oi, eu sou a Pri. Vou montar com você um plano pequeno e possível. Como posso te chamar?'
    case 'focus': return `Prazer, ${draft.name}. O que você quer dominar agora? Escolha até ${MAX_DIAGNOSIS_FOCUSES}.`
    case 'destination': return 'Onde você quer chegar nos próximos 90 dias? Seja concreto.'
    case 'obstacle': return 'O que hoje mais atrapalha você de chegar lá?'
    case 'minutes': return 'Quanto tempo por dia dá para dedicar de verdade?'
    case 'block': return 'E em que parte do dia isso cabe melhor?'
    default: return ''
  }
}

const order: Step[] = ['name', 'focus', 'destination', 'obstacle', 'minutes', 'block']

function answerOf(step: Step, draft: Draft): string | undefined {
  switch (step) {
    case 'name': return draft.name
    case 'focus': return draft.focuses?.length ? focusLabels(draft.focuses).join(' · ') : undefined
    case 'destination': return draft.destination
    case 'obstacle': return draft.obstacle === undefined ? undefined : draft.obstacle || 'Prefiro não dizer agora'
    case 'minutes': return draft.minutesPerDay ? minuteLabel(draft.minutesPerDay) : undefined
    case 'block': return dayBlocks.find(block => block.id === draft.dayBlock)?.label
    default: return undefined
  }
}

export default function OnboardingPage() {
  const router = useRouter()
  const { store, hydrated, setUserName, setPurpose, addGoal, addTask, setExtensions } = useAprumoStore()
  const [step, setStep] = useState<Step>('name')
  const [draft, setDraft] = useState<Draft>({})
  const [input, setInput] = useState('')
  /** Focos marcados antes de confirmar: a pergunta aceita mais de um. */
  const [picked, setPicked] = useState<DiagnosisFocus[]>([])
  const [plan, setPlan] = useState<{ value: DiagnosisPlan; source: TaskSource } | null>(null)
  const [failure, setFailure] = useState<{ message: string; cta?: PriCta } | null>(null)
  const [saving, setSaving] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const today = isoDate(new Date())

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [step])

  const asked = order.includes(step) ? order.slice(0, order.indexOf(step) + 1) : order
  const textStep = step === 'name' || step === 'destination' || step === 'obstacle'

  async function generate(answers: DiagnosisAnswers) {
    setStep('thinking')
    setFailure(null)
    try {
      const response = await fetch('/api/diagnostico', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers, today }) })
      const data = await response.json().catch(() => null) as { plan?: DiagnosisPlan; error?: string; code?: string } | null
      if (!response.ok || !data?.plan) {
        setFailure({ message: data?.error ?? 'A Pri não conseguiu montar agora.', cta: data?.code ? PRI_BILLING_CTA[data.code] : undefined })
        setStep('error')
        return
      }
      setPlan({ value: data.plan, source: 'ai' })
      setStep('preview')
    } catch {
      setFailure({ message: 'A conexão falhou.' })
      setStep('error')
    }
  }

  function answer(patch: Draft) {
    const next = { ...draft, ...patch }
    setDraft(next)
    setInput('')
    const following = order[order.indexOf(step) + 1]
    if (following) setStep(following)
    else void generate(next as DiagnosisAnswers)
  }

  function submitText(event: FormEvent) {
    event.preventDefault()
    const value = input.trim()
    if (step === 'name' && value.length >= 2) answer({ name: value.slice(0, 60) })
    else if (step === 'destination' && value.length >= 4) answer({ destination: value.slice(0, 240) })
    else if (step === 'obstacle') answer({ obstacle: value.slice(0, 240) })
  }

  function useBasicPlan() {
    setPlan({ value: basicDiagnosisPlan(draft as DiagnosisAnswers, today), source: 'manual' })
    setStep('preview')
  }

  function restart() {
    setPlan(null)
    setFailure(null)
    setDraft(current => ({ name: current.name }))
    setPicked([])
    setStep('focus')
  }

  async function start() {
    if (!plan || saving) return
    setSaving(true)
    const answers = draft as DiagnosisAnswers
    const goalId = crypto.randomUUID()
    const planRef = { id: crypto.randomUUID(), slug: DIAGNOSIS_SLUG }
    const now = new Date()
    setUserName(answers.name)
    setPurpose(answers.destination.slice(0, 180))
    // Quem escolheu Treino já encontra Treino ligado: as áreas certas aparecem sem a pessoa procurar.
    const extensions = extensionsForFocuses(answers.focuses ?? [])
    if (extensions.length > 0) await setExtensions(Object.fromEntries(extensions.map(id => [id, true])))
    // Hoje recarrega do servidor ao abrir: sem esperar a gravação, o plano recém-criado sumiria.
    // A meta vem antes porque as ações apontam para ela.
    await addGoal(diagnosisGoal(plan.value, answers, { id: goalId, today }))
    await Promise.all(plan.value.habits.map(habit => addTask({ ...planHabitToTask(habit, planRef, { id: crypto.randomUUID(), source: plan.source, now }), goalId })))
    router.push('/hoje')
    router.refresh()
  }

  const bubble = (from: 'pri' | 'user', content: string, key: string) => <div key={key} className={cx('flex', from === 'user' && 'justify-end')}>
    <p className={cx('max-w-[85%] whitespace-pre-wrap rounded-card px-4 py-3 text-body', from === 'user' ? 'bg-surface-pressed text-fg-1' : 'border border-line bg-surface-1 text-fg-1')}>{content}</p>
  </div>

  return <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col px-4 pb-6 pt-8">
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3"><PriOrb size={36} state={step === 'thinking' ? 'thinking' : 'idle'}/><p className="text-label uppercase text-fg-2">Diagnóstico com a Pri</p></div>
      <Link href="/hoje" className="text-caption text-fg-3 no-underline hover:text-fg-1">Pular por agora</Link>
    </header>

    <section className="mt-8 flex-1 space-y-3" aria-live="polite">
      {asked.flatMap(item => {
        const reply = answerOf(item, draft)
        return [bubble('pri', question(item, draft), `${item}-q`), ...(reply && item !== step ? [bubble('user', reply, `${item}-a`)] : [])]
      })}

      {step === 'thinking' && <p className="flex items-center gap-2 text-body-s text-fg-2"><PriOrb size={18} state="thinking"/> Montando seu plano…</p>}

      {step === 'error' && failure && <div className="rounded-card border border-line bg-surface-1 p-4">
        <p className="text-body text-fg-1">{failure.message}</p>
        <p className="mt-1 text-body-s text-fg-2">Você pode começar com um plano simples agora e ajustar depois.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={useBasicPlan}>Começar com um plano simples</Button>
          {!failure.cta && <Button size="sm" variant="secondary" onClick={() => void generate(draft as DiagnosisAnswers)}>Tentar de novo</Button>}
          {failure.cta && <Link href={failure.cta.href} className="self-center text-body-s font-medium text-fg-1 underline underline-offset-2">{failure.cta.label}</Link>}
        </div>
      </div>}

      {step === 'preview' && plan && <div className="rounded-card border border-area-line bg-surface-1 p-5">
        <p className="text-label uppercase text-fg-3">Sua meta · 90 dias</p>
        <h1 className="mt-1 text-h2">{plan.value.goalTitle}</h1>
        {plan.value.summary && <p className="mt-2 text-body-s text-fg-2">{plan.value.summary}</p>}
        <p className="mt-5 text-label uppercase text-fg-3">Primeiras {DIAGNOSIS_WEEKS} semanas</p>
        <ol className="mt-2 space-y-2">
          {plan.value.habits.map((habit, index) => <li key={index} className="rounded-control border border-line bg-surface-2 p-3">
            <p className="text-body-s font-medium text-fg-1">{habit.title}</p>
            <p className="mt-0.5 text-caption text-fg-2">{describeFrequency({ days: habit.days })} · {dayBlocks.find(block => block.id === habit.dayBlock)?.label} · {habit.durationMinutes} min</p>
          </li>)}
        </ol>
        <p className="mt-4 text-caption text-fg-2">As ações aparecem em Hoje. Dá para editar qualquer uma depois.</p>
        <div className="mt-5 flex flex-col gap-2">
          <Button fullWidth loading={saving} onClick={() => void start()}>Começar este plano</Button>
          <Button fullWidth variant="ghost" icon={<RotateCcw size={15}/>} disabled={saving} onClick={restart}>Refazer respostas</Button>
        </div>
      </div>}
      <div ref={endRef}/>
    </section>

    {step === 'name' && hydrated && store.userName.length >= 2 && <div className="mt-4 flex flex-wrap gap-2">
      <Chip selected={false} onClick={() => answer({ name: store.userName })}>Pode me chamar de {store.userName}</Chip>
    </div>}
    {step === 'focus' && <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {DIAGNOSIS_FOCUSES.map(item => {
          const on = picked.includes(item.id)
          return <Chip key={item.id} selected={on} disabled={!on && picked.length >= MAX_DIAGNOSIS_FOCUSES}
            onClick={() => setPicked(current => on ? current.filter(id => id !== item.id) : [...current, item.id])}>{item.label}</Chip>
        })}
      </div>
      <Button className="mt-4" fullWidth disabled={picked.length === 0}
        onClick={() => answer({ focuses: picked, area: DIAGNOSIS_FOCUSES.find(item => item.id === picked[0])!.area })}>Continuar</Button>
    </div>}
    {step === 'minutes' && <div className="mt-4 flex flex-wrap gap-2">
      {DIAGNOSIS_MINUTES.map(minutes => <Chip key={minutes} selected={false} onClick={() => answer({ minutesPerDay: minutes })}>{minuteLabel(minutes)}</Chip>)}
    </div>}
    {step === 'block' && <div className="mt-4 flex flex-wrap gap-2">
      {dayBlocks.map(block => <Chip key={block.id} selected={false} onClick={() => answer({ dayBlock: block.id })}>{block.id === 'livre' ? 'Qualquer hora' : block.label}</Chip>)}
    </div>}

    {textStep && <form onSubmit={submitText} className="mt-4 flex items-center gap-2 rounded-full border border-line-strong bg-surface-2 p-1.5 pl-4">
      <input autoFocus aria-label="Sua resposta" value={input} onChange={event => setInput(event.target.value)} maxLength={step === 'name' ? 60 : 240}
        className="min-w-0 flex-1 bg-transparent py-2.5 text-body outline-none placeholder:text-fg-3"
        placeholder={step === 'name' ? 'Seu nome' : step === 'destination' ? (DIAGNOSIS_FOCUSES.find(item => item.id === draft.focuses?.[0])?.example ?? 'Ex.: lançar a primeira versão do meu produto') : 'Ex.: chego cansado e deixo para depois'}/>
      {step === 'obstacle' && !input.trim() && <button type="button" onClick={() => answer({ obstacle: '' })} className="shrink-0 px-2 text-caption text-fg-3 hover:text-fg-1">Pular</button>}
      <button disabled={step === 'name' ? input.trim().length < 2 : step === 'destination' ? input.trim().length < 4 : !input.trim()} aria-label="Enviar"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fg-1 text-canvas transition-opacity disabled:opacity-30"><ArrowUp size={18}/></button>
    </form>}
  </main>
}
