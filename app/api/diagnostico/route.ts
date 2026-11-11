import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { parseDiagnosisAnswers } from '@/lib/diagnosis'
import { generateInitialPlan } from '@/lib/diagnosis-engine'
import { priErrorMessage } from '@/lib/pri'
import { isoDate, parseDate } from '@/lib/utils'

/** Diagnóstico → plano inicial. Devolve a prévia; gravar é com o cliente, depois da confirmação. */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json().catch(() => null) as { answers?: unknown; today?: unknown } | null
    const answers = parseDiagnosisAnswers(body?.answers)
    if (!answers) return NextResponse.json({ error: 'Conte seu nome, onde quer chegar e a área.' }, { status: 400 })
    // O dia vem do aparelho (fuso da pessoa); só aceita uma data real, perto de hoje.
    const today = typeof body?.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today) && isoDate(parseDate(body.today)) === body.today
      && Math.abs(parseDate(body.today).getTime() - Date.now()) < 2 * 86_400_000 ? body.today : isoDate(new Date())

    const result = await generateInitialPlan({ supabase, userId: user.id, answers, today })
    if (!result.ok) {
      const status = result.code === 'rate_limited' ? 429 : result.code ? 402 : 503
      return NextResponse.json({ error: result.error, code: result.code }, { status })
    }
    return NextResponse.json({ plan: result.plan })
  } catch (error) {
    console.error('[pri:diagnostico]', error)
    return NextResponse.json({ error: priErrorMessage(error) }, { status: 500 })
  }
}
