import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getStripe, priceIds } from '@/lib/stripe'

const PLANS = ['monthly', 'annual', 'topup'] as const
type PlanChoice = (typeof PLANS)[number]

/**
 * Cria uma sessão de Checkout do Stripe e devolve a URL para redirecionar.
 * Sempre garante um Cliente Stripe por usuário primeiro (guardado em
 * profiles.stripe_customer_id) — assim o webhook nunca precisa adivinhar
 * quem é quem por e-mail, como a integração antiga com a Cakto fazia.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json().catch(() => null) as { plan?: unknown } | null
    const plan = body?.plan
    if (typeof plan !== 'string' || !PLANS.includes(plan as PlanChoice)) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

    const prices = priceIds()
    const priceId = { monthly: prices.monthly, annual: prices.annual, topup: prices.topup }[plan as PlanChoice]
    if (!priceId) return NextResponse.json({ error: `Preço de "${plan}" não configurado no servidor.` }, { status: 503 })

    const stripe = getStripe()
    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
    let customerId = profile?.stripe_customer_id ?? null
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: plan === 'topup' ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      success_url: `${origin}/configuracoes?checkout=sucesso`,
      cancel_url: `${origin}/configuracoes?checkout=cancelado`,
      allow_promotion_codes: plan !== 'topup',
    })
    if (!session.url) throw new Error('O Stripe não retornou uma URL de checkout.')
    return NextResponse.json({ url: session.url })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível iniciar o checkout' }, { status: 500 })
  }
}
