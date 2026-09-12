/** Compartilhado entre a página cheia da Pri e o botão flutuante. */
export interface PriCta { label: string; href: string }

export const PRI_BILLING_CTA: Record<string, PriCta> = {
  plan_required: { label: 'Assinar Aprumo+', href: '/configuracoes?tab=aprumo-plus' },
  insufficient_credits: { label: 'Comprar mais créditos', href: '/configuracoes?tab=aprumo-plus' },
}
