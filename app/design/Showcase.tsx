'use client'

import { useState, type ReactNode } from 'react'
import { BookOpen, CalendarDays, Dumbbell, Flame, Plus, Sparkles, Target, Timer, Wallet } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import CheckButton from '@/components/ui/CheckButton'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import PageHeader from '@/components/ui/PageHeader'
import ProgressBar from '@/components/ui/ProgressBar'
import ProgressRing from '@/components/ui/ProgressRing'
import SectionHeader from '@/components/ui/SectionHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import Sheet from '@/components/ui/Sheet'
import Skeleton from '@/components/ui/Skeleton'
import Delta from '@/components/data/Delta'
import Heatmap from '@/components/data/Heatmap'
import RadialTimer, { type RadialTimerStatus } from '@/components/data/RadialTimer'
import Chip from '@/components/ui/Chip'
import Metric from '@/components/data/Metric'
import MiniBars from '@/components/data/MiniBars'
import Sparkline from '@/components/data/Sparkline'
import TimelineItem, { TimelineGroup } from '@/components/data/TimelineItem'
import WeekDots from '@/components/data/WeekDots'
import Widget, { WidgetGrid } from '@/components/data/Widget'
import PriInsight, { Insight } from '@/components/pri/Insight'
import { addDays, heatmap, type DayScore } from '@/lib/evolution'
import { formatNumber } from '@/lib/dataviz'

/** Data fixa: a vitrine renderiza igual no servidor e no cliente. */
const TODAY = '2026-09-16'

/** Números pseudoaleatórios estáveis, para o mapa não mudar a cada render. */
function seeded(seed: number) {
  let value = seed
  return () => { value = (value * 16807) % 2147483647; return value / 2147483647 }
}

const random = seeded(42)
const scores: DayScore[] = Array.from({ length: 140 }, (_, index) => {
  const date = addDays(TODAY, index - 139)
  const due = random() < 0.12 ? 0 : 3 + Math.floor(random() * 5)
  const done = due === 0 ? 0 : Math.min(due, Math.floor(due * (0.35 + random() * 0.8 + index / 400)))
  return { date, due, done, ratio: due === 0 ? null : done / due }
})
const grid = heatmap(scores, TODAY, 20)

const formatMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(Math.round(minutes % 60)).padStart(2, '0')}min`
const formatPercent = (value: number) => `${Math.round(value)}%`
const formatReais = (value: number) => `R$ ${formatNumber(Math.round(value))}`

function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <section className="border-t border-line py-8 md:py-10">
    <div className="mb-5"><h2 className="text-h2">{title}</h2>{note && <p className="mt-1 max-w-2xl text-body-s text-fg-2">{note}</p>}</div>
    {children}
  </section>
}

const surfaces = [['canvas', 'bg-canvas'], ['surface-1', 'bg-surface-1'], ['surface-2', 'bg-surface-2'], ['surface-3', 'bg-surface-3']] as const

export default function Showcase() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30')
  const [habits, setHabits] = useState(7)
  const [checks, setChecks] = useState<Record<string, boolean>>({ acordar: true, leitura: false })
  const [sheet, setSheet] = useState(false)
  const [streak, setStreak] = useState(12)
  const [dismissed, setDismissed] = useState(false)
  const [day, setDay] = useState<string | undefined>()
  const [timerProgress, setTimerProgress] = useState(50)
  const [timerStatus, setTimerStatus] = useState<RadialTimerStatus>('running')

  return <div data-theme={theme} className="min-h-svh bg-canvas text-fg-1">
    <div className="mx-auto w-full max-w-295 px-4 pb-32 pt-6 md:px-8 md:pt-10">
      <PageHeader eyebrow="Só em desenvolvimento" title="Design System" description="Tokens e componentes base do Aprumo — a mesma base de todas as telas."
        actions={<SegmentedControl label="Tema" size="sm" value={theme} onChange={setTheme} options={[{ value: 'dark', label: 'Escuro' }, { value: 'light', label: 'Claro' }]}/>}/>

      <Block title="Superfícies" note="Profundidade por camadas de grafite, não por sombra. Bordas sutis separam; hover e pressão são sobreposições.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {surfaces.map(([name, bg]) => <div key={name} className={`${bg} rounded-card border border-line p-4`}>
            <p className="text-label uppercase text-fg-2">{name}</p><p className="mt-6 text-body-s text-fg-3">--ap-{name}</p>
          </div>)}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <p className="rounded-control bg-surface-1 p-3 text-body text-fg-1">fg-1 texto</p>
          <p className="rounded-control bg-surface-1 p-3 text-body text-fg-2">fg-2 apoio</p>
          <p className="rounded-control bg-surface-1 p-3 text-body text-fg-3">fg-3 metadado</p>
        </div>
      </Block>

      <Block title="Cor como informação" note="A interface é neutra. Um accent só — o lima do Aprumo — aparece em indicador, progresso, ícone e estado ativo, nunca pintando a tela.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[['Progresso', 72], ['Meta', 45], ['Constância', 88], ['Leitura', 30]].map(([label, value]) => <Card key={label} padding="sm">
            <div className="flex items-center justify-between"><span className="h-3 w-3 rounded-full bg-area"/><Badge tone="area">{label}</Badge></div>
            <div className="mt-4"><ProgressBar value={Number(value)} label={String(label)}/></div>
          </Card>)}
        </div>
      </Block>

      <Block title="Tipografia" note="Títulos contidos, números em destaque. Mínimo de 11px.">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-display">Display</p>
            <p className="text-h1">Heading 1 · título de página</p>
            <p className="text-h2">Heading 2 · seção</p>
            <p className="text-h3">Heading 3 · card</p>
            <p className="text-body text-fg-1">Body — o texto corrido do app, confortável no celular.</p>
            <p className="text-body-s text-fg-2">Body small — apoio e descrições.</p>
            <p className="text-caption text-fg-3">Caption — metadados, datas, fontes.</p>
            <p className="text-label uppercase text-fg-2">Label · rótulo de widget</p>
          </div>
          <div className="grid grid-cols-2 content-start gap-5">
            <Metric size="xl" value="82" unit="%"/>
            <Metric size="l" value="2h 34" unit="min"/>
            <Metric size="m" value="R$ 2.840"/>
            <Metric size="s" value="32" unit="dias"/>
          </div>
        </div>
      </Block>

      <Block title="Controles">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primária</Button>
          <Button variant="accent" icon={<Dumbbell size={16}/>}>Iniciar treino</Button>
          <Button variant="secondary" icon={<Plus size={16}/>}>Secundária</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Excluir</Button>
          <Button loading>Salvando</Button>
          <Button size="sm" variant="secondary">Pequeno</Button>
          <IconButton label="Agenda" variant="outline"><CalendarDays size={18}/></IconButton>
          <IconButton label="Pri" size="sm"><Sparkles size={16}/></IconButton>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge>Neutro</Badge><Badge tone="area" dot>Em andamento</Badge><Badge tone="solid">Aprumo+</Badge><Badge tone="alert">Passou do prazo</Badge>
        </div>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <SegmentedControl label="Período" value={period} onChange={setPeriod} options={[{ value: '7', label: '7 dias' }, { value: '30', label: '30 dias' }, { value: '90', label: '90 dias' }]}/>
          <SegmentedControl label="Abas" size="sm" value="mural" onChange={() => {}} options={[{ value: 'mural', label: 'Mural' }, { value: 'desafios', label: 'Desafios', count: 3 }, { value: 'circulos', label: 'Círculos' }]}/>
        </div>
      </Block>

      <Block title="Progresso e microinterações" note="O check enche com uma mola curta; a barra pulsa uma vez ao chegar a 100%; o contador anima a mudança.">
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <SectionHeader as="h3" title="Hábitos de hoje" meta={<span className="tabular-nums">{habits}/9</span>}/>
            <ProgressBar className="mt-4" value={habits} max={9} label="Hábitos de hoje"/>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setHabits(value => Math.max(0, value - 1))}>−1</Button>
              <Button size="sm" variant="secondary" onClick={() => setHabits(value => Math.min(9, value + 1))}>+1</Button>
            </div>
          </Card>
          <Card>
            <p className="text-label uppercase text-fg-2">Check</p>
            <ul className="mt-2">
              {[['acordar', 'Acordar às 5h30'], ['leitura', 'Ler 20 páginas']].map(([id, label]) => <li key={id} className="flex items-center gap-1">
                <CheckButton checked={checks[id]} label={`Concluir ${label}`} onChange={value => setChecks(current => ({ ...current, [id]: value }))}/>
                <span className={checks[id] ? 'text-fg-2' : 'text-fg-1'}>{label}</span>
              </li>)}
            </ul>
          </Card>
          <Card>
            <p className="text-label uppercase text-fg-2">Sequência</p>
            <div className="mt-3 flex items-end justify-between">
              <Metric size="l" value={streak} unit="dias"/>
              <Button size="sm" variant="secondary" onClick={() => setStreak(value => value + 1)}>+1 dia</Button>
            </div>
          </Card>
        </div>
      </Block>

      <Block title="Temporizador radial" note="72 traços que acendem com o tempo; o da fronteira acende aos poucos. Troque o estado para ver a onda de início (Rodando a partir de Parado) e o pulso de conclusão.">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_280px]">
          <div className="flex justify-center">
            <RadialTimer className="w-[min(86vw,420px)]" duration={30 * 60} remaining={Math.round(30 * 60 * (1 - timerProgress / 100))}
              status={timerStatus} label="Foco" detail="Terminar a proposta"/>
          </div>
          <Card className="space-y-4">
            <label className="block text-caption text-fg-2">Progresso: {timerProgress}%
              <input type="range" min={0} max={100} value={timerProgress} onChange={event => setTimerProgress(Number(event.target.value))} className="mt-2 w-full accent-performance"/>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(['idle', 'running', 'paused', 'completed'] as const).map(value => <Chip key={value} size="sm" selected={timerStatus === value} onClick={() => setTimerStatus(value)}>
                {({ idle: 'Parado', running: 'Rodando', paused: 'Pausado', completed: 'Concluído' })[value]}
              </Chip>)}
            </div>
          </Card>
        </div>
      </Block>

      <Block title="Widgets" note="Uma casca só (Widget) com tamanhos s, m e l. A ordem vem de uma lista — pronto para o usuário reorganizar no futuro.">
        <WidgetGrid>
          <Widget label="Constância" icon={Flame} href="/perfil">
            <Metric value={82} format={formatPercent} delta={<Delta value={8} unit=" pts" comparison="vs. mês anterior"/>}/>
            <WeekDots size="sm" className="mt-4" days={[
              { label: 'S', state: 'done' }, { label: 'T', state: 'done' }, { label: 'Q', state: 'done', today: true }, { label: 'Q', state: 'future' },
              { label: 'S', state: 'future' }, { label: 'S', state: 'future' }, { label: 'D', state: 'future' },
            ]}/>
          </Widget>
          <Widget label="Foco" icon={Timer}>
            <div className="flex items-center justify-between gap-2">
              <Metric size="m" value={154} format={formatMinutes} caption="meta: 3h"/>
              <ProgressRing value={154} max={180} size={48} stroke={4} label="Foco do dia"/>
            </div>
          </Widget>
          <Widget label="Finanças" icon={Wallet} size="m">
            <div className="flex items-end justify-between gap-4">
              <Metric value={2840} format={formatReais} caption="saldo do mês" delta={<Delta value={12} unit="%" comparison="no mês"/>}/>
              <Sparkline className="max-w-40" values={[1200, 1480, 1310, 1900, 2150, 2080, 2840]} label="Saldo nas últimas 7 semanas"/>
            </div>
          </Widget>
          <Widget label="Hoje" icon={Target} size="m">
            <div className="flex items-baseline justify-between"><Metric size="m" value="7/9" unit="hábitos"/><span className="text-metric-s tabular-nums text-area-ink">78%</span></div>
            <ProgressBar className="mt-3" value={7} max={9}/>
          </Widget>
          <Widget label="Leitura" icon={BookOpen} size="m" footer="12 dias de sequência">
            <div className="flex items-end justify-between gap-4">
              <Metric size="m" value="24" unit="min"/>
              <MiniBars className="max-w-44" height={40} values={[12, 18, null, 22, 30, 16, 24]} labels={['S', 'T', 'Q', 'Q', 'S', 'S', 'D']} label="Minutos de leitura na semana"/>
            </div>
          </Widget>
          <Widget label="Constância · 20 semanas" icon={CalendarDays} size="l"
            action={<SegmentedControl label="Período" size="sm" value={period} onChange={setPeriod} options={[{ value: '30', label: '30d' }, { value: '90', label: '90d' }]}/>}>
            <Heatmap weeks={grid} cell={13} onSelect={setDay} selected={day}/>
            {day && <p className="mt-2 text-caption text-fg-2">Dia selecionado: {day}. No Registro, isto abre o resumo do dia.</p>}
          </Widget>
        </WidgetGrid>
      </Block>

      <Block title="Timeline do dia" note="Base da nova Hoje: hábitos, tarefas, treino e foco na mesma linha do tempo.">
        <Card className="max-w-xl">
          <TimelineGroup label="Manhã" meta="2/3">
            <TimelineItem time="05:30" title="Acordar" status={checks.acordar ? 'done' : 'pending'}
              leading={<CheckButton checked={checks.acordar} label="Concluir Acordar" onChange={value => setChecks(current => ({ ...current, acordar: value }))}/>}/>
            <TimelineItem time="07:00" title="Peito + tríceps" status="done" meta={<><Dumbbell size={12}/> 47 min · 18 séries · 3.240 kg</>}/>
            <TimelineItem time="09:00" title="Trabalho" status="now" meta="3 tarefas · 1 concluída" last
              trailing={<Button size="sm" variant="ghost">Ver</Button>}/>
          </TimelineGroup>
          <TimelineGroup label="Tarde" meta="0/2" className="mt-3">
            <TimelineItem time="12:30" title="Leitura" meta="Hábitos Atômicos · p. 142"
              leading={<CheckButton checked={checks.leitura} label="Concluir Leitura" onChange={value => setChecks(current => ({ ...current, leitura: value }))}/>}
              status={checks.leitura ? 'done' : 'pending'}/>
            <TimelineItem time="14:00" title="Foco" meta={<><Timer size={12}/> 2 sessões · 54 min</>}
              trailing={<Button size="sm" variant="accent">Iniciar</Button>} last/>
          </TimelineGroup>
        </Card>
      </Block>

      <Block title="Pri e insights" note="A Pri aparece no contexto, diz de onde tirou a conclusão e oferece no máximo duas ações.">
        <div className="grid gap-3 md:grid-cols-2">
          {!dismissed && <PriInsight sources={['hábitos', 'agenda']} onDismiss={() => setDismissed(true)}
            actions={<><Button size="sm" variant="secondary">Ver análise</Button><Button size="sm" variant="ghost">Criar ajuste</Button></>}>
            Você conclui <strong className="font-semibold">34% mais hábitos</strong> nos dias em que começa a rotina antes das 7h.
          </PriInsight>}
          <div><PriInsight sources={['financeiro']} actions={<Button size="sm" variant="secondary">Ver recomendação</Button>}>
            Mantendo sua média atual, você chega a <strong className="font-semibold">76% da meta</strong> de reserva até dezembro.
          </PriInsight></div>
          <div><PriInsight tone="celebrate">Maior sequência da sua história: <strong className="font-semibold">32 dias</strong>.</PriInsight></div>
          <Insight label="Cruzamento" footnote="Correlação, não causa · 14 dias contra 9">Nos dias com mais de 7h de sono, seu humor médio foi 4,2 contra 3,1.</Insight>
        </div>
      </Block>

      <Block title="Estados e camadas">
        <div className="grid gap-3 md:grid-cols-3">
          <Card padding="none"><EmptyState icon={Target} title="Nenhuma meta ainda" description="Uma meta é um destino com prazo. Comece pela que muda o resto." action={<Button size="sm" variant="secondary" icon={<Plus size={15}/>}>Criar meta</Button>}/></Card>
          <Card className="space-y-3"><Skeleton className="h-4 w-1/3"/><Skeleton className="h-9 w-1/2"/><Skeleton className="h-2 w-full rounded-full"/><Skeleton className="h-16 w-full"/></Card>
          <Card className="flex flex-col items-start justify-between gap-4">
            <p className="text-body-s text-fg-2">No celular, sobe de baixo e fecha arrastando. No desktop, modal centralizado. Esc fecha; o Tab fica preso dentro.</p>
            <Button variant="secondary" onClick={() => setSheet(true)}>Abrir Sheet</Button>
          </Card>
        </div>
      </Block>
    </div>

    <Sheet open={sheet} onClose={() => setSheet(false)} eyebrow="Novo movimento" title="Registrar transação" description="Exemplo de formulário dentro do Sheet."
      footer={<div className="flex gap-2"><Button variant="secondary" fullWidth onClick={() => setSheet(false)}>Cancelar</Button><Button fullWidth onClick={() => setSheet(false)}>Registrar</Button></div>}>
      <div className="space-y-3">
        <SegmentedControl label="Tipo" stretch value="saida" onChange={() => {}} options={[{ value: 'entrada', label: 'Entrada' }, { value: 'saida', label: 'Saída' }]}/>
        <input data-autofocus className="h-11 w-full rounded-control border border-line bg-surface-1 px-3 text-body text-fg-1 outline-none focus:border-line-strong" placeholder="Valor em reais" inputMode="decimal"/>
        <input className="h-11 w-full rounded-control border border-line bg-surface-1 px-3 text-body text-fg-1 outline-none focus:border-line-strong" placeholder="Descrição"/>
      </div>
    </Sheet>
  </div>
}
