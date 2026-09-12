import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION ?? 'v23.0'

/**
 * Confere a assinatura `X-Hub-Signature-256` que a Meta manda em todo POST do
 * webhook — sem isso, qualquer um poderia forjar uma mensagem "recebida" e
 * gastar crédito de outra pessoa, ou vincular um número que não é dele.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret || !signatureHeader?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const received = signatureHeader.slice('sha256='.length)
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(received, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** A Meta manda o número sem "+" (ex.: "5511999998888"). Guardamos em E.164 com "+", como a coluna já se chama. */
export function toE164(metaFrom: string): string {
  const digits = metaFrom.replace(/[^\d]/g, '')
  return `+${digits}`
}

/** 6 dígitos, fáceis de digitar de cabeça vindo do WhatsApp para o navegador. */
export function generateLinkCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** Manda uma mensagem de texto simples pelo número comercial do Aprumo. */
export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) throw new Error('WhatsApp não configurado no servidor.')

  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace(/^\+/, ''), type: 'text', text: { body } }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Falha ao enviar mensagem no WhatsApp: ${detail.slice(0, 300)}`)
  }
}
