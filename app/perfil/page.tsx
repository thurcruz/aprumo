'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, BookOpen, Camera, Check, CheckSquare, Dumbbell, Edit3, Flag, Flame, Moon, Settings, Smile, Target, Timer, Trophy, X } from 'lucide-react'
import { useAprumoStore } from '@/lib/store'
import { useToday } from '@/lib/useToday'
import { initialsOf, updateProfile, useProfile } from '@/lib/profile'
import { AvatarError, removeAvatar, uploadAvatar } from '@/lib/avatar'
import { areaStats, consistencyOf, crossInsights, dailyScores, delta, heatmap, streaks, timeline, windowOf, type TimelineKind, type Trend } from '@/lib/evolution'
import { indexEvents } from '@/lib/utils'
import { computeXp } from '@/lib/xp'
import { PlusGate } from '@/components/plus/PlusGate'

const BACKEND_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const HEAT_WEEKS = 20
const timelineIcons: Record<TimelineKind, LucideIcon> = {
  goal: Target, milestone: Flag, book: BookOpen, 'first-workout': Dumbbell, record: Trophy, streak: Flame, 'first-focus': Timer,
}

/**
 * Cor do quadrado no mapa: vazio quando nada era devido, apagado quando nada
 * foi feito, e verde crescendo com a fração cumprida.
 */
function heatColor(ratio: number | null): string {
  if (ratio === null) return 'transparent'
  if (ratio === 0) return 'rgb(var(--fg-rgb) / .08)'
  if (ratio < 0.34) return 'rgba(208,224,39,.28)'
  if (ratio < 0.67) return 'rgba(208,224,39,.5)'
  if (ratio < 1) return 'rgba(208,224,39,.75)'
  return 'var(--energy)'
}

const shortDate = (day: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${day}T12:00:00`))

/** "↑ 12" ou "↓ 0,5". Sem vermelho: menos que no mês passado não é fracasso. */
function TrendBadge({ trend, unit = '' }: { trend: Trend; unit?: string }) {
  const change = delta(trend)
  if (change === null) return <span className="muted text-[11px]">sem base para comparar</span>
  if (change === 0) return <span className="muted text-[11px]">igual aos 30 dias anteriores</span>
  return <span className="text-[11px]" style={{ color: change > 0 ? 'var(--accent)' : 'var(--muted)' }}>
    {change > 0 ? '↑' : '↓'} {Math.abs(change).toLocaleString('pt-BR')}{unit} vs. 30 dias anteriores
  </span>
}

export default function PerfilPage() {
  const { store, applyProfile } = useAprumoStore()
  const profile = useProfile()
  const today = useToday()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [purpose, setLocalPurpose] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  /** Tudo aqui depende de "hoje", que só existe no navegador — no servidor a página sai sem números. */
  const evolution = useMemo(() => {
    if (!today) return null
    const events = store.taskEvents ?? []
    const heatScores = dailyScores(store.tasks, indexEvents(events), windowOf(today, HEAT_WEEKS * 7).from, today)
    const month = heatScores.slice(-30)
    const input = {
      tasks: store.tasks, events, focusSessions: store.focusSessions ?? [], workoutLogs: store.workoutLogs ?? [],
      books: store.books, moods: store.moods, sleep: store.sleep ?? [], goals: store.goals,
    }
    return {
      streak: streaks(events, today),
      consistency: consistencyOf(month),
      due: month.reduce((sum, day) => sum + day.due, 0),
      done: month.reduce((sum, day) => sum + day.done, 0),
      grid: heatmap(heatScores, today, HEAT_WEEKS),
      areas: areaStats(input, today),
      insights: crossInsights(input, today),
      moments: timeline(input, today),
      xp: computeXp(store, today),
    }
  }, [today, store])

  const avatarUrl = profile.avatarUrl
  const displayName = store.userName || profile.name
  const completedGoals = store.goals.filter(goal => goal.status === 'completed').length
  const movingGoals = store.goals.filter(goal => goal.status === 'active' || goal.status === 'paused').length

  function beginEdit() {
    setName(store.userName)
    setLocalPurpose(store.purpose)
    setFormError(null)
    setEditing(true)
  }

  /** Grava primeiro, confirma depois: "Perfil atualizado" só aparece quando o servidor aceitou. */
  async function save() {
    const nextName = name.trim()
    const nextPurpose = purpose.trim()
    if (nextName.length < 2) { setFormError('O nome precisa ter pelo menos 2 letras.'); return }
    setSaving(true)
    setFormError(null)
    try {
      if (BACKEND_ENABLED) {
        const response = await fetch('/api/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ displayName: nextName, purpose: nextPurpose }) })
        if (!response.ok) {
          const data = await response.json().catch(() => null) as { error?: string } | null
          throw new Error(data?.error ?? 'Não foi possível salvar.')
        }
      }
      applyProfile({ userName: nextName, purpose: nextPurpose })
      updateProfile({ name: nextName, purpose: nextPurpose })
      setEditing(false)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2200)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function changePhoto(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      updateProfile({ avatarUrl: await uploadAvatar(file, avatarUrl) })
    } catch (error) {
      setPhotoError(error instanceof AvatarError ? error.message : 'Não foi possível trocar a foto.')
    } finally {
      setPhotoBusy(false)
    }
  }

  async function dropPhoto() {
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      await removeAvatar(avatarUrl)
      updateProfile({ avatarUrl: null })
    } catch (error) {
      setPhotoError(error instanceof AvatarError ? error.message : 'Não foi possível remover a foto.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const a = evolution?.areas
  const areaCards: { href: string; label: string; icon: LucideIcon; value: string; detail?: string; trend: Trend; unit?: string }[] = a ? [
    { href: '/tarefas', label: 'Hábitos', icon: CheckSquare, value: a.consistency.current === null ? '—' : `${a.consistency.current}%`, detail: 'do que era devido foi cumprido', trend: a.consistency, unit: ' pontos' },
    { href: '/foco', label: 'Foco', icon: Timer, value: `${a.focusMinutes.current ?? 0} min`, detail: 'em sessões concluídas', trend: a.focusMinutes, unit: ' min' },
    { href: '/treino', label: 'Treino', icon: Dumbbell, value: `${a.workouts.current ?? 0} ${a.workouts.current === 1 ? 'treino' : 'treinos'}`, detail: a.volumeKg.current ? `${a.volumeKg.current.toLocaleString('pt-BR')} kg levantados` : undefined, trend: a.workouts },
    { href: '/mente', label: 'Mente', icon: BookOpen, value: `${a.booksFinished.current ?? 0} ${a.booksFinished.current === 1 ? 'livro' : 'livros'}`, detail: 'terminados', trend: a.booksFinished },
    { href: '/emocional', label: 'Humor', icon: Smile, value: a.mood.current === null ? '—' : `${a.mood.current.toLocaleString('pt-BR')} / 5`, detail: a.mood.current === null ? 'sem registros no período' : 'média dos dias registrados', trend: a.mood },
    { href: '/saude/sono', label: 'Sono', icon: Moon, value: a.sleepHours.current === null ? '—' : `${a.sleepHours.current.toLocaleString('pt-BR')} h`, detail: a.sleepHours.current === null ? 'sem registros no período' : 'média por noite', trend: a.sleepHours, unit: ' h' },
  ] : []

  return <div className="page-wrap profile-page">
    <header className="profile-header">
      <div><p className="eyebrow">Minha evolução</p><h1 className="display mt-3 text-4xl font-semibold md:text-6xl">O reflexo da sua<br/><span>constância.</span></h1></div>
      <Link href="/configuracoes" className="profile-settings"><Settings size={17}/> Configurações</Link>
    </header>

    <section className="profile-identity surface">
      <label className="profile-avatar cursor-pointer" aria-label="Trocar foto de perfil"
        style={avatarUrl ? { backgroundImage: `url(${JSON.stringify(avatarUrl)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        {!avatarUrl && <span>{initialsOf(displayName)}</span>}
        <div className="avatar-ring"/>
        <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 bg-energy text-[#11130f]" style={{ borderColor: '#11130f' }}>
          {photoBusy ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#11130f] border-t-transparent"/> : <Camera size={14}/>}
        </span>
        <input type="file" accept="image/*" className="hidden" disabled={photoBusy}
          onChange={event => { void changePhoto(event.target.files?.[0]); event.target.value = '' }}/>
      </label>
      <div className="min-w-0 flex-1">
        <h2>{displayName || 'Sua conta'}</h2>
        <p>{store.purpose || 'Defina o propósito que guia sua evolução.'}</p>
        <div className="profile-meta">
          <span><Flame size={14}/> {evolution ? `${evolution.streak.current} ${evolution.streak.current === 1 ? 'dia' : 'dias'} em movimento` : '—'}</span>
          {evolution && evolution.streak.best > 0 && <span><Trophy size={14}/> melhor sequência: {evolution.streak.best} {evolution.streak.best === 1 ? 'dia' : 'dias'}</span>}
        </div>
        {photoError && <p className="mt-3 text-xs" style={{ color: 'var(--danger)' }}>{photoError}</p>}
      </div>
      <button className="profile-edit" onClick={beginEdit}><Edit3 size={16}/> Editar perfil</button>
    </section>

    {saved && <div className="profile-toast"><Check size={15}/> Perfil atualizado</div>}

    <section className="profile-stats">
      <article className="surface"><span className="stat-icon"><Flame size={20}/></span><div>
        <small>SEQUÊNCIA ATUAL</small>
        <strong>{evolution?.streak.current ?? '—'} <em>dias</em></strong>
        <p>Dias seguidos com pelo menos uma conclusão</p>
      </div></article>
      <article className="surface"><span className="stat-icon"><Trophy size={20}/></span><div>
        <small>CONSTÂNCIA · 30 DIAS</small>
        <strong>{evolution?.consistency ?? '—'}{evolution?.consistency !== null && evolution?.consistency !== undefined && <em>%</em>}</strong>
        <p>{evolution && evolution.due > 0 ? `${evolution.done} de ${evolution.due} compromissos devidos` : 'Nenhum hábito ou tarefa devido ainda'}</p>
      </div></article>
      <article className="surface"><span className="stat-icon"><Target size={20}/></span><div>
        <small>METAS CONCLUÍDAS</small>
        <strong>{completedGoals}</strong>
        <p>{movingGoals} em movimento</p>
      </div></article>
    </section>

    {evolution && <section className="surface mt-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">Mapa de constância</p><h2 className="mt-2 text-xl font-semibold">Últimas {HEAT_WEEKS} semanas</h2></div>
        <div className="muted flex items-center gap-1.5 text-[10px]">menos {[0, 0.2, 0.5, 0.8, 1].map(ratio => <span key={ratio} className="h-3 w-3 rounded-[3px]" style={{ background: heatColor(ratio) }}/>)} mais</div>
      </div>
      <p className="muted mt-2 text-xs">Cada quadrado é um dia: quanto do que era devido foi cumprido. Quadrado vazio é dia sem nada devido — não conta como falha.</p>
      <div className="mt-5 overflow-x-auto pb-1">
        <div className="flex w-max gap-1">
          <div className="muted mr-1 grid grid-rows-7 gap-1 text-[9px]">{['S', '', 'Q', '', 'S', '', ''].map((label, index) => <span key={index} className="h-3 leading-3">{label}</span>)}</div>
          {evolution.grid.map(week => <div key={week[0].date} className="grid grid-rows-7 gap-1">
            {week.map(cell => <span key={cell.date}
              title={cell.future ? undefined : `${shortDate(cell.date)} · ${cell.ratio === null ? 'nada devido' : `${Math.round(cell.ratio * 100)}% cumprido`}`}
              className="h-3 w-3 rounded-[3px]"
              style={{ background: cell.future ? 'transparent' : heatColor(cell.ratio), border: cell.ratio === null && !cell.future ? '1px solid rgb(var(--fg-rgb) / .07)' : undefined }}/>)}
          </div>)}
        </div>
      </div>
    </section>}

    {evolution && <section className="mt-10">
      <div className="profile-section-title"><div><p className="eyebrow">Por área</p><h3>Seus últimos 30 dias</h3></div></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {areaCards.map(card => <Link key={card.href} href={card.href} className="surface flex flex-col gap-2 p-5 text-white no-underline">
          <div className="flex items-center gap-3"><span className="stat-icon"><card.icon size={18}/></span><strong className="text-sm">{card.label}</strong><ArrowUpRight size={15} className="muted ml-auto"/></div>
          <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          {card.detail && <p className="muted text-xs">{card.detail}</p>}
          <TrendBadge trend={card.trend} unit={card.unit}/>
        </Link>)}
      </div>
    </section>}

    {evolution && <section className="mt-5">
      <PlusGate title="Descubra o que muda seus dias" description="A Pri cruza humor, sono, treino, foco e hábitos para mostrar o que costuma andar junto com os seus melhores dias.">
        <div className="surface p-6">
          <p className="eyebrow">Cruzamentos</p>
          <h2 className="mt-2 text-xl font-semibold">O que acompanha seus melhores dias</h2>
          {evolution.insights.length === 0
            ? <p className="muted mt-3 text-sm">Ainda não há dias suficientes para comparar. Registre seu humor no Hoje por mais alguns dias — cada comparação precisa de pelo menos 3 dias de cada lado.</p>
            : <ul className="mt-4 space-y-3">{evolution.insights.map(insight => <li key={insight.id} className="rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--line)' }}>
                {insight.text}
                <p className="muted mt-1 text-[11px]">{insight.samples[0]} dias contra {insight.samples[1]}</p>
              </li>)}</ul>}
          <p className="muted mt-4 text-[11px]">Correlação, não causa: mostra o que costuma andar junto, não o que provoca o quê.</p>
        </div>
      </PlusGate>
    </section>}

    {evolution && <section className="surface mt-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-energy text-lg font-bold text-[#11130f]">{evolution.xp.level}</span>
          <div><p className="eyebrow">Nível {evolution.xp.level}</p><p className="muted text-sm">{evolution.xp.xp.toLocaleString('pt-BR')} XP acumulado</p></div>
        </div>
        <span className="muted text-sm">{evolution.xp.intoLevel}/{evolution.xp.perLevel} para o nível {evolution.xp.level + 1}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/7"><div className="h-full rounded-full bg-energy" style={{ width: `${Math.round(evolution.xp.intoLevel / evolution.xp.perLevel * 100)}%` }}/></div>
      <p className="eyebrow mt-7">Conquistas</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {evolution.xp.achievements.map(achievement => <div key={achievement.id} className="rounded-2xl border p-4" style={{ borderColor: achievement.unlocked ? 'rgba(208,224,39,.4)' : 'var(--line)', opacity: achievement.unlocked ? 1 : 0.45 }}>
          <div className="flex items-center gap-2"><span className="text-xl">{achievement.icon}</span>{achievement.unlocked && <Check size={14} className="text-energy"/>}</div>
          <p className="mt-2 text-sm font-semibold">{achievement.label}</p>
          <p className="muted text-xs">{achievement.desc}</p>
        </div>)}
      </div>
    </section>}

    {evolution && <section className="surface mt-5 p-6">
      <p className="eyebrow">Linha do tempo</p>
      <h2 className="mt-2 text-xl font-semibold">Seus marcos</h2>
      {evolution.moments.length === 0
        ? <p className="muted mt-3 text-sm">Seus marcos aparecem aqui: metas concluídas, livros terminados, recordes de carga, sua maior sequência.</p>
        : <ol className="mt-5 space-y-4 border-l border-white/[.08] pl-5">
            {evolution.moments.map((moment, index) => {
              const Icon = timelineIcons[moment.kind]
              return <li key={`${moment.kind}-${moment.date}-${index}`} className="relative">
                <span className="absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full bg-energy/15 text-energy"><Icon size={11}/></span>
                <p className="text-sm font-semibold">{moment.title}</p>
                <p className="muted text-xs">{shortDate(moment.date)}{moment.detail ? ` · ${moment.detail}` : ''}</p>
              </li>
            })}
          </ol>}
    </section>}

    {editing && <div className="profile-modal-backdrop" onClick={() => setEditing(false)}>
      <div className="surface profile-modal" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div><p className="eyebrow">Sua identidade</p><h3>Editar perfil</h3></div>
          <button className="icon-button" onClick={() => setEditing(false)} aria-label="Fechar"><X size={17}/></button>
        </div>
        <label>Nome<input value={name} onChange={event => setName(event.target.value)} maxLength={60}/></label>
        <label>Seu propósito<textarea value={purpose} onChange={event => setLocalPurpose(event.target.value)} maxLength={180} rows={4}/><small>{purpose.length}/180</small></label>
        {avatarUrl && <button type="button" onClick={() => void dropPhoto()} disabled={photoBusy} className="muted self-start text-xs underline-offset-2 hover:underline">Remover foto de perfil</button>}
        {formError && <p className="text-xs" style={{ color: 'var(--danger)' }}>{formError}</p>}
        <button className="energy-button py-3" onClick={() => void save()} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
      </div>
    </div>}
  </div>
}
