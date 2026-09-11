'use client'

import { FormEvent, useEffect, useState, useSyncExternalStore } from 'react'
import { readPreference, setPreference, subscribePreference, type ThemePreference } from '@/lib/theme'
import Link from 'next/link'
import { Bell, Bot, Check, ChevronRight, CreditCard, Database, Download, Globe2, LockKeyhole, LogOut, Mail, Moon, ShieldCheck, Smartphone, UserRound, WalletCards, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Tab = 'conta' | 'pagamentos' | 'notificacoes' | 'ia' | 'privacidade' | 'aparencia'
const tabs = [
  { id: 'conta' as Tab, label: 'Conta', icon: UserRound },
  { id: 'pagamentos' as Tab, label: 'Créditos', icon: WalletCards },
  { id: 'notificacoes' as Tab, label: 'Notificações', icon: Bell },
  { id: 'ia' as Tab, label: 'Pri', icon: Bot },
  { id: 'privacidade' as Tab, label: 'Privacidade', icon: ShieldCheck },
  { id: 'aparencia' as Tab, label: 'Aparência', icon: Moon },
]

function Toggle({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={value} aria-label={label} className={`settings-toggle ${value ? 'active' : ''}`} onClick={onChange}><span/></button>
}

function PreferenceRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="preference-row"><div><strong>{title}</strong><p>{description}</p></div><div className="preference-action">{children}</div></div>
}

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>('conta')
  const [values, setValues] = useState({ reminders: true, weekly: false, email: true, tasks: true, goals: true, mood: false })
  const [saved, setSaved] = useState(false)
  // A mesma preferência que o <head> lê. No servidor vale o escuro (padrão) até hidratar.
  const theme = useSyncExternalStore(subscribePreference, readPreference, (): ThemePreference => 'dark')
  const [account, setAccount] = useState({ name: 'Sua conta', email: 'E-mail protegido' })
  const [billing, setBilling] = useState<{ balance: number; checkoutUrl: string | null; checkoutEmail: string | null } | null>(null)
  const [emailModal, setEmailModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  useEffect(() => {
    let active = true
    void fetch('/api/profile').then(response => response.ok ? response.json() : null).then(data => {
      if (!active || !data?.profile) return
      const permissions = data.profile.ai_permissions as Record<string, boolean> | null
      setAccount({ name: data.profile.display_name || 'Sua conta', email: data.email || 'E-mail protegido' })
      if (permissions) setValues(current => ({ ...current, tasks: permissions.tasks !== false, goals: permissions.goals !== false, mood: permissions.moods === true }))
    }).catch(() => undefined)
    void fetch('/api/billing').then(response => response.ok ? response.json() : null).then(data => {
      if (active && data) setBilling(data)
    }).catch(() => undefined)
    return () => { active = false }
  }, [])
  const chooseTheme = (next: ThemePreference) => setPreference(next)
  const flip = (key: keyof typeof values) => setValues(current => ({ ...current, [key]: !current[key] }))
  async function save() {
    localStorage.setItem('aprumo-settings', JSON.stringify({ reminders: values.reminders, weekly: values.weekly, email: values.email }))
    try { await fetch('/api/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ aiPermissions: { tasks: values.tasks, goals: values.goals, books: true, moods: values.mood, finance: false, antivicio: false } }) }) } catch { /* Local notification settings remain saved. */ }
    setSaved(true); window.setTimeout(() => setSaved(false), 1800)
  }
  async function logout() { try { await createSupabaseBrowserClient().auth.signOut() } catch {} window.location.assign('/login') }
  async function exportData() {
    try {
      const [core, domains, profile] = await Promise.all([
        fetch('/api/core').then(r => r.ok ? r.json() : null),
        fetch('/api/domains').then(r => r.ok ? r.json() : null),
        fetch('/api/profile').then(r => r.ok ? r.json() : null),
      ])
      const payload = { exportedAt: new Date().toISOString(), profile: profile?.profile ?? null, email: profile?.email ?? null, ...(core ?? {}), ...(domains ?? {}) }
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a'); link.href = url; link.download = `aprumo-dados-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url)
    } catch { /* Exportação indisponível offline. */ }
  }
  function openEmailModal() { setNewEmail(''); setEmailMsg(''); setEmailModal(true) }
  async function changeEmail(event: FormEvent) {
    event.preventDefault()
    const email = newEmail.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setEmailMsg('Digite um e-mail válido.'); return }
    if (email === account.email.toLowerCase()) { setEmailMsg('Este já é o seu e-mail atual.'); return }
    setEmailBusy(true); setEmailMsg('')
    try {
      const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback?next=/configuracoes`
      const { error } = await createSupabaseBrowserClient().auth.updateUser({ email }, { emailRedirectTo: redirectTo })
      setEmailMsg(error ? error.message : 'Enviamos um link de confirmação para o novo e-mail. A troca só é concluída após você confirmar — o e-mail atual também é notificado por segurança.')
    } catch (error) { setEmailMsg(error instanceof Error ? error.message : 'Não foi possível alterar o e-mail agora.') }
    finally { setEmailBusy(false) }
  }

  return <div className="page-wrap settings-v2">
    <header className="settings-v2-header"><div><p className="eyebrow">Sua experiência</p><h1 className="display">Configurações</h1><p>Personalize Aprumo e controle seus dados.</p></div><button className={`settings-save ${saved ? 'saved' : ''}`} onClick={save}>{saved ? <><Check size={16}/> Alterações salvas</> : 'Salvar alterações'}</button></header>

    <div className="settings-v2-shell">
      <nav className="settings-v2-nav" aria-label="Seções das configurações">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={17}/><span>{label}</span><ChevronRight size={14}/></button>)}
        <div className="settings-account-mini"><span>{account.name.slice(0,2).toUpperCase()}</span><div><strong>{account.name}</strong><small>Conta pessoal</small></div></div>
        <button className="settings-logout" onClick={logout}><LogOut size={16}/><span>Sair da conta</span></button>
      </nav>

      <section className="settings-v2-panel">
        {tab === 'conta' && <><div className="settings-panel-title"><span><UserRound size={20}/></span><div><h2>Conta</h2><p>Informações pessoais e segurança de acesso.</p></div></div><div className="settings-profile-card"><div className="settings-avatar">{account.name.slice(0,2).toUpperCase()}</div><div><strong>{account.name}</strong><p>Sua identidade em Aprumo.</p></div><Link href="/perfil">Editar perfil</Link></div><div className="preference-list"><PreferenceRow title="Endereço de e-mail" description={account.email}><button className="text-action" onClick={openEmailModal}><Mail size={15}/> Alterar</button></PreferenceRow><PreferenceRow title="Senha" description="Protegida pelo Supabase Auth"><Link href="/recuperar-senha" className="text-action"><LockKeyhole size={15}/> Redefinir</Link></PreferenceRow><PreferenceRow title="Idioma da conta" description="Português (Brasil)"><button className="text-action"><Globe2 size={15}/> Alterar</button></PreferenceRow></div></>}

        {tab === 'pagamentos' && <><div className="settings-panel-title"><span><WalletCards size={20}/></span><div><h2>Créditos Aprumo</h2><p>Seu saldo para usar a Pri e automações.</p></div></div><div className="billing-balance"><div><small>SALDO DISPONÍVEL</small><strong>{billing ? billing.balance.toLocaleString('pt-BR') : '—'}</strong><p>créditos</p></div><CreditCard size={30}/></div><div className="preference-list"><PreferenceRow title="Comprar créditos" description={`Use no checkout o mesmo e-mail da sua conta: ${billing?.checkoutEmail ?? account.email}`}>{billing?.checkoutUrl ? <a className="billing-buy" href={billing.checkoutUrl} target="_blank" rel="noreferrer">Ir para a Cakto</a> : <span className="billing-unavailable">Configure o checkout</span>}</PreferenceRow><PreferenceRow title="Liberação automática" description="Após a aprovação, a Cakto avisa Aprumo e o saldo entra automaticamente."><ShieldCheck size={18} color="var(--accent)"/></PreferenceRow></div></>}

        {tab === 'notificacoes' && <><div className="settings-panel-title"><span><Bell size={20}/></span><div><h2>Notificações</h2><p>Escolha quando Aprumo pode chamar sua atenção.</p></div></div><div className="preference-list"><PreferenceRow title="Lembretes do dia" description="Compromissos prioritários e hábitos programados."><Toggle label="Lembretes do dia" value={values.reminders} onChange={() => flip('reminders')}/></PreferenceRow><PreferenceRow title="Resumo semanal" description="Uma leitura simples da sua evolução toda segunda-feira."><Toggle label="Resumo semanal" value={values.weekly} onChange={() => flip('weekly')}/></PreferenceRow><PreferenceRow title="Novidades por e-mail" description="Atualizações importantes do produto, sem excesso."><Toggle label="Novidades por e-mail" value={values.email} onChange={() => flip('email')}/></PreferenceRow></div></>}

        {tab === 'ia' && <><div className="settings-panel-title"><span><Bot size={20}/></span><div><h2>Contexto da Pri</h2><p>Escolha quais informações podem apoiar seus insights.</p></div></div><div className="safe-banner"><ShieldCheck size={18}/><div><strong>Você está no controle.</strong><p>Nenhum dado é publicado ou compartilhado automaticamente.</p></div></div><div className="preference-list"><PreferenceRow title="Tarefas e hábitos" description="Padrões de execução, constância e repasses."><Toggle label="Contexto de tarefas" value={values.tasks} onChange={() => flip('tasks')}/></PreferenceRow><PreferenceRow title="Metas" description="Relação entre suas ações e o progresso de longo prazo."><Toggle label="Contexto de metas" value={values.goals} onChange={() => flip('goals')}/></PreferenceRow><PreferenceRow title="Humor e emocional" description="Relação entre energia, emoções e rotina."><Toggle label="Contexto emocional" value={values.mood} onChange={() => flip('mood')}/></PreferenceRow></div></>}

        {tab === 'privacidade' && <><div className="settings-panel-title"><span><ShieldCheck size={20}/></span><div><h2>Privacidade e dados</h2><p>Seus dados são privados por padrão.</p></div></div><div className="privacy-status"><span><ShieldCheck size={23}/></span><div><small>STATUS DA CONTA</small><strong>Todos os seus dados estão privados</strong><p>Nada é publicado sem uma ação explícita sua.</p></div></div><div className="preference-list"><PreferenceRow title="Baixar meus dados" description="Exporte uma cópia das suas informações."><button className="text-action" onClick={exportData}><Download size={15}/> Exportar</button></PreferenceRow><PreferenceRow title="Dados armazenados" description="Veja como suas informações são utilizadas."><button className="text-action"><Database size={15}/> Consultar</button></PreferenceRow></div></>}

        {tab === 'aparencia' && <><div className="settings-panel-title"><span><Moon size={20}/></span><div><h2>Aparência</h2><p>Ajuste o visual e o formato do aplicativo.</p></div></div><div className="theme-preview"><button className={`theme-swatch ${theme==='dark'?'active':''}`} aria-pressed={theme==='dark'} onClick={()=>chooseTheme('dark')}><span/><div/><small>Escuro</small></button><button className={`theme-swatch light ${theme==='light'?'active':''}`} aria-pressed={theme==='light'} onClick={()=>chooseTheme('light')}><span/><div/><small>Claro</small></button><button className={`theme-swatch auto ${theme==='system'?'active':''}`} aria-pressed={theme==='system'} onClick={()=>chooseTheme('system')}><span/><div/><small>Automático</small></button></div><p className="theme-hint">Automático acompanha o tema do seu celular ou computador — e troca sozinho quando ele mudar.</p><div className="preference-list"><PreferenceRow title="Fuso horário" description="América/São Paulo"><button className="text-action"><Smartphone size={15}/> Alterar</button></PreferenceRow><PreferenceRow title="Formato de data" description="DD/MM/AAAA"><button className="text-action">Alterar</button></PreferenceRow></div></>}
      </section>
    </div>
    {emailModal && <div className="profile-modal-backdrop" onClick={() => setEmailModal(false)}><form className="surface profile-modal" onClick={event => event.stopPropagation()} onSubmit={changeEmail}><div className="flex items-center justify-between"><div><p className="eyebrow">Segurança da conta</p><h3>Alterar e-mail</h3></div><button type="button" className="icon-button" onClick={() => setEmailModal(false)}><X size={17}/></button></div><p className="muted text-sm">E-mail atual: {account.email}</p><label>Novo e-mail<input type="email" autoFocus value={newEmail} onChange={event => setNewEmail(event.target.value)} placeholder="voce@exemplo.com"/></label>{emailMsg && <p className="text-sm" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{emailMsg}</p>}<button className="energy-button py-3" disabled={emailBusy}>{emailBusy ? 'Enviando…' : 'Enviar confirmação'}</button></form></div>}
  </div>
}
