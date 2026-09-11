import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isVoteFeature, VOTE_SEASON, type VoteCounts } from '@/lib/votes'

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>

async function context() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return error || !user ? null : { supabase, user }
}

/**
 * Contagem agregada da temporada. A função é `security definer` e devolve só
 * totais — ninguém descobre por aqui em quem outra pessoa votou.
 */
async function countsFor(supabase: Supabase): Promise<VoteCounts> {
  const { data, error } = await supabase.rpc('feature_vote_counts', { target_season: VOTE_SEASON })
  if (error) throw error
  return Object.fromEntries((data ?? []).map(row => [row.feature_id, Number(row.votes)]))
}

/**
 * Seu voto e — só se você já votou — o placar da temporada.
 *
 * A regra "resultado só depois de votar" mora aqui, e não na interface:
 * esconder na tela seria só esconder, e esta rota entregaria os números a
 * qualquer um que a chamasse. Ver o placar antes cria efeito manada.
 */
export async function GET() {
  try {
    const ctx = await context()
    if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const { data, error } = await ctx.supabase.from('feature_votes').select('feature_id')
      .eq('user_id', ctx.user.id).eq('season', VOTE_SEASON).maybeSingle()
    if (error) throw error
    const vote = data?.feature_id ?? null
    return NextResponse.json({ vote, counts: vote ? await countsFor(ctx.supabase) : null })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Votação indisponível' }, { status: 503 })
  }
}

/** Registra ou troca o voto: é um por pessoa por temporada, e a chave primária garante isso. */
export async function POST(request: Request) {
  try {
    const ctx = await context()
    if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const body = await request.json().catch(() => null) as { featureId?: unknown } | null
    if (!isVoteFeature(body?.featureId)) return NextResponse.json({ error: 'Opção de voto inválida' }, { status: 400 })
    const { error } = await ctx.supabase.from('feature_votes').upsert(
      { user_id: ctx.user.id, season: VOTE_SEASON, feature_id: body.featureId, voted_at: new Date().toISOString() },
      { onConflict: 'user_id,season' },
    )
    if (error) throw error
    return NextResponse.json({ vote: body.featureId, counts: await countsFor(ctx.supabase) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível votar' }, { status: 500 })
  }
}
