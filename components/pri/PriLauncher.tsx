'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Bot, Lock, Maximize2, Sparkles, X } from 'lucide-react'
import { usePlan } from '@/lib/plan'
import { PRI_BILLING_CTA } from '@/lib/pri'

type Message = { role: 'user' | 'assistant'; content: string; cta?: { label: string; href: string } }

/**
 * A Pri em qualquer lugar: um botão flutuante que abre uma conversa rápida
 * sem sair da tela atual. Reaproveita a mesma API da página /pri — é uma
 * janela mais curta para a mesma conversa, não um assistente separado.
 */
export default function PriLauncher() {
  const pathname = usePathname()
  const { plan, loading } = usePlan()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, sending])

  // Na própria página da Pri o botão só duplicaria a mesma conversa em miniatura.
  if (pathname === '/pri') return null

  async function send(event: FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    setMessages(current => [...current, { role: 'user', content: text }])
    setInput(''); setSending(true)
    try {
      const response = await fetch('/api/pri', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: text, conversationId }) })
      const data = await response.json()
      setConversationId(data.conversationId ?? conversationId)
      setMessages(current => [...current, { role: 'assistant', content: data.answer ?? data.error ?? 'Não foi possível responder agora.', cta: data.code ? PRI_BILLING_CTA[data.code] : undefined }])
    } catch {
      setMessages(current => [...current, { role: 'assistant', content: 'A conexão falhou. Tente novamente em instantes.' }])
    } finally { setSending(false) }
  }

  return <>
    <button onClick={() => setOpen(value => !value)} aria-label={open ? 'Fechar a Pri' : 'Conversar com a Pri'}
      className="pri-launcher-fab" aria-expanded={open}>
      {open ? <X size={22}/> : <Sparkles size={22}/>}
    </button>
    <AnimatePresence>
      {open && <motion.div initial={{ opacity: 0, y: 16, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: .97 }} transition={{ duration: .18 }} className="pri-launcher-panel glass">
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-center gap-2"><Bot size={17} className="text-energy"/><strong className="text-sm">Pri</strong></div>
          <div className="flex items-center gap-1">
            <Link href="/pri" aria-label="Abrir conversa completa" className="icon-button h-8 w-8" onClick={() => setOpen(false)}><Maximize2 size={14}/></Link>
            <button aria-label="Fechar" className="icon-button h-8 w-8" onClick={() => setOpen(false)}><X size={15}/></button>
          </div>
        </div>

        {!loading && plan === 'free'
          ? <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-energy/10 text-energy"><Lock size={19}/></span>
              <p className="text-sm font-semibold">A Pri é do Aprumo+</p>
              <p className="muted text-xs">Converse, peça para organizar sua vida e receba insights — na plataforma e no WhatsApp.</p>
              <Link href="/configuracoes?tab=aprumo-plus" onClick={() => setOpen(false)} className="energy-button mt-1 px-4 py-2 text-xs no-underline">Assinar Aprumo+</Link>
            </div>
          : <>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && <p className="muted text-center text-xs">Peça para registrar algo, ou pergunte o que quiser sobre sua rotina.</p>}
                {messages.map((message, index) => <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : ''}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${message.role === 'user' ? 'bg-energy text-black' : 'surface'}`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.cta && <Link href={message.cta.href} onClick={() => setOpen(false)} className="energy-button mt-2 inline-flex items-center px-3 py-1.5 text-[11px] no-underline">{message.cta.label}</Link>}
                  </div>
                </div>)}
                {sending && <p className="muted flex items-center gap-2 text-xs"><Sparkles className="animate-pulse text-energy" size={13}/> Organizando com segurança...</p>}
                <div ref={endRef}/>
              </div>
              <form onSubmit={send} className="flex items-center gap-2 border-t p-3" style={{ borderColor: 'var(--line)' }}>
                <input aria-label="Mensagem para Pri" value={input} onChange={event => setInput(event.target.value)} maxLength={2000}
                  className="field min-w-0 flex-1 py-2 text-xs" placeholder="Fale com a Pri…"/>
                <button disabled={sending || !input.trim()} aria-label="Enviar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-energy text-black disabled:opacity-40"><ArrowUp size={16}/></button>
              </form>
            </>}
      </motion.div>}
    </AnimatePresence>
  </>
}
