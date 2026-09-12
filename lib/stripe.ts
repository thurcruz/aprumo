import 'server-only'
import Stripe from 'stripe'

let client: Stripe | null = null

/** Instancia sob demanda: importar este arquivo não deve falhar quando a chave ainda não está configurada. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Configure STRIPE_SECRET_KEY no servidor.')
  if (!client) client = new Stripe(key)
  return client
}

/** IDs dos preços que a Checkout usa — mensal e anual são assinatura; o pacote extra é pagamento avulso. */
export function priceIds() {
  return {
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    annual: process.env.STRIPE_PRICE_ANNUAL,
    topup: process.env.STRIPE_PRICE_TOPUP,
  }
}
