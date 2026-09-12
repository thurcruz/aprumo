/**
 * Regras de assinatura e créditos que não dependem do SDK do Stripe nem do
 * banco — por isso são puras e testáveis. `lib/stripe.ts` cuida do resto
 * (o cliente de verdade, que só existe no servidor).
 */

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused'
export type Plan = 'free' | 'plus'

/**
 * `past_due` ainda conta como Plus: a pessoa está em cobrança (o Stripe tenta
 * de novo sozinho, por alguns dias) — cortar o acesso no primeiro atraso
 * seria punir antes da hora. As demais situações são Free.
 */
export function resolvePlan(status: SubscriptionStatus | null | undefined): Plan {
  return status === 'active' || status === 'trialing' || status === 'past_due' ? 'plus' : 'free'
}

/** "price_xxx:300,price_yyy:3600" -> Map. Entradas malformadas são ignoradas, não derrubam o resto. */
export function parsePriceCredits(raw: string | undefined): Map<string, number> {
  const map = new Map<string, number>()
  for (const entry of (raw ?? '').split(',')) {
    const separator = entry.lastIndexOf(':')
    if (separator < 1) continue
    const id = entry.slice(0, separator).trim()
    const credits = Number(entry.slice(separator + 1).trim())
    if (id && Number.isSafeInteger(credits) && credits > 0) map.set(id, credits)
  }
  return map
}

export function creditsForPrice(map: Map<string, number>, priceId: string | null | undefined): number | null {
  if (!priceId) return null
  return map.get(priceId) ?? null
}

/** 1 crédito = 1 mensagem da Pri, web ou WhatsApp. */
export const CREDITS_PER_MESSAGE = 1

/** Mensagem amigável para quando a chamada ao Stripe falha, sem vazar detalhe interno. */
export const BILLING_UNAVAILABLE_MESSAGE = 'Assinatura indisponível no momento. Tente novamente em instantes.'
