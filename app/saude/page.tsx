import Link from 'next/link'
import { ChevronRight, Dumbbell, Moon, Scale, ShieldCheck, Smile } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Card, { cardClass } from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import SectionHeader from '@/components/ui/SectionHeader'

const areas = [
  { href: '/treino', label: 'Treinos', desc: 'Fichas, séries e repetições. Marque o que realizou.', icon: Dumbbell },
  { href: '/emocional', label: 'Humor & bem-estar', desc: 'Registro rápido de como você está hoje.', icon: Smile },
  { href: '/saude/sono', label: 'Sono', desc: 'Horas dormidas e qualidade percebida.', icon: Moon },
  { href: '/antivicio', label: 'Antivício', desc: 'Contador, gatilhos e plano de contingência.', icon: ShieldCheck },
]

const soon = [
  { label: 'Peso & medidas', desc: 'Acompanhe sua evolução física ao longo do tempo.', icon: Scale },
]

export default function SaudePage() {
  return <div className="page-wrap">
    <PageHeader title="Saúde" description="Cuide da base. Treino, bem-estar e descanso em um lugar só — simples, sem virar planilha."/>
    <section className="grid gap-3 md:grid-cols-2">
      {areas.map(({ href, label, desc, icon: Icon }) => <Link key={href} href={href} className={`${cardClass({ interactive: true })} flex items-center gap-4 no-underline`}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-area-soft text-area-ink"><Icon size={20}/></span>
        <div className="min-w-0 flex-1"><p className="text-h3">{label}</p><p className="mt-0.5 text-body-s text-fg-2">{desc}</p></div>
        <ChevronRight size={18} className="shrink-0 text-fg-3"/>
      </Link>)}
    </section>
    <SectionHeader className="mb-3 mt-10" as="h3" title="Em breve"/>
    <section className="grid gap-3 md:grid-cols-2">
      {soon.map(({ label, desc, icon: Icon }) => <Card key={label} className="flex items-center gap-4 opacity-70">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-3"><Icon size={20}/></span>
        <div className="min-w-0 flex-1"><p className="text-h3">{label}</p><p className="mt-0.5 text-body-s text-fg-2">{desc}</p></div>
        <Badge>Em breve</Badge>
      </Card>)}
    </section>
  </div>
}
