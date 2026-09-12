'use client'

import { useEffect, useState } from 'react'
import type { Plan } from './billing'

export type { Plan }

export interface PlanState {
  plan: Plan
  /** Créditos restantes no ciclo. Zerar não tira o Plus — só impede novas mensagens da Pri até renovar ou comprar mais. */
  balance: number
  renewsAt: string | null
  cancelAtPeriodEnd: boolean
  priceMonthlyCents: number
  priceAnnualCents: number
  loading: boolean
}

const initial: PlanState = { plan: 'free', balance: 0, renewsAt: null, cancelAtPeriodEnd: false, priceMonthlyCents: 2490, priceAnnualCents: 14990, loading: true }

/** Aprumo+ é uma assinatura de verdade (Stripe) — o plano vem do status guardado em `subscriptions`, não de saldo. */
export function usePlan(): PlanState {
  const [state, setState] = useState<PlanState>(initial)
  useEffect(() => {
    let active = true
    fetch('/api/billing', { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((data: Partial<PlanState> | null) => {
        if (!active) return
        if (!data) { setState(current => ({ ...current, loading: false })); return }
        setState({
          plan: data.plan === 'plus' ? 'plus' : 'free',
          balance: Number(data.balance ?? 0),
          renewsAt: data.renewsAt ?? null,
          cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
          priceMonthlyCents: Number(data.priceMonthlyCents ?? initial.priceMonthlyCents),
          priceAnnualCents: Number(data.priceAnnualCents ?? initial.priceAnnualCents),
          loading: false,
        })
      })
      .catch(() => { if (active) setState(current => ({ ...current, loading: false })) })
    return () => { active = false }
  }, [])
  return state
}
