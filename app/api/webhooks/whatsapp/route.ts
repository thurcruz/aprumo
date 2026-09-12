import { NextResponse } from 'next/server'
import type { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseAdminClient as makeAdminClient } from '@/lib/supabase/admin'
import { answerPri } from '@/lib/pri-engine'
import { generateLinkCode, sendWhatsAppText, toE164, verifyWebhookSignature } from '@/lib/whatsapp'

export const runtime = 'nodejs'

const LINK_CODE_TTL_MS = 15 * 60 * 1000
type AdminClient = ReturnType<typeof createSupabaseAdminClient>

/** A Meta chama isto ao salvar a URL do webhook no painel — é só provar que sabemos o token combinado. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const challenge = params.get('hub.challenge')
  if (params.get('hub.mode') === 'subscribe' && params.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verificação inválida' }, { status: 403 })
}

interface InboundMessage { id: string; from: string; type: string; text?: { body?: string } }
interface WebhookPayload { entry?: Array<{ changes?: Array<{ value?: { messages?: InboundMessage[] } }> }> }

async function replyOrLog(to: string, body: string) {
  try { await sendWhatsAppText(to, body) } catch (error) { console.error('WhatsApp: falha ao responder', error instanceof Error ? error.message : error) }
}

/** Reaproveita um código ainda válido para o mesmo número, em vez de gerar um a cada "oi" enquanto a pessoa não confirma. */
async function linkCodeFor(supabase: AdminClient, phone: string): Promise<string> {
  const { data: existing } = await supabase.from('whatsapp_link_codes').select('code')
    .eq('phone_e164', phone).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (existing) return existing.code
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateLinkCode()
    const { error } = await supabase.from('whatsapp_link_codes').insert({ code, phone_e164: phone, expires_at: new Date(Date.now() + LINK_CODE_TTL_MS).toISOString() })
    if (!error) return code
  }
  throw new Error('Não foi possível gerar um código de vínculo.')
}

async function handleMessage(supabase: AdminClient, message: InboundMessage) {
  if (message.type !== 'text' || !message.text?.body) return // v1: só texto simples, nada de áudio/imagem ainda

  // Deduplicação: a Meta reenvia o webhook se a resposta demorar. Um erro aqui
  // (quase sempre a chave primária repetida) significa "já processamos essa
  // mensagem" — melhor pular do que arriscar cobrar crédito duas vezes.
  const { error: dupError } = await supabase.from('whatsapp_processed_messages').insert({ wamid: message.id })
  if (dupError) return

  const phone = toE164(message.from)
  const { data: profile } = await supabase.from('profiles').select('id').eq('whatsapp_phone_e164', phone).maybeSingle()

  if (!profile) {
    const code = await linkCodeFor(supabase, phone)
    await replyOrLog(phone, `Olá! Para conversar com a Pri por aqui, cole este código em Aprumo → Configurações → Aprumo+:\n\n${code}\n\nEle vale por 15 minutos.`)
    return
  }

  const result = await answerPri({ supabase, userId: profile.id, message: message.text.body, channel: 'whatsapp' })
  await replyOrLog(phone, result.ok ? result.answer : result.error)
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  if (!verifyWebhookSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  let payload: WebhookPayload
  try { payload = JSON.parse(rawBody) as WebhookPayload } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const supabase = makeAdminClient()
  const messages = (payload.entry ?? []).flatMap(entry => entry.changes ?? []).flatMap(change => change.value?.messages ?? [])
  for (const message of messages) {
    try { await handleMessage(supabase, message) }
    catch (error) { console.error('WhatsApp webhook:', error instanceof Error ? error.message : error) }
  }

  // Sempre 200: a Meta trata qualquer outra coisa como falha de entrega e insiste em reenviar,
  // e além de mensagens ela também manda confirmações de leitura/entrega neste mesmo webhook,
  // que não processamos de propósito (messages vazio acima já as ignora).
  return NextResponse.json({ received: true })
}
