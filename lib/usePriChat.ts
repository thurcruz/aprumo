'use client'

import { useRef, useState } from 'react'
import { PRI_BILLING_CTA, type PriCta } from './pri'
import type { PriScreen } from './priContext'

export interface PriMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  /** A Pri propôs uma alteração e espera a confirmação. */
  actionStatus?: 'pending' | 'confirmed' | 'cancelled' | null
  cta?: PriCta
}

/**
 * A conversa rápida com a Pri: enviar, e confirmar ou cancelar o que ela
 * propõe. Devolve as respostas também como valor (não só no estado) para o
 * modo voz poder falar a resposta assim que ela chega.
 */
export function usePriChat() {
  const [messages, setMessages] = useState<PriMessage[]>([])
  const [busy, setBusy] = useState(false)
  // Em ref: o laço de voz chama estas funções de dentro de callbacks antigos.
  const conversation = useRef<string | null>(null)

  async function send(text: string, options: { screen?: PriScreen; voice?: boolean } = {}): Promise<PriMessage | null> {
    const message = text.trim()
    if (!message) return null
    setMessages(current => [...current, { role: 'user', content: message }])
    setBusy(true)
    try {
      const response = await fetch('/api/pri', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, conversationId: conversation.current, screen: options.screen, voice: options.voice }),
      })
      const data = await response.json()
      conversation.current = data.conversationId ?? conversation.current
      const reply: PriMessage = {
        id: data.messageId, role: 'assistant',
        content: data.answer ?? data.error ?? 'Não foi possível responder agora.',
        actionStatus: data.proposal ? 'pending' : null,
        cta: data.code ? PRI_BILLING_CTA[data.code] : undefined,
      }
      setMessages(current => [...current, reply])
      return reply
    } catch {
      const reply: PriMessage = { role: 'assistant', content: 'A conexão falhou. Tente novamente em instantes.' }
      setMessages(current => [...current, reply])
      return reply
    } finally {
      setBusy(false)
    }
  }

  /** Confirma ou cancela a alteração proposta. Devolve o que a Pri respondeu. */
  async function decide(message: PriMessage, confirm: boolean): Promise<string | null> {
    if (!message.id) return null
    setBusy(true)
    try {
      const response = await fetch('/api/pri', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmMessageId: message.id, confirm }) })
      const data = await response.json()
      const answer: string = data.answer ?? data.error ?? 'Não foi possível concluir agora.'
      setMessages(current => current
        .map(item => item.id === message.id ? { ...item, actionStatus: confirm && response.ok ? 'confirmed' as const : 'cancelled' as const } : item)
        .concat({ role: 'assistant', content: answer }))
      return answer
    } catch {
      return 'A conexão falhou. Tente novamente em instantes.'
    } finally {
      setBusy(false)
    }
  }

  const pending = [...messages].reverse().find(item => item.actionStatus === 'pending') ?? null
  return { messages, busy, send, decide, pending }
}
