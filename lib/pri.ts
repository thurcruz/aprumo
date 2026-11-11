/**
 * Mensagem de uma falha da Pri. Erros do Supabase chegam como objeto simples
 * (não `Error`) — antes viravam um "Pri indisponível" que escondia a causa.
 */
export function priErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'Pri indisponível'
}

/** Compartilhado entre a página cheia da Pri e o botão flutuante. */
export interface PriCta { label: string; href: string }

export const PRI_BILLING_CTA: Record<string, PriCta> = {
  plan_required: { label: 'Assinar Aprumo+', href: '/configuracoes?tab=aprumo-plus' },
  insufficient_credits: { label: 'Comprar mais créditos', href: '/configuracoes?tab=aprumo-plus' },
}
