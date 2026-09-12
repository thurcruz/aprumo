import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolvePlan, type SubscriptionStatus } from '@/lib/billing'

/**
 * Estado da assinatura + saldo de créditos. Plano vem do status da assinatura
 * (tabela `subscriptions`, escrita só pelo webhook do Stripe); o saldo é
 * independente — dá para ser Plus e estar sem créditos no fim do ciclo.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const [subscriptionR, creditsR] = await Promise.all([
      supabase.from('subscriptions').select('status,current_period_end,cancel_at_period_end')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.rpc('get_my_credit_account'),
    ])
    if (subscriptionR.error) throw subscriptionR.error
    if (creditsR.error) throw creditsR.error

    const subscription = subscriptionR.data
    return NextResponse.json({
      plan: resolvePlan(subscription?.status as SubscriptionStatus | undefined),
      status: subscription?.status ?? null,
      renewsAt: subscription?.current_period_end ?? null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      balance: creditsR.data?.[0]?.balance ?? 0,
      priceMonthlyCents: Number(process.env.NEXT_PUBLIC_PRICE_MONTHLY_CENTS ?? 2490),
      priceAnnualCents: Number(process.env.NEXT_PUBLIC_PRICE_ANNUAL_CENTS ?? 14990),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Saldo indisponível' }, { status: 503 })
  }
}
