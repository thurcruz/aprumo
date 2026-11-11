'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, Check, History, LockKeyhole, MessageSquarePlus, Sparkles, UserRound, X } from 'lucide-react'
import { PRI_BILLING_CTA } from '@/lib/pri'
import Button, { buttonClass } from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import IconButton from '@/components/ui/IconButton'
import PageHeader from '@/components/ui/PageHeader'

type Message = { id?: string; role: 'user' | 'assistant'; content: string; sources?: string[]; proposal?: unknown; action_status?: string | null; cta?: { label: string; href: string } }
type Conversation = { id: string; title: string; updated_at: string }
const sourceLabels: Record<string, string> = { commitments: 'tarefas e hábitos', goals: 'metas', books: 'conhecimento', notes: 'anotações', moods: 'humor', finance: 'financeiro', antivicio: 'antivício' }

export default function Pri() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, loading])

  async function load(id?: string) {
    const response = await fetch(`/api/pri${id ? `?conversationId=${id}` : ''}`, { cache: 'no-store' })
    if (!response.ok) return
    const data = await response.json()
    setConversations(data.conversations ?? [])
    setConversationId(data.conversationId)
    setMessages((data.messages ?? []).map((item: { id: string; role: 'user' | 'assistant'; content: string; sources?: string[]; proposed_action?: unknown; action_status?: string | null }) => ({ id: item.id, role: item.role, content: item.content, sources: item.sources, proposal: item.proposed_action, action_status: item.action_status })))
  }

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [])

  async function send(event: FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setMessages(current => [...current, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    try {
      const response = await fetch('/api/pri', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: text, conversationId }) })
      const data = await response.json()
      setConversationId(data.conversationId ?? conversationId)
      setMessages(current => [...current, { id: data.messageId, role: 'assistant', content: data.answer ?? data.error ?? 'Não foi possível responder agora.', sources: data.sources, proposal: data.proposal, action_status: data.proposal ? 'pending' : null, cta: data.code ? PRI_BILLING_CTA[data.code] : undefined }])
      if (!data.code) void load(data.conversationId ?? conversationId ?? undefined)
    } catch {
      setMessages(current => [...current, { role: 'assistant', content: 'A conexão falhou. Tente novamente em instantes.' }])
    } finally {
      setLoading(false)
    }
  }

  async function decide(message: Message, confirm: boolean) {
    if (!message.id) return
    setLoading(true)
    const response = await fetch('/api/pri', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmMessageId: message.id, confirm }) })
    const data = await response.json()
    setMessages(current => current.map(item => item.id === message.id ? { ...item, action_status: confirm ? 'confirmed' : 'cancelled' } : item).concat({ role: 'assistant', content: data.answer ?? data.error }))
    setLoading(false)
    void load(conversationId ?? undefined)
  }

  function newChat() { setConversationId(null); setMessages([]); setHistoryOpen(false) }

  return <div className="page-wrap ai-workspace">
    <aside className={`ai-history ${historyOpen ? 'open' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-label uppercase text-fg-3">Histórico</p>
        <IconButton label="Fechar histórico" size="sm" className="md:hidden" onClick={() => setHistoryOpen(false)}><X size={16}/></IconButton>
      </div>
      <button className="ai-new-chat" onClick={newChat}><MessageSquarePlus size={16}/> Nova conversa</button>
      <nav>
        {conversations.map(item => <button key={item.id} className={conversationId === item.id ? 'active' : ''} onClick={() => { void load(item.id); setHistoryOpen(false) }}>
          <span>{item.title}</span><small>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(item.updated_at))}</small>
        </button>)}
      </nav>
    </aside>

    <main className="flex min-h-[80svh] min-w-0 flex-col">
      <PageHeader eyebrow={<span className="inline-flex items-center gap-1.5"><span aria-hidden>✦</span> Seu copiloto com ação</span>} title="Pri"
        description="Conversa, consulta seus dados autorizados e propõe registros — sempre com sua confirmação."
        actions={<IconButton label="Histórico de conversas" variant="outline" className="md:hidden" onClick={() => setHistoryOpen(true)}><History size={18}/></IconButton>}/>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 pb-6">
        {messages.length === 0 && <Card padding="lg" className="text-center">
          <Sparkles className="mx-auto text-fg-1"/>
          <h2 className="mt-4 text-h2">O que vamos organizar?</h2>
          <p className="mt-2 text-body-s text-fg-2">Peça para registrar uma tarefa, anotação, transação ou página lida.</p>
        </Card>}
        {messages.map((message, index) => <div key={message.id ?? index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
          {message.role === 'assistant' && <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-fg-1">✦</span>}
          <div className={`max-w-[88%] rounded-card p-4 text-body-s ${message.role === 'user' ? 'bg-surface-pressed text-fg-1' : 'border border-line bg-surface-1 text-fg-1'}`}>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.action_status === 'pending' && <div className="mt-4 flex gap-2">
              <Button size="sm" icon={<Check size={14}/>} onClick={() => void decide(message, true)}>Confirmar</Button>
              <Button size="sm" variant="secondary" onClick={() => void decide(message, false)}>Cancelar</Button>
            </div>}
            {message.action_status === 'confirmed' && <p className="mt-3 flex items-center gap-1 text-caption text-fg-1"><Check size={13}/> Alteração confirmada</p>}
            {message.cta && <Link href={message.cta.href} className={`${buttonClass({ size: 'sm' })} mt-4`}>{message.cta.label}</Link>}
            {message.action_status === 'cancelled' && <p className="mt-3 text-caption text-fg-3">Alteração cancelada</p>}
            {message.sources && message.sources.length > 0 && <p className="mt-3 border-t border-line pt-2 text-caption text-fg-3">Contexto usado: {message.sources.map(source => sourceLabels[source] ?? source).join(', ')}.</p>}
          </div>
          {message.role === 'user' && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-2"><UserRound size={15}/></span>}
        </div>)}
        {loading && <div className="flex items-center gap-2 text-caption text-fg-2"><Sparkles className="animate-pulse" size={15}/> Organizando com segurança...</div>}
        <div ref={endRef}/>
      </div>

      <form onSubmit={send} className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] mx-auto flex w-full max-w-3xl items-center gap-2 rounded-full border border-line-strong bg-surface-2 p-1.5 pl-4 shadow-overlay md:bottom-6">
        <Sparkles className="shrink-0 text-fg-3" size={17}/>
        <input aria-label="Mensagem para Pri" value={input} onChange={event => setInput(event.target.value)} maxLength={2000}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-body outline-none placeholder:text-fg-3" placeholder="Ex.: Agende treino amanhã às 8h por 45 minutos"/>
        <button disabled={loading || !input.trim()} aria-label="Enviar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fg-1 text-canvas transition-opacity disabled:opacity-30"><ArrowUp size={18}/></button>
      </form>
      <p className="mt-3 flex items-center justify-center gap-2 text-caption text-fg-3"><LockKeyhole size={12}/> A IA só altera dados depois da sua confirmação.</p>
    </main>
  </div>
}
