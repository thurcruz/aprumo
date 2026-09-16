import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { adaptRoutinePlan } from '@/lib/routine-plan-engine'
import { findRoutinePlan, parsePlanAnswers } from '@/lib/routine-plans'

/** A Pri adapta um plano pronto à rotina. Devolve a prévia; gravar é com o cliente, depois da confirmação. */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json().catch(() => null) as { slug?: unknown; answers?: unknown } | null
    const template = typeof body?.slug === 'string' ? findRoutinePlan(body.slug) : undefined
    if (!template) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 400 })
    const answers = parsePlanAnswers(body?.answers, template)
    if (!answers) return NextResponse.json({ error: 'Escolha pelo menos um dia e a data de início.' }, { status: 400 })

    const result = await adaptRoutinePlan({ supabase, userId: user.id, template, answers })
    if (!result.ok) {
      const status = result.code === 'rate_limited' ? 429 : result.code ? 402 : 503
      return NextResponse.json({ error: result.error, code: result.code }, { status })
    }
    return NextResponse.json({ habits: result.habits, summary: result.summary })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Pri indisponível' }, { status: 500 })
  }
}
