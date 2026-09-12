import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

/** Abre o Portal do Cliente do Stripe: trocar cartão, cancelar, baixar recibo — sem UI própria para isso. */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
    if (!profile?.stripe_customer_id) return NextResponse.json({ error: 'Você ainda não tem uma assinatura para gerenciar.' }, { status: 404 })

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/configuracoes`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível abrir o portal de assinatura' }, { status: 500 })
  }
}
