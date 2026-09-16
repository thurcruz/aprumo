import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NOT_READY = { error: 'Os desafios ainda não foram ativados no servidor.', code: 'not_ready' }

async function context() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return error || !user ? null : { supabase, user }
}

/** Tabela ou função ainda não existem: a migração não foi aplicada. */
function notReady(error: { code?: string } | null) {
  return error?.code === '42P01' || error?.code === 'PGRST205' || error?.code === 'PGRST202'
}

/** Desafios ativos, com participação e progresso do usuário atual. */
export async function GET() {
  try {
    const ctx = await context()
    if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: challenges, error } = await ctx.supabase.from('challenges')
      .select('id,slug,title,description,cover_url,duration_days,starts_on,ends_on')
      .eq('active', true).order('created_at', { ascending: false })
    if (notReady(error)) return NextResponse.json(NOT_READY, { status: 503 })
    if (error) throw error

    const ids = (challenges ?? []).map(row => row.id)
    const counts = new Map<string, number>()
    const mineByChallenge = new Map<string, { joined_at: string; completed_at: string | null }>()
    const checkinsByChallenge = new Map<string, number>()

    if (ids.length) {
      const [participantsResult, mineResult] = await Promise.all([
        ctx.supabase.from('challenge_participants').select('challenge_id').in('challenge_id', ids),
        ctx.supabase.from('challenge_participants').select('challenge_id,joined_at,completed_at').eq('user_id', ctx.user.id).in('challenge_id', ids),
      ])
      if (participantsResult.error) throw participantsResult.error
      if (mineResult.error) throw mineResult.error
      for (const row of participantsResult.data ?? []) counts.set(row.challenge_id, (counts.get(row.challenge_id) ?? 0) + 1)
      for (const row of mineResult.data ?? []) mineByChallenge.set(row.challenge_id, row)

      const mineIds = [...mineByChallenge.keys()]
      if (mineIds.length) {
        const { data: checkins, error: checkinsError } = await ctx.supabase.from('challenge_checkins')
          .select('challenge_id').eq('user_id', ctx.user.id).in('challenge_id', mineIds)
        if (checkinsError) throw checkinsError
        for (const row of checkins ?? []) checkinsByChallenge.set(row.challenge_id, (checkinsByChallenge.get(row.challenge_id) ?? 0) + 1)
      }
    }

    const result = (challenges ?? []).map(row => {
      const participation = mineByChallenge.get(row.id)
      return {
        id: row.id, slug: row.slug, title: row.title, description: row.description, coverUrl: row.cover_url,
        durationDays: row.duration_days, startsOn: row.starts_on, endsOn: row.ends_on,
        participantCount: counts.get(row.id) ?? 0,
        joined: Boolean(participation),
        completedAt: participation?.completed_at ?? null,
        checkinsCount: checkinsByChallenge.get(row.id) ?? 0,
      }
    })
    return NextResponse.json({ challenges: result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Desafios indisponíveis' }, { status: 503 })
  }
}

type Body = { action?: unknown; challengeId?: unknown; note?: unknown }

/** Entrar, sair ou fazer check-in num desafio. */
export async function POST(request: Request) {
  try {
    const ctx = await context()
    if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const body = await request.json().catch(() => null) as Body | null
    const challengeId = body?.challengeId
    if (typeof challengeId !== 'string' || !UUID.test(challengeId)) return NextResponse.json({ error: 'Desafio inválido' }, { status: 400 })

    if (body?.action === 'join') {
      const { error } = await ctx.supabase.from('challenge_participants').insert({ user_id: ctx.user.id, challenge_id: challengeId })
      if (notReady(error)) return NextResponse.json(NOT_READY, { status: 503 })
      if (error?.code === '23503') return NextResponse.json({ error: 'Desafio não encontrado' }, { status: 404 })
      if (error && error.code !== '23505') throw error // 23505: já participava, idempotente
      return NextResponse.json({ ok: true })
    }

    if (body?.action === 'leave') {
      const { error } = await ctx.supabase.from('challenge_participants').delete().eq('user_id', ctx.user.id).eq('challenge_id', challengeId)
      if (notReady(error)) return NextResponse.json(NOT_READY, { status: 503 })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (body?.action === 'checkin') {
      const { data: challenge, error: challengeError } = await ctx.supabase.from('challenges')
        .select('duration_days').eq('id', challengeId).maybeSingle()
      if (notReady(challengeError)) return NextResponse.json(NOT_READY, { status: 503 })
      if (challengeError) throw challengeError
      if (!challenge) return NextResponse.json({ error: 'Desafio não encontrado' }, { status: 404 })

      const { count, error: countError } = await ctx.supabase.from('challenge_checkins')
        .select('*', { count: 'exact', head: true }).eq('user_id', ctx.user.id).eq('challenge_id', challengeId)
      if (countError) throw countError
      const dayNumber = (count ?? 0) + 1
      if (dayNumber > challenge.duration_days) return NextResponse.json({ error: 'Você já concluiu este desafio.' }, { status: 400 })

      const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) || null : null
      const { error: checkinError } = await ctx.supabase.from('challenge_checkins')
        .insert({ user_id: ctx.user.id, challenge_id: challengeId, day_number: dayNumber, note })
      if (checkinError?.code === '23505') return NextResponse.json({ error: 'Você já fez check-in hoje.' }, { status: 409 })
      if (checkinError?.code === '23503') return NextResponse.json({ error: 'Entre no desafio antes de fazer check-in.' }, { status: 400 })
      if (checkinError) throw checkinError

      if (dayNumber === challenge.duration_days) {
        await ctx.supabase.from('challenge_participants').update({ completed_at: new Date().toISOString() })
          .eq('user_id', ctx.user.id).eq('challenge_id', challengeId)
      }
      return NextResponse.json({ ok: true, dayNumber })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível processar' }, { status: 500 })
  }
}
