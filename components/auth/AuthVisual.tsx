import Link from 'next/link'
import { Check, ShieldCheck, Sparkles } from 'lucide-react'

export default function AuthVisual() {
  return <aside className="auth-visual">
    <Link href="/" className="brand-mark"><img src="/APRUMO_ICONE_AMARELO_MONO.png" alt="" width={30} height={30}/><strong>Aprumo</strong></Link>
    <div className="auth-message"><span className="quote-mark">“</span><h2>Pequenas ações.<br/>Todos os dias.<br/><em>Grandes mudanças.</em></h2><p>Seu sistema pessoal para sair da intenção e construir uma evolução que você consegue ver.</p></div>
    <div className="auth-proof-card"><div className="proof-head"><span><Sparkles size={16}/></span><div><small>PROGRESSO DA SEMANA</small><strong>Você está no ritmo.</strong></div><b>82%</b></div><div className="week-dots">{['S','T','Q','Q','S','S','D'].map((day, i)=><div key={`${day}-${i}`}><span className={i < 5 ? 'active' : ''}>{i < 5 && <Check size={12}/>}</span><small>{day}</small></div>)}</div></div>
    <div className="auth-private"><ShieldCheck size={16}/><span>Privado por padrão. Seus dados pertencem a você.</span></div>
  </aside>
}
