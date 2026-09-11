'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'
import { Check, Flame, Plus, Trash2, Trophy, UsersRound, Vote, WifiOff } from 'lucide-react'
import { castVote, getCommunityServerSnapshot, getCommunitySnapshot, subscribeCommunity } from '@/lib/community'
import { tally, voteFeatures } from '@/lib/votes'
import { deletePost, getFeedServerSnapshot, getFeedSnapshot, subscribeFeed } from '@/lib/feed'
import { postHeadline, timeAgo } from '@/lib/posts'
import { initialsOf } from '@/lib/profile'

const tabs = [
  { id: 'mural', label: 'Mural' },
  { id: 'desafios', label: 'Desafios' },
  { id: 'circulos', label: 'Círculos' },
  { id: 'votacao', label: 'Votação' },
] as const
type TabId = (typeof tabs)[number]['id']

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof Trophy; title: string; description: string; action?: string }) {
  return <div className="surface flex flex-col items-center gap-3 p-10 text-center">
    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white/50"><Icon size={22}/></span>
    <div><p className="font-semibold">{title}</p><p className="muted mx-auto mt-1 max-w-sm text-sm">{description}</p></div>
    {action && <span className="muted rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider">{action}</span>}
  </div>
}

export default function Comunidade() {
  const [tab, setTab] = useState<TabId>('mural')
  const state = useSyncExternalStore(subscribeCommunity, getCommunitySnapshot, getCommunityServerSnapshot)
  /** O placar só existe depois do voto — o servidor não o entrega antes. */
  const results = useMemo(() => state.counts ? tally(state.counts) : null, [state.counts])
  const busy = state.pending || state.status === 'loading'

  const feed = useSyncExternalStore(subscribeFeed, getFeedSnapshot, getFeedServerSnapshot)
  // "agora" do tempo relativo: uma vez por minuto, não a cada render.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer) }, [])

  return <div className="page-wrap">
    <header className="mb-8">
      <p className="eyebrow">Comunidade</p>
      <h1 className="display mt-3 max-w-2xl text-4xl font-semibold md:text-6xl">Evolua por você.<br/>Não sozinho.</h1>
      <p className="muted mt-4 max-w-xl">Comunidade não é um extra. Aqui você entra em desafios, participa de círculos e decide o que Aprumo constrói em seguida.</p>
    </header>

    <nav className="mb-7 flex gap-2 overflow-x-auto pb-1">
      {tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className="shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition" style={{ borderColor: tab === item.id ? 'var(--energy)' : 'var(--line)', background: tab === item.id ? 'var(--energy)' : 'transparent', color: tab === item.id ? '#11130f' : 'var(--muted)' }}>{item.label}</button>)}
    </nav>

    <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {tab === 'mural' && <div className="space-y-3">
        {feed.status === 'local' && <p className="muted rounded-2xl border p-3 text-xs" style={{ borderColor: 'var(--line)' }}>Modo local: sem servidor configurado, o mural não fica disponível.</p>}
        {feed.status === 'unavailable' && <p className="muted rounded-2xl border p-3 text-xs" style={{ borderColor: 'var(--line)' }}>O mural ainda não foi ativado no servidor.</p>}
        {feed.status === 'offline' && feed.posts.length === 0 && <p className="flex items-center gap-2 rounded-2xl border p-3 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}><WifiOff size={14} className="shrink-0"/> Não conseguimos falar com o servidor agora.</p>}
        {(feed.status === 'ready' || feed.status === 'offline') && feed.posts.length === 0 && <EmptyState
          icon={Flame}
          title="Ninguém publicou ainda"
          description="Quando você concluir uma sessão de foco de pelo menos 5 minutos, pode compartilhar aqui."
        />}
        {feed.posts.map(post => <div key={post.id} className="surface flex items-start gap-3 p-4">
          {post.authorAvatarUrl
            ? <span className="h-9 w-9 shrink-0 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(post.authorAvatarUrl)})` }} aria-hidden/>
            : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-xs font-bold" aria-hidden>{initialsOf(post.authorName)}</span>}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><p className="text-sm font-semibold">{post.authorName}</p><span className="muted text-xs">· {timeAgo(post.createdAt, now)}</span></div>
            <p className="mt-1 flex items-center gap-1.5 text-sm"><Flame size={14} className="shrink-0 text-energy"/> {postHeadline(post)}{post.status === 'abandoned' && <span className="muted"> · interrompida</span>}</p>
          </div>
          {post.mine && <button onClick={() => void deletePost(post.id)} aria-label="Apagar publicação" className="muted shrink-0 rounded-lg p-1.5 hover:text-danger"><Trash2 size={15}/></button>}
        </div>)}
      </div>}

      {tab === 'desafios' && <EmptyState
        icon={Trophy}
        title="Nenhum desafio ativo"
        description="Os desafios oficiais aparecem aqui assim que forem publicados. Você entra, faz check-in e acompanha seu progresso."
        action="Em breve"
      />}

      {tab === 'circulos' && <div className="space-y-4">
        <EmptyState
          icon={UsersRound}
          title="Você ainda não está em nenhum círculo"
          description="Círculos são grupos por interesse — corrida, leitura, faculdade, projetos. Cada um com seu próprio espaço."
        />
        <button disabled className="surface flex w-full items-center gap-3 p-5 text-left opacity-50" title="Disponível quando a comunidade for ativada">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-energy/10 text-energy"><Plus size={18}/></span>
          <div><p className="font-semibold">Criar um círculo</p><p className="muted text-xs">Disponível quando a comunidade for ativada.</p></div>
        </button>
      </div>}

      {tab === 'votacao' && <div className="space-y-5">
        <section className="surface p-6">
          <div className="flex items-center gap-2"><Vote className="text-energy" size={18}/><p className="eyebrow">Próxima feature</p></div>
          <h2 className="mt-2 text-xl font-semibold">Você decide o próximo ciclo</h2>
          <p className="muted mt-2 text-sm">
            Uma pessoa, um voto por rodada — Free também vota, porque participar da construção não é benefício premium.
            {results
              ? ` ${results.total} ${results.total === 1 ? 'voto' : 'votos'} até agora. Você pode trocar o seu enquanto a rodada estiver aberta.`
              : ' O resultado aparece depois que você vota, para ninguém escolher só porque uma opção já está na frente.'}
          </p>
        </section>

        {state.status === 'offline' && <p className="flex items-center gap-2 rounded-2xl border p-3 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
          <WifiOff size={14} className="shrink-0"/> Não conseguimos falar com o servidor agora. O voto mostrado é o último salvo neste aparelho; o resultado aparece quando a conexão voltar.
        </p>}
        {state.status === 'local' && <p className="muted rounded-2xl border p-3 text-xs" style={{ borderColor: 'var(--line)' }}>Modo local: sem servidor configurado, o voto fica só neste aparelho e não entra na contagem.</p>}
        {state.error && <p className="rounded-2xl border p-3 text-xs" style={{ borderColor: 'rgba(255,107,107,.35)', color: 'var(--danger)' }}>{state.error}</p>}

        <section className="grid gap-3">
          {voteFeatures.map(feature => {
            const chosen = state.vote === feature.id
            const row = results?.rows.find(item => item.id === feature.id)
            return <div key={feature.id} className="surface p-5" style={{ borderColor: chosen ? 'rgba(208,224,39,.5)' : undefined }}>
              <div className="flex items-center gap-4">
                <span className="text-2xl">{feature.emoji}</span>
                <div className="min-w-0 flex-1"><p className="font-semibold">{feature.title}</p><p className="muted mt-1 text-sm">{feature.desc}</p></div>
                {chosen
                  ? <span className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'rgba(208,224,39,.5)', color: 'var(--accent)' }}><Check size={13}/> {state.pending ? 'Enviando…' : 'Seu voto'}</span>
                  : <button onClick={() => void castVote(feature.id)} disabled={busy}
                      className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition"
                      style={results
                        ? { background: 'transparent', color: 'var(--muted)', border: '1px solid var(--line)', opacity: busy ? .5 : 1 }
                        : { background: 'var(--energy)', color: '#11130f', opacity: busy ? .5 : 1 }}>
                      {results ? 'Trocar para esta' : 'Votar'}
                    </button>}
              </div>
              {row && <div className="mt-4">
                <div className="h-1.5 rounded-full bg-white/[.07]"><div className="h-full rounded-full transition-all" style={{ width: `${row.percent}%`, background: chosen ? 'var(--energy)' : 'rgba(208,224,39,.45)' }}/></div>
                <p className="muted mt-1.5 text-xs">{row.percent}% · {row.votes} {row.votes === 1 ? 'voto' : 'votos'}</p>
              </div>}
            </div>
          })}
        </section>
      </div>}
    </motion.div>
  </div>
}
