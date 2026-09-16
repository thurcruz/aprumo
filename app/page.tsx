import Link from 'next/link'
import { ArrowRight, Bot, Brain, Check, ChevronRight, Flame, LockKeyhole, Target } from 'lucide-react'

const pillars = [
  { icon: Target, number: '01', title: 'Decida o que importa', text: 'Transforme intenção em metas claras e ações que cabem no seu dia.' },
  { icon: Flame, number: '02', title: 'Construa constância', text: 'Acompanhe hábitos e compromissos sem culpa, pressão ou métricas vazias.' },
  { icon: Brain, number: '03', title: 'Aprenda com você', text: 'Conecte rotina, emoções e resultados para entender o que realmente funciona.' },
]

export default function HomePage() {
  return <main className="marketing-page overflow-hidden">
    <nav className="marketing-nav">
      <Link href="/" className="brand-mark"><img src="/APRUMO_ICONE_AMARELO_MONO.png" alt="" width={30} height={30}/><strong>Aprumo</strong></Link>
      <div className="hidden items-center gap-8 md:flex"><a href="#sistema">O sistema</a><a href="#metodo">Como funciona</a><a href="#privacidade">Privacidade</a></div>
      <div className="flex items-center gap-3"><Link href="/login" className="nav-login">Entrar</Link><Link href="/cadastro" className="pill-cta hidden sm:flex">Começar agora <ArrowRight size={15}/></Link></div>
    </nav>
    <section className="hero-section">
      <div className="hero-orb" aria-hidden="true"><span>A</span></div>
      <div className="hero-copy">
        <div className="hero-kicker"><span className="live-dot"/> Seu próximo nível começa hoje</div>
        <h1>Não dependa de<br/><em>motivação.</em><br/>Construa um sistema.</h1>
        <p>Um espaço para organizar sua vida, agir com clareza e evoluir de forma consistente — no seu ritmo, todos os dias.</p>
        <div className="hero-actions"><Link href="/cadastro" className="hero-primary">Criar minha conta <ArrowRight size={19}/></Link><a href="#sistema" className="hero-secondary">Conhecer o método <ChevronRight size={18}/></a></div>
        <div className="hero-trust"><span><Check size={14}/> Comece grátis</span><span><Check size={14}/> Sem cartão</span><span><LockKeyhole size={13}/> Seus dados são seus</span></div>
      </div>
      <div className="hero-visual" aria-label="Prévia do produto Aprumo">
        <div className="visual-glow"/><div className="product-card card-main">
          <div className="card-top"><div><small>SEGUNDA, 17 AGO</small><h3>Bom dia, Arthur.</h3></div><span className="mini-avatar">AR</span></div>
          <div className="focus-box"><small>FOCO DO DIA</small><p>Terminar o que começou.</p><div className="progress-track"><span/></div><div className="progress-copy"><span>3 de 4 ações</span><strong>75%</strong></div></div>
          <div className="task-row done"><span><Check size={14}/></span><div><small>MANHÃ</small><p>Treino de força</p></div><em>07:30</em></div><div className="task-row"><span/><div><small>PRIORIDADE</small><p>Finalizar proposta</p></div><em>10:00</em></div>
        </div>
        <div className="floating-card streak"><Flame size={18}/><div><strong>12 dias</strong><small>em movimento</small></div></div>
        <div className="floating-card ai-card"><span><Bot size={17}/></span><div><small>PRI</small><p>“Seu melhor ritmo acontece pela manhã.”</p></div></div>
      </div>
    </section>
    <section className="proof-strip"><p>Um sistema para a vida inteira, não só para a próxima segunda.</p><div><span>FOCO</span><i/><span>CONSTÂNCIA</span><i/><span>CLAREZA</span><i/><span>EVOLUÇÃO</span></div></section>
    <section id="sistema" className="system-section">
      <div className="section-heading"><p className="section-label">UM SISTEMA. SUA VIDA.</p><h2>Tudo que você precisa para<br/><em>continuar avançando.</em></h2><p>Menos ferramentas desconectadas. Mais contexto para fazer melhores escolhas.</p></div>
      <div className="pillar-grid">{pillars.map(({icon: Icon, ...item}) => <article key={item.number} className="pillar-card"><div className="pillar-number">{item.number}</div><span className="pillar-icon"><Icon size={22}/></span><h3>{item.title}</h3><p>{item.text}</p><div className="card-line"/></article>)}</div>
    </section>
    <section id="metodo" className="manifesto-section"><div><p className="section-label">A jornada Aprumo</p><h2>Entender. Decidir.<br/>Agir. Medir. <em>Evoluir.</em></h2></div><div className="manifesto-copy"><p>Você não precisa virar outra pessoa para começar. Precisa de um sistema que entenda quem você é hoje e ajude a construir quem deseja ser.</p><Link href="/cadastro">Começar minha evolução <ArrowRight size={17}/></Link></div></section>
    <footer id="privacidade" className="marketing-footer"><div className="brand-mark"><img src="/APRUMO_ICONE_AMARELO_MONO.png" alt="" width={30} height={30}/><strong>Aprumo</strong></div><p>Privado por padrão. Feito para a sua evolução.</p><p>© 2026 Aprumo</p></footer>
  </main>
}
