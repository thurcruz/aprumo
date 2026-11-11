'use client'

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Check, Maximize2, Mic, Sparkles, X } from 'lucide-react'
import Button, { buttonClass } from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import IconButton from '@/components/ui/IconButton'
import Sheet from '@/components/ui/Sheet'
import PriOrb, { type PriOrbState } from './PriOrb'
import { priContextFor } from '@/lib/priContext'
import { closePri, togglePri, usePriLauncher } from '@/lib/priLauncher'
import { usePriChat, type PriMessage } from '@/lib/usePriChat'
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/useMediaQuery'
import { duration, ease } from '@/lib/motion'
import { recognitionConstructor, speak, stopSpeaking, unlockSpeech, voiceDecision, type Recognition } from '@/lib/voice'
import { cx } from '@/lib/cx'

const noopSubscribe = () => () => {}
const orbLabel: Record<PriOrbState, string> = { idle: 'Toque na Pri para falar', listening: 'Ouvindo…', thinking: 'Pensando…', speaking: 'Falando…' }

/**
 * A Pri em qualquer lugar: um botão flutuante que abre uma conversa rápida
 * sem sair da tela. Ela chega já no assunto da tela (em Finanças, dinheiro),
 * e dá para falar com ela por voz — ela ouve, responde falando e pede
 * confirmação, também falada, antes de alterar qualquer dado.
 *
 * No celular a conversa abre num Sheet; no desktop, num painel flutuante.
 */
export default function PriLauncher() {
  const pathname = usePathname()
  const open = usePriLauncher()
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const context = priContextFor(pathname)
  const chat = usePriChat()
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  // Reconhecimento de voz só existe no navegador; no servidor, sem microfone.
  const voiceSupported = useSyncExternalStore(noopSubscribe, () => recognitionConstructor() !== null, () => false)

  // --- Voz -----------------------------------------------------------------
  const [voiceMode, setVoiceMode] = useState(false)
  const [orb, setOrb] = useState<PriOrbState>('idle')
  const [heard, setHeard] = useState('')
  const [reply, setReply] = useState('')
  const [voiceError, setVoiceError] = useState('')
  const recognition = useRef<Recognition | null>(null)
  /** O modo voz ainda está ligado? Lido nos callbacks, que sobrevivem a renders. */
  const voiceOn = useRef(false)
  /** Proposta pendente mais recente, para o "sim"/"não" falado. */
  const pendingRef = useRef<PriMessage | null>(null)
  useEffect(() => { pendingRef.current = chat.pending })

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [chat.messages, chat.busy])
  // Trocar de tela fecha a conversa rápida: ela acompanha a tela em que foi aberta.
  useEffect(() => { closePri() }, [pathname])
  // Fechou (ou saiu): para de ouvir e de falar na hora.
  useEffect(() => {
    if (!open) return
    return () => { voiceOn.current = false; recognition.current?.abort(); recognition.current = null; stopSpeaking() }
  }, [open])

  // Na própria página da Pri a janela só duplicaria a mesma conversa em miniatura.
  if (pathname === '/pri') return null

  function listen() {
    const Constructor = recognitionConstructor()
    if (!Constructor || !voiceOn.current) return
    stopSpeaking()
    const rec = new Constructor()
    rec.lang = 'pt-BR'
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1
    let finalText = ''
    rec.onresult = event => {
      let interim = ''
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index]
        if (result.isFinal) finalText += result[0].transcript
        else interim += result[0].transcript
      }
      setHeard(`${finalText} ${interim}`.trim())
    }
    rec.onerror = event => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') setVoiceError('Permita o uso do microfone para falar com a Pri.')
      else if (event.error === 'no-speech') setVoiceError('Não ouvi nada. Toque na Pri para tentar de novo.')
      else if (event.error !== 'aborted') setVoiceError('A voz falhou por aqui. Toque na Pri para tentar de novo.')
    }
    rec.onend = () => {
      recognition.current = null
      if (!voiceOn.current) return
      const text = finalText.trim()
      if (!text) { setOrb('idle'); return }
      void answer(text)
    }
    recognition.current = rec
    setVoiceError('')
    setHeard('')
    setOrb('listening')
    try { rec.start() } catch { setOrb('idle') }
  }

  /** O que foi dito vira pedido — ou, havendo proposta pendente, confirmação. */
  async function answer(text: string) {
    setOrb('thinking')
    const pending = pendingRef.current
    const decision = pending ? voiceDecision(text) : null
    let spoken: string | null
    if (pending && decision) {
      spoken = await chat.decide(pending, decision === 'yes')
    } else {
      const message = await chat.send(text, { screen: context.screen, voice: true })
      spoken = message ? `${message.content}${message.actionStatus === 'pending' ? ' Diga confirmar ou cancelar.' : ''}` : null
    }
    if (!voiceOn.current) return
    setReply(spoken ?? '')
    if (!spoken) { setOrb('idle'); return }
    // Terminou de falar: volta a ouvir, como numa conversa.
    speak(spoken, { onStart: () => setOrb('speaking'), onEnd: () => { if (voiceOn.current) listen() } })
  }

  function startVoice() {
    unlockSpeech()
    voiceOn.current = true
    setVoiceMode(true)
    setReply('')
    listen()
  }

  function stopVoice() {
    voiceOn.current = false
    recognition.current?.abort()
    recognition.current = null
    stopSpeaking()
    setVoiceMode(false)
    setOrb('idle')
    setHeard('')
  }

  /** Tocar na esfera: fala se estava quieta, encerra a escuta, ou interrompe a fala para responder. */
  function tapOrb() {
    if (orb === 'listening') recognition.current?.stop()
    else if (orb === 'speaking') stopSpeaking()
    else if (orb === 'idle') listen()
  }

  function toggleLauncher() {
    if (open) stopVoice()
    else { setVoiceMode(false); setVoiceError('') }
    togglePri()
  }

  function close() {
    stopVoice()
    closePri()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || chat.busy) return
    setInput('')
    await chat.send(text, { screen: context.screen })
  }

  // --- Visual ----------------------------------------------------------------

  const proposalActions = (message: PriMessage) => <div className="mt-3 flex gap-2">
    <Button size="sm" icon={<Check size={14}/>} disabled={chat.busy} onClick={() => void chat.decide(message, true)}>Confirmar</Button>
    <Button size="sm" variant="secondary" disabled={chat.busy} onClick={() => void chat.decide(message, false)}>Cancelar</Button>
  </div>

  const chatView = <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
    {chat.messages.length === 0 && <div className="flex flex-col items-center pb-2 pt-4 text-center">
      <PriOrb size={76}/>
      <p className="mt-4 text-h3 text-fg-1">{context.greeting}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {context.suggestions.map(suggestion => <Chip key={suggestion} size="sm" selected={false} disabled={chat.busy} className="h-auto min-h-8 py-1.5 text-left"
          onClick={() => void chat.send(suggestion, { screen: context.screen })}>{suggestion}</Chip>)}
      </div>
    </div>}
    {chat.messages.map((message, index) => <div key={message.id ?? index} className={`flex ${message.role === 'user' ? 'justify-end' : ''}`}>
      <div className={cx('max-w-[85%] rounded-card px-3.5 py-2.5 text-body-s', message.role === 'user' ? 'bg-surface-pressed text-fg-1' : 'border border-line bg-surface-1 text-fg-1')}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.actionStatus === 'pending' && proposalActions(message)}
        {message.actionStatus === 'confirmed' && <p className="mt-2 flex items-center gap-1 text-caption text-area-ink"><Check size={12}/> Confirmado</p>}
        {message.actionStatus === 'cancelled' && <p className="mt-2 text-caption text-fg-3">Cancelado</p>}
        {message.cta && <Link href={message.cta.href} onClick={close} className={`${buttonClass({ size: 'sm' })} mt-2`}>{message.cta.label}</Link>}
      </div>
    </div>)}
    {chat.busy && <div className="flex items-center gap-2 text-caption text-fg-2"><PriOrb state="thinking" size={18}/> Pensando…</div>}
    <div ref={endRef}/>
  </div>

  const voiceView = <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-5 py-6 text-center">
    <button type="button" onClick={tapOrb} aria-label={orbLabel[orb]} disabled={orb === 'thinking'} className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg-1">
      <PriOrb state={orb} size={desktop ? 150 : 176}/>
    </button>
    <p aria-live="polite" className={cx('text-label uppercase', orb === 'idle' ? 'text-fg-3' : 'text-area-ink')}>{orbLabel[orb]}</p>
    {heard && <p className="max-w-sm text-body-s italic text-fg-2">“{heard}”</p>}
    {reply && orb !== 'listening' && <p className="line-clamp-5 max-w-sm text-body text-fg-1">{reply}</p>}
    {chat.pending && orb !== 'thinking' && <div className="flex flex-col items-center">
      <p className="text-caption text-fg-3">Diga “confirmar” ou “cancelar” — ou toque:</p>
      {proposalActions(chat.pending)}
    </div>}
    {voiceError && <p className="max-w-xs text-caption text-alert">{voiceError}</p>}
    <Button size="sm" variant="ghost" icon={<X size={15}/>} onClick={stopVoice}>Voltar ao texto</Button>
  </div>

  const composer = !voiceMode && <form onSubmit={submit} className="flex items-center gap-2">
    <input aria-label="Mensagem para Pri" value={input} onChange={event => setInput(event.target.value)} maxLength={2000}
      className="field min-w-0 flex-1" placeholder={context.placeholder}/>
    {voiceSupported && !input.trim()
      ? <button type="button" onClick={startVoice} aria-label="Falar com a Pri" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fg-1 text-canvas transition-transform active:scale-95"><Mic size={18}/></button>
      : <button disabled={chat.busy || !input.trim()} aria-label="Enviar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fg-1 text-canvas transition-opacity disabled:opacity-30"><ArrowUp size={18}/></button>}
  </form>

  const body = voiceMode ? voiceView : chatView
  const contextBadge = <span className="inline-flex items-center gap-1.5"><Sparkles size={12}/> Pri · {context.label}</span>
  const fullLink = <Link href="/pri" onClick={close} className="inline-flex items-center gap-1.5 text-caption text-fg-2 no-underline hover:text-fg-1"><Maximize2 size={13}/> Abrir conversa completa</Link>

  return <>
    {/* O botão flutuante: no celular, acima do menu de vidro; no desktop, no canto. */}
    <button onClick={toggleLauncher} aria-label={open ? 'Fechar a Pri' : `Falar com a Pri sobre ${context.label}`} aria-expanded={open} className="pri-launcher-fab">
      {open && desktop ? <X size={22}/> : <PriOrb size={34} state={chat.busy ? 'thinking' : 'idle'}/>}
    </button>

    {!desktop && <Sheet open={open} onClose={close} eyebrow={context.label === 'Aprumo' ? 'Pri' : `Pri · ${context.label}`} title={voiceMode ? 'Conversa por voz' : 'Conversa rápida'} description={fullLink} footer={composer || undefined}>
      <div className="-mx-5 -my-4 flex min-h-[46svh] flex-col">{body}</div>
    </Sheet>}

    {desktop && <AnimatePresence>
      {open && <motion.div initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }}
        transition={{ duration: duration.base, ease }} className="pri-launcher-panel glass" role="dialog" aria-label="Pri">
        <div className="flex items-center justify-between border-b border-line py-2 pl-4 pr-2">
          <p className="text-label uppercase text-fg-2">{contextBadge}</p>
          <div className="flex items-center">
            <Link href="/pri" aria-label="Abrir conversa completa" onClick={close} className="grid h-9 w-9 place-items-center rounded-full text-fg-2 hover:bg-surface-hover hover:text-fg-1"><Maximize2 size={15}/></Link>
            <IconButton label="Fechar" size="sm" onClick={close}><X size={16}/></IconButton>
          </div>
        </div>
        {body}
        {composer && <div className="border-t border-line p-3">{composer}</div>}
      </motion.div>}
    </AnimatePresence>}
  </>
}
