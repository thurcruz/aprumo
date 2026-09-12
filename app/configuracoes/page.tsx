'use client'

import { FormEvent, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'next/navigation'
import { readPreference, setPreference, subscribePreference, type ThemePreference } from '@/lib/theme'
import Link from 'next/link'
import { Bell, Bot, Check, ChevronRight, Clock3, CreditCard, Database, Download, Globe2, LockKeyhole, LogOut, Mail, MessageCircle, Moon, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface BillingInfo {
  plan: 'free' | 'plus'
  status: string | null
  renewsAt: string | null
  cancelAtPeriodEnd: boolean
  balance: number
  priceMonthlyCents: number
  priceAnnualCents: number
}
const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// wa.me só aceita dígitos — nada de "+", espaço ou traço.
const WHATSAPP_DIGITS = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '')
const WHATSAPP_LINK = WHATSAPP_DIGITS ? `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent('oi')}` : null

/** IANA de verdade (Node 18+/navegadores atuais); sem suporte, uma lista curta cobre o essencial. */
const TIME_ZONES: string[] = typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('timeZone')
  : ['America/Sao_Paulo', 'America/Manaus', 'America/Bahia', 'America/Fortaleza', 'America/Recife', 'America/Noronha', 'America/Rio_Branco', 'UTC']

function timeZoneLabel(zone: string): string {
  const offset = new Intl.DateTimeFormat('pt-BR', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value ?? ''
  return `${zone.replace(/_/g, ' ')}${offset ? ` (${offset})` : ''}`
}

type Tab = 'conta' | 'aprumo-plus' | 'notificacoes' | 'ia' | 'privacidade' | 'aparencia'
const tabs = [
  { id: 'conta' as Tab, label: 'Conta', icon: UserRound },
  { id: 'aprumo-plus' as Tab, label: 'Aprumo+', icon: Sparkles },
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

// useSearchParams() exige um limite de Suspense para a página poder ser pré-renderizada estaticamente.
export default function ConfiguracoesPage() {
  return <Suspense fallback={null}><ConfiguracoesContent/></Suspense>
}

function ConfiguracoesContent() {
  const searchParams = useSearchParams()
  const initialTab = tabs.some(item => item.id === searchParams.get('tab')) ? (searchParams.get('tab') as Tab) : 'conta'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [values, setValues] = useState({ reminders: true, weekly: false, email: true, tasks: true, goals: true, mood: false })
  const [saved, setSaved] = useState(false)
  // A mesma preferência que o <head> lê. No servidor vale o escuro (padrão) até hidratar.
  const theme = useSyncExternalStore(subscribePreference, readPreference, (): ThemePreference => 'dark')
  const [account, setAccount] = useState({ name: 'Sua conta', email: 'E-mail protegido' })
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [checkoutBusy, setCheckoutBusy] = useState<'monthly' | 'annual' | 'topup' | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [billingError, setBillingError] = useState('')
  const checkoutNotice = searchParams.get('checkout')
  const [emailModal, setEmailModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  const [tzModal, setTzModal] = useState(false)
  const [tzQuery, setTzQuery] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [dataModal, setDataModal] = useState(false)
  const [dataCounts, setDataCounts] = useState<{ label: string; count: number }[] | null>(null)
  const [dataError, setDataError] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null)
  const [linkCode, setLinkCode] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkMsg, setLinkMsg] = useState('')
  useEffect(() => {
    let active = true
    void fetch('/api/profile').then(response => response.ok ? response.json() : null).then(data => {
      if (!active || !data?.profile) return
      const permissions = data.profile.ai_permissions as Record<string, boolean> | null
      const notifications = data.profile.notification_prefs as Record<string, boolean> | null
      setAccount({ name: data.profile.display_name || 'Sua conta', email: data.email || 'E-mail protegido' })
      if (permissions) setValues(current => ({ ...current, tasks: permissions.tasks !== false, goals: permissions.goals !== false, mood: permissions.moods === true }))
      // Preferência de aviso: o que já está na conta manda; sem servidor ainda, o que ficou salvo no aparelho continua valendo.
      if (notifications) setValues(current => ({ ...current, reminders: notifications.reminders !== false, weekly: notifications.weekly === true, email: notifications.email !== false }))
      if (typeof data.profile.timezone === 'string') setTimezone(data.profile.timezone)
      if (typeof data.profile.whatsapp_phone_e164 === 'string') setWhatsappPhone(data.profile.whatsapp_phone_e164)
    }).catch(() => undefined)
    void fetch('/api/billing').then(response => response.ok ? response.json() : null).then(data => {
      if (active && data) setBilling(data)
    }).catch(() => undefined)
    return () => { active = false }
  }, [])
  // Volta do Stripe: busca de novo para refletir a assinatura/saldo sem precisar recarregar a mão.
  useEffect(() => {
    if (checkoutNotice !== 'sucesso') return
    fetch('/api/billing', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(data => { if (data) setBilling(data) }).catch(() => undefined)
  }, [checkoutNotice])
  async function startCheckout(plan: 'monthly' | 'annual' | 'topup') {
    setCheckoutBusy(plan); setBillingError('')
    try {
      const response = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan }) })
      const data = await response.json()
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Não foi possível iniciar o checkout.')
      window.location.href = data.url
    } catch (error) { setBillingError(error instanceof Error ? error.message : 'Não foi possível iniciar o checkout.'); setCheckoutBusy(null) }
  }
  async function openPortal() {
    setPortalBusy(true); setBillingError('')
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Não foi possível abrir o portal.')
      window.location.href = data.url
    } catch (error) { setBillingError(error instanceof Error ? error.message : 'Não foi possível abrir o portal.'); setPortalBusy(false) }
  }
  const chooseTheme = (next: ThemePreference) => setPreference(next)
  const flip = (key: keyof typeof values) => setValues(current => ({ ...current, [key]: !current[key] }))
  async function save() {
    localStorage.setItem('aprumo-settings', JSON.stringify({ reminders: values.reminders, weekly: values.weekly, email: values.email }))
    try {
      await fetch('/api/profile', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          aiPermissions: { tasks: values.tasks, goals: values.goals, books: true, moods: values.mood, finance: false, antivicio: false },
          notificationPrefs: { reminders: values.reminders, weekly: values.weekly, email: values.email },
        }),
      })
    } catch { /* Preferências continuam salvas no aparelho. */ }
    setSaved(true); window.setTimeout(() => setSaved(false), 1800)
  }
  async function logout() { try { await createSupabaseBrowserClient().auth.signOut() } catch {} window.location.assign('/login') }
  async function requestPasswordReset() {
    setResetBusy(true); setResetMsg('')
    try {
      const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
      const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(account.email, { redirectTo: `${origin}/auth/callback?next=/nova-senha` })
      setResetMsg(error ? error.message : `Enviamos um link para ${account.email}.`)
    } catch (error) { setResetMsg(error instanceof Error ? error.message : 'Não foi possível enviar o link agora.') }
    finally { setResetBusy(false) }
  }
  async function chooseTimezone(zone: string) {
    setTimezone(zone); setTzModal(false)
    try { await fetch('/api/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ timezone: zone }) }) } catch { /* tenta de novo no próximo Salvar alterações */ }
  }
  async function linkWhatsapp(event: FormEvent) {
    event.preventDefault()
    setLinkBusy(true); setLinkMsg('')
    try {
      const response = await fetch('/api/whatsapp/link', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: linkCode.trim() }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível vincular.')
      setWhatsappPhone(data.phone); setLinkCode('')
    } catch (error) { setLinkMsg(error instanceof Error ? error.message : 'Não foi possível vincular.') }
    finally { setLinkBusy(false) }
  }
  async function unlinkWhatsapp() {
    setLinkBusy(true); setLinkMsg('')
    try {
      const response = await fetch('/api/whatsapp/link', { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível desvincular.')
      setWhatsappPhone(null)
    } catch (error) { setLinkMsg(error instanceof Error ? error.message : 'Não foi possível desvincular.') }
    finally { setLinkBusy(false) }
  }
  async function openDataModal() {
    setDataModal(true); setDataCounts(null); setDataError('')
    try {
      const [core, domains] = await Promise.all([
        fetch('/api/core').then(r => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/domains').then(r => r.ok ? r.json() : Promise.reject(r.status)),
      ])
      const rows: [string, unknown][] = [
        ['Tarefas e hábitos', core?.tasks], ['Metas', core?.goals],
        ['Transações', domains?.transactions], ['Objetivos financeiros', domains?.financialGoals],
        ['Fichas de treino', domains?.workouts], ['Treinos realizados', domains?.workoutLogs],
        ['Livros', domains?.books], ['Repertório', domains?.repertoire],
        ['Registros de humor', domains?.moods], ['Registros de sono', domains?.sleep],
        ['Sessões de foco', domains?.focusSessions], ['Anotações', domains?.notes],
      ]
      setDataCounts(rows.map(([label, list]) => ({ label, count: Array.isArray(list) ? list.length : 0 })))
    } catch { setDataError('Não foi possível consultar seus dados agora.') }
  }
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
  const filteredZones = useMemo(() => {
    const query = tzQuery.trim().toLowerCase()
    const list = query ? TIME_ZONES.filter(zone => zone.toLowerCase().includes(query.replace(/\s+/g, '_'))) : TIME_ZONES
    return list.slice(0, 200)
  }, [tzQuery])

  return <div className="page-wrap settings-v2">
    <header className="settings-v2-header"><div><p className="eyebrow">Sua experiência</p><h1 className="display">Configurações</h1><p>Personalize Aprumo e controle seus dados.</p></div><button className={`settings-save ${saved ? 'saved' : ''}`} onClick={save}>{saved ? <><Check size={16}/> Alterações salvas</> : 'Salvar alterações'}</button></header>

    <div className="settings-v2-shell">
      <nav className="settings-v2-nav" aria-label="Seções das configurações">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={17}/><span>{label}</span><ChevronRight size={14}/></button>)}
        <div className="settings-account-mini"><span>{account.name.slice(0,2).toUpperCase()}</span><div><strong>{account.name}</strong><small>Conta pessoal</small></div></div>
        <button className="settings-logout" onClick={logout}><LogOut size={16}/><span>Sair da conta</span></button>
      </nav>

      <section className="settings-v2-panel">
        {tab === 'conta' && <><div className="settings-panel-title"><span><UserRound size={20}/></span><div><h2>Conta</h2><p>Informações pessoais e segurança de acesso.</p></div></div><div className="settings-profile-card"><div className="settings-avatar">{account.name.slice(0,2).toUpperCase()}</div><div><strong>{account.name}</strong><p>Sua identidade em Aprumo.</p></div><Link href="/perfil">Editar perfil</Link></div><div className="preference-list"><PreferenceRow title="Endereço de e-mail" description={account.email}><button className="text-action" onClick={openEmailModal}><Mail size={15}/> Alterar</button></PreferenceRow><PreferenceRow title="Senha" description={resetMsg || 'Protegida pelo Supabase Auth'}><button className="text-action" onClick={requestPasswordReset} disabled={resetBusy}><LockKeyhole size={15}/> {resetBusy ? 'Enviando…' : 'Enviar link de redefinição'}</button></PreferenceRow><PreferenceRow title="Idioma da conta" description="Português (Brasil) — único idioma disponível por enquanto"><span className="muted flex items-center gap-1.5 text-xs"><Globe2 size={15}/> Único disponível</span></PreferenceRow></div></>}

        {tab === 'aprumo-plus' && <>
          <div className="settings-panel-title"><span><Sparkles size={20}/></span><div><h2>Aprumo+</h2><p>Insights avançados e conversas com a Pri, na plataforma e no WhatsApp.</p></div></div>
          {checkoutNotice === 'cancelado' && <p className="mx-6.75 mt-2 text-sm" style={{ color: 'var(--muted)' }}>Checkout cancelado — nada foi cobrado.</p>}
          {billingError && <p className="mx-6.75 mt-2 text-sm" style={{ color: 'var(--danger)' }}>{billingError}</p>}

          {billing?.plan === 'plus'
            ? <div className="billing-balance"><div><small>{billing.cancelAtPeriodEnd ? 'ATIVA ATÉ' : 'PRÓXIMA COBRANÇA'}</small><strong style={{ fontSize: 22 }}>{billing.renewsAt ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date(billing.renewsAt)) : '—'}</strong><p>{billing.balance} {billing.balance === 1 ? 'crédito' : 'créditos'} restantes neste ciclo</p></div><CreditCard size={30}/></div>
            : <div className="billing-balance"><div><small>SEU PLANO</small><strong style={{ fontSize: 22 }}>Free</strong><p>Sem acesso à Pri — assine para conversar</p></div><Sparkles size={30}/></div>}

          <div className="preference-list">
            {billing?.plan === 'plus' ? <>
              <PreferenceRow title="Sua assinatura" description={billing.cancelAtPeriodEnd ? 'Cancelamento agendado para o fim do ciclo atual.' : 'Trocar cartão, ver recibos ou cancelar — tudo no portal do Stripe.'}>
                <button className="text-action" onClick={openPortal} disabled={portalBusy}><Sparkles size={15}/> {portalBusy ? 'Abrindo…' : 'Gerenciar assinatura'}</button>
              </PreferenceRow>
              <PreferenceRow title="Créditos extras" description="Esbarrou no limite do mês? Compre um pacote avulso na hora, sem esperar o próximo ciclo.">
                <button className="text-action" onClick={() => void startCheckout('topup')} disabled={checkoutBusy !== null}><CreditCard size={15}/> {checkoutBusy === 'topup' ? 'Abrindo…' : 'Comprar mais créditos'}</button>
              </PreferenceRow>
            </> : <>
              <PreferenceRow title="Mensal" description={`${brl(billing?.priceMonthlyCents ?? 2490)} por mês, cancele quando quiser.`}>
                <button className="energy-button px-4 py-2 text-xs" onClick={() => void startCheckout('monthly')} disabled={checkoutBusy !== null}>{checkoutBusy === 'monthly' ? 'Abrindo…' : 'Assinar mensal'}</button>
              </PreferenceRow>
              <PreferenceRow title="Anual" description={`${brl(billing?.priceAnnualCents ?? 14990)} por ano — o equivalente a ${brl(Math.round((billing?.priceAnnualCents ?? 14990) / 12))}/mês.`}>
                <button className="energy-button px-4 py-2 text-xs" onClick={() => void startCheckout('annual')} disabled={checkoutBusy !== null}>{checkoutBusy === 'annual' ? 'Abrindo…' : 'Assinar anual'}</button>
              </PreferenceRow>
            </>}
            {whatsappPhone
              ? <PreferenceRow title="Pri no WhatsApp" description={`Vinculado a ${whatsappPhone}.`}>
                  <button className="text-action" onClick={() => void unlinkWhatsapp()} disabled={linkBusy}><MessageCircle size={15}/> {linkBusy ? 'Desvinculando…' : 'Desvincular'}</button>
                </PreferenceRow>
              : <>
                  <PreferenceRow title="1. Mande &quot;oi&quot; no WhatsApp" description={WHATSAPP_LINK ? 'Abre a conversa com a Pri, já com a mensagem pronta para enviar.' : 'O número do Aprumo ainda não foi configurado.'}>
                    {WHATSAPP_LINK
                      ? <a className="text-action" href={WHATSAPP_LINK} target="_blank" rel="noreferrer"><MessageCircle size={15}/> Abrir WhatsApp</a>
                      : <span className="muted text-xs">Em breve</span>}
                  </PreferenceRow>
                  <PreferenceRow title="2. Cole o código que a Pri responder" description="São 6 dígitos, válidos por 15 minutos.">
                    <form onSubmit={linkWhatsapp} className="flex items-center gap-2">
                      <input value={linkCode} onChange={event => setLinkCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" aria-label="Código do WhatsApp" className="field w-24 py-2 text-center text-sm tracking-widest"/>
                      <button className="text-action" disabled={linkBusy || linkCode.length !== 6}><MessageCircle size={15}/> {linkBusy ? 'Vinculando…' : 'Vincular'}</button>
                    </form>
                  </PreferenceRow>
                </>}
          </div>
          {linkMsg && <p className="mx-6.75 mt-2 text-sm" style={{ color: 'var(--danger)' }}>{linkMsg}</p>}
        </>}

        {tab === 'notificacoes' && <><div className="settings-panel-title"><span><Bell size={20}/></span><div><h2>Notificações</h2><p>Escolha quando Aprumo pode chamar sua atenção.</p></div></div><div className="preference-list"><PreferenceRow title="Lembretes do dia" description="Compromissos prioritários e hábitos programados."><Toggle label="Lembretes do dia" value={values.reminders} onChange={() => flip('reminders')}/></PreferenceRow><PreferenceRow title="Resumo semanal" description="Uma leitura simples da sua evolução toda segunda-feira."><Toggle label="Resumo semanal" value={values.weekly} onChange={() => flip('weekly')}/></PreferenceRow><PreferenceRow title="Novidades por e-mail" description="Atualizações importantes do produto, sem excesso."><Toggle label="Novidades por e-mail" value={values.email} onChange={() => flip('email')}/></PreferenceRow></div></>}

        {tab === 'ia' && <><div className="settings-panel-title"><span><Bot size={20}/></span><div><h2>Contexto da Pri</h2><p>Escolha quais informações podem apoiar seus insights.</p></div></div><div className="safe-banner"><ShieldCheck size={18}/><div><strong>Você está no controle.</strong><p>Nenhum dado é publicado ou compartilhado automaticamente.</p></div></div><div className="preference-list"><PreferenceRow title="Tarefas e hábitos" description="Padrões de execução, constância e repasses."><Toggle label="Contexto de tarefas" value={values.tasks} onChange={() => flip('tasks')}/></PreferenceRow><PreferenceRow title="Metas" description="Relação entre suas ações e o progresso de longo prazo."><Toggle label="Contexto de metas" value={values.goals} onChange={() => flip('goals')}/></PreferenceRow><PreferenceRow title="Humor e emocional" description="Relação entre energia, emoções e rotina."><Toggle label="Contexto emocional" value={values.mood} onChange={() => flip('mood')}/></PreferenceRow></div></>}

        {tab === 'privacidade' && <><div className="settings-panel-title"><span><ShieldCheck size={20}/></span><div><h2>Privacidade e dados</h2><p>Seus dados são privados por padrão.</p></div></div><div className="privacy-status"><span><ShieldCheck size={23}/></span><div><small>STATUS DA CONTA</small><strong>Todos os seus dados estão privados</strong><p>Nada é publicado sem uma ação explícita sua.</p></div></div><div className="preference-list"><PreferenceRow title="Baixar meus dados" description="Exporte uma cópia das suas informações."><button className="text-action" onClick={exportData}><Download size={15}/> Exportar</button></PreferenceRow><PreferenceRow title="Dados armazenados" description="Veja quanto de cada tipo de informação está guardado."><button className="text-action" onClick={openDataModal}><Database size={15}/> Consultar</button></PreferenceRow></div></>}

        {tab === 'aparencia' && <><div className="settings-panel-title"><span><Moon size={20}/></span><div><h2>Aparência</h2><p>Ajuste o visual e o formato do aplicativo.</p></div></div><div className="theme-preview"><button className={`theme-swatch ${theme==='dark'?'active':''}`} aria-pressed={theme==='dark'} onClick={()=>chooseTheme('dark')}><span/><div/><small>Escuro</small></button><button className={`theme-swatch light ${theme==='light'?'active':''}`} aria-pressed={theme==='light'} onClick={()=>chooseTheme('light')}><span/><div/><small>Claro</small></button><button className={`theme-swatch auto ${theme==='system'?'active':''}`} aria-pressed={theme==='system'} onClick={()=>chooseTheme('system')}><span/><div/><small>Automático</small></button></div><p className="theme-hint">Automático acompanha o tema do seu celular ou computador — e troca sozinho quando ele mudar.</p><div className="preference-list"><PreferenceRow title="Fuso horário" description={timeZoneLabel(timezone)}><button className="text-action" onClick={() => { setTzQuery(''); setTzModal(true) }}><Clock3 size={15}/> Alterar</button></PreferenceRow><PreferenceRow title="Formato de data" description="DD/MM/AAAA — padrão brasileiro, usado em todo o Aprumo"><span className="muted text-xs">Fixo por enquanto</span></PreferenceRow></div></>}
      </section>
    </div>
    {emailModal && <div className="profile-modal-backdrop" onClick={() => setEmailModal(false)}><form className="surface profile-modal" onClick={event => event.stopPropagation()} onSubmit={changeEmail}><div className="flex items-center justify-between"><div><p className="eyebrow">Segurança da conta</p><h3>Alterar e-mail</h3></div><button type="button" className="icon-button" onClick={() => setEmailModal(false)}><X size={17}/></button></div><p className="muted text-sm">E-mail atual: {account.email}</p><label>Novo e-mail<input type="email" autoFocus value={newEmail} onChange={event => setNewEmail(event.target.value)} placeholder="voce@exemplo.com"/></label>{emailMsg && <p className="text-sm" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{emailMsg}</p>}<button className="energy-button py-3" disabled={emailBusy}>{emailBusy ? 'Enviando…' : 'Enviar confirmação'}</button></form></div>}

    {tzModal && <div className="profile-modal-backdrop" onClick={() => setTzModal(false)}><div className="surface profile-modal" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="eyebrow">Aparência</p><h3>Fuso horário</h3></div><button type="button" className="icon-button" onClick={() => setTzModal(false)}><X size={17}/></button></div><input autoFocus className="field" value={tzQuery} onChange={event => setTzQuery(event.target.value)} placeholder="Buscar cidade ou região…"/><div style={{ maxHeight: 280, overflowY: 'auto' }} className="-mx-1 mt-1">{filteredZones.map(zone => <button key={zone} onClick={() => void chooseTimezone(zone)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/5" style={{ color: zone === timezone ? 'var(--accent)' : 'var(--ink)' }}>{timeZoneLabel(zone)}{zone === timezone && <Check size={15}/>}</button>)}{filteredZones.length === 0 && <p className="muted p-3 text-sm">Nada encontrado.</p>}</div></div></div>}

    {dataModal && <div className="profile-modal-backdrop" onClick={() => setDataModal(false)}><div className="surface profile-modal" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="eyebrow">Privacidade e dados</p><h3>Dados armazenados</h3></div><button type="button" className="icon-button" onClick={() => setDataModal(false)}><X size={17}/></button></div>
      {dataError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{dataError}</p>}
      {!dataError && !dataCounts && <p className="muted text-sm">Consultando…</p>}
      {dataCounts && <div className="space-y-1">{dataCounts.map(row => <div key={row.label} className="flex items-center justify-between border-b py-2 text-sm last:border-0" style={{ borderColor: 'var(--line)' }}><span className="muted">{row.label}</span><strong>{row.count}</strong></div>)}</div>}
      <p className="muted text-xs">Tudo isso é seu — a exportação completa fica em &quot;Baixar meus dados&quot;.</p>
    </div></div>}
  </div>
}
