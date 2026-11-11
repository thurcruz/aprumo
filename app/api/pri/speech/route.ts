import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolvePlan, type SubscriptionStatus } from '@/lib/billing'
import { DEFAULT_PRI_VOICE, isPriVoice, PRI_SPEECH_MAX_CHARS, PRI_VOICE_STYLE } from '@/lib/priVoices'
import { cleanForSpeech } from '@/lib/voice'
import { priErrorMessage } from '@/lib/pri'

export const runtime = 'nodejs'

const TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts'

/**
 * A voz da Pri: transforma a resposta (já cobrada como mensagem) em áudio com a
 * voz escolhida. Não gasta crédito à parte — é a mesma resposta, falada —, mas
 * a voz natural é do Aprumo+; no Free, o cliente cai na voz do navegador.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: subscription } = await supabase.from('subscriptions').select('status')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (resolvePlan(subscription?.status as SubscriptionStatus | undefined) !== 'plus') {
      return NextResponse.json({ error: 'A voz da Pri é exclusiva do Aprumo+.', code: 'plan_required' }, { status: 402 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Configure OPENAI_API_KEY no servidor.' }, { status: 503 })

    const body = await request.json().catch(() => ({})) as { text?: unknown; voice?: unknown }
    const text = typeof body.text === 'string' ? cleanForSpeech(body.text).slice(0, PRI_SPEECH_MAX_CHARS) : ''
    if (!text) return NextResponse.json({ error: 'Texto vazio' }, { status: 400 })
    const voice = isPriVoice(body.voice) ? body.voice : DEFAULT_PRI_VOICE

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: TTS_MODEL, voice, input: text, instructions: PRI_VOICE_STYLE, response_format: 'mp3' }),
    })
    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '')
      console.error('[pri:voz]', response.status, detail.slice(0, 300))
      return NextResponse.json({ error: 'Não foi possível gerar a voz agora.' }, { status: 502 })
    }
    // Repassa o áudio em fluxo: o navegador começa a receber antes de a OpenAI terminar.
    return new Response(response.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } })
  } catch (error) {
    console.error('[pri:voz]', error)
    return NextResponse.json({ error: priErrorMessage(error) }, { status: 500 })
  }
}
