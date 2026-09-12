import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { creditsForPrice, parsePriceCredits } from '@/lib/billing'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  typeof value === 'string' ? value : value?.id ?? null

/** profiles.stripe_customer_id -> user_id. Sem isso não há o que fazer com o evento. */
async function resolveUserId(supabase: SupabaseAdmin, customerId: string | null): Promise<string | null> {
  if (!customerId) return null
  const { data } = await supabase.from('profiles').select('id').eq('stripe_customer_id', customerId).maybeSingle()
  return data?.id ?? null
}

async function upsertSubscription(supabase: SupabaseAdmin, sub: Stripe.Subscription) {
  const userId = await resolveUserId(supabase, idOf(sub.customer))
  if (!userId) { console.error('Stripe webhook: assinante sem profile correspondente', sub.customer); return }
  const item = sub.items.data[0]
  const { error } = await supabase.from('subscriptions').upsert({
    id: sub.id,
    user_id: userId,
    price_id: item?.price.id ?? '',
    status: sub.status,
    current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (error) console.error('Stripe webhook: falha ao gravar assinatura', error.message)
}

async function grantForInvoice(supabase: SupabaseAdmin, invoice: Stripe.Invoice) {
  const line = invoice.lines.data[0]
  if (!line?.subscription) return // fatura avulsa, não de assinatura — nada a conceder aqui
  const priceId = typeof line.pricing?.price_details?.price === 'string' ? line.pricing.price_details.price : line.pricing?.price_details?.price?.id
  const credits = creditsForPrice(parsePriceCredits(process.env.STRIPE_PRICE_CREDITS), priceId)
  if (!credits) { console.error('Stripe webhook: fatura paga sem crédito mapeado para o preço', priceId); return }
  const userId = await resolveUserId(supabase, idOf(invoice.customer))
  if (!userId) { console.error('Stripe webhook: fatura de cliente sem profile correspondente', invoice.customer); return }
  const { error } = await supabase.rpc('grant_credits', {
    p_user_id: userId, p_amount: credits, p_kind: 'grant',
    p_provider: 'stripe', p_provider_reference: invoice.id, p_description: 'Renovação do ciclo',
  })
  if (error) console.error('Stripe webhook: falha ao conceder créditos da renovação', error.message)
}

async function grantForTopup(supabase: SupabaseAdmin, session: Stripe.Checkout.Session) {
  const stripe = getStripe()
  const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })
  const priceId = items.data[0]?.price?.id
  const credits = creditsForPrice(parsePriceCredits(process.env.STRIPE_PRICE_CREDITS), priceId)
  if (!credits) { console.error('Stripe webhook: pacote avulso sem crédito mapeado para o preço', priceId); return }
  const userId = await resolveUserId(supabase, idOf(session.customer)) ?? session.client_reference_id
  if (!userId) { console.error('Stripe webhook: sessão de pagamento sem usuário identificável', session.id); return }
  const { error } = await supabase.rpc('grant_credits', {
    p_user_id: userId, p_amount: credits, p_kind: 'topup',
    p_provider: 'stripe', p_provider_reference: session.id, p_description: 'Pacote extra de créditos',
  })
  if (error) console.error('Stripe webhook: falha ao conceder créditos do pacote', error.message)
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get('stripe-signature')
  if (!secret) return NextResponse.json({ error: 'Webhook não configurado' }, { status: 503 })
  if (!signature) return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 })

  // Corpo cru: a verificação de assinatura do Stripe exige os bytes exatos, antes de qualquer parse.
  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = await getStripe().webhooks.constructEventAsync(rawBody, signature, secret)
  } catch (error) {
    return NextResponse.json({ error: `Assinatura inválida: ${error instanceof Error ? error.message : 'erro desconhecido'}` }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await upsertSubscription(supabase, event.data.object)
        break
      case 'invoice.paid':
        await grantForInvoice(supabase, event.data.object)
        break
      case 'checkout.session.completed': {
        const session = event.data.object
        // Assinatura: customer.subscription.* já cuida do registro; aqui só o pacote avulso precisa de ação.
        if (session.mode === 'payment') await grantForTopup(supabase, session)
        break
      }
      default:
        break // evento que não usamos — recebido e ignorado de propósito
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook:', error instanceof Error ? error.message : error)
    // 500 faz o Stripe tentar de novo mais tarde; grant_credits é idempotente, então reprocessar é seguro.
    return NextResponse.json({ error: 'Falha ao processar evento' }, { status: 500 })
  }
}
