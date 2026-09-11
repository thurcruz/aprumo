import Link from 'next/link'
import { ArrowRight, Dumbbell, Moon, Scale, ShieldCheck, Smile } from 'lucide-react'

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
    <header className="mb-10">
      <p className="eyebrow">Saúde</p>
      <h1 className="display mt-3 max-w-2xl text-4xl font-semibold md:text-6xl">Cuide da base.<br/>O resto se sustenta.</h1>
      <p className="muted mt-4 max-w-xl">Treino, bem-estar e descanso em um lugar só — simples e sem virar planilha de dieta.</p>
    </header>
    <section className="grid gap-3 md:grid-cols-3">
      {areas.map(({ href, label, desc, icon: Icon }) => <Link key={href} href={href} className="surface flex flex-col gap-3 p-6 text-white no-underline">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-energy/10 text-energy"><Icon size={20}/></span>
        <div><p className="font-semibold">{label}</p><p className="muted mt-1 text-sm">{desc}</p></div>
        <span className="mt-2 inline-flex items-center gap-2 text-sm text-energy">Abrir <ArrowRight size={15}/></span>
      </Link>)}
    </section>
    <p className="muted mb-3 mt-10 text-[10px] font-bold uppercase tracking-[.16em]">Em breve</p>
    <section className="grid gap-3 md:grid-cols-2">
      {soon.map(({ label, desc, icon: Icon }) => <div key={label} className="surface flex items-center gap-4 p-6 opacity-60">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/5 text-white/60"><Icon size={20}/></span>
        <div><p className="font-semibold">{label}</p><p className="muted mt-1 text-sm">{desc}</p></div>
        <span className="ml-auto shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/50">Em breve</span>
      </div>)}
    </section>
  </div>
}
