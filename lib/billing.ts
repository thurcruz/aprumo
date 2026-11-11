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

/** O mínimo de uma fatura do Stripe que interessa para achar a assinatura dela. */
export interface InvoiceLike {
  parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null
  lines?: { data?: Array<{
    subscription?: string | { id: string } | null
    parent?: { subscription_item_details?: { subscription?: string | null } | null } | null
  }> }
}

const idOf = (value: string | { id: string } | null | undefined) => typeof value === 'string' ? value : value?.id ?? null

/**
 * A assinatura de uma fatura, ou null quando é avulsa. Desde a API 2025-03-31
 * ("basil") o campo `lines.data[].subscription` não vem mais: a assinatura mora
 * em `invoice.parent.subscription_details` (e na linha, em
 * `parent.subscription_item_details`). Ler só o campo antigo fazia toda fatura
 * de assinatura parecer avulsa — e os créditos do ciclo nunca eram concedidos.
 * O campo antigo fica como último recurso, para eventos de versões anteriores.
 */
export function subscriptionOfInvoice(invoice: InvoiceLike): string | null {
  const line = invoice.lines?.data?.[0]
  return idOf(invoice.parent?.subscription_details?.subscription)
    ?? line?.parent?.subscription_item_details?.subscription
    ?? idOf(line?.subscription)
}

/** 1 crédito = 1 mensagem da Pri, web ou WhatsApp. */
export const CREDITS_PER_MESSAGE = 1

/** Mensagem amigável para quando a chamada ao Stripe falha, sem vazar detalhe interno. */
export const BILLING_UNAVAILABLE_MESSAGE = 'Assinatura indisponível no momento. Tente novamente em instantes.'
