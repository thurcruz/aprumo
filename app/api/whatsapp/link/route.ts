import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Consome um código de vínculo (a Pri manda por WhatsApp assim que a pessoa
 * escreve pela primeira vez) e liga aquele número à conta autenticada. Usa a
 * chave de serviço para ler `whatsapp_link_codes`: essa tabela não tem
 * nenhuma policy para o cliente comum, porque o código é a prova de posse do
 * número — ninguém devesse conseguir ler o código de outra pessoa.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json().catch(() => null) as { code?: unknown } | null
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'O código tem 6 números.' }, { status: 400 })

    const admin = createSupabaseAdminClient()
    const { data: entry, error } = await admin.from('whatsapp_link_codes').select('phone_e164,expires_at').eq('code', code).maybeSingle()
    if (error) throw error
    if (!entry || new Date(entry.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Código inválido ou expirado. Mande uma mensagem para o WhatsApp do Aprumo para receber um novo.' }, { status: 400 })
    }
    // Uso único: apagado assim que lido, mesmo que o vínculo abaixo falhe — a
    // pessoa só precisa mandar outra mensagem para receber um código novo.
    await admin.from('whatsapp_link_codes').delete().eq('code', code)

    const { error: updateError } = await supabase.from('profiles')
      .update({ whatsapp_phone_e164: entry.phone_e164, whatsapp_verified_at: new Date().toISOString() }).eq('id', user.id)
    if (updateError) {
      if (updateError.code === '23505') return NextResponse.json({ error: 'Este número já está vinculado a outra conta Aprumo.' }, { status: 409 })
      throw updateError
    }
    return NextResponse.json({ phone: entry.phone_e164 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível vincular o WhatsApp agora.' }, { status: 500 })
  }
}

/** Desvincula — a pessoa pode querer trocar de número, ou parar de usar a Pri pelo WhatsApp. */
export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const { error } = await supabase.from('profiles').update({ whatsapp_phone_e164: null, whatsapp_verified_at: null }).eq('id', user.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível desvincular agora.' }, { status: 500 })
  }
}
