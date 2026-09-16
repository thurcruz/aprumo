import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NOT_READY = { error: 'Os círculos ainda não foram ativados no servidor.', code: 'not_ready' }

async function context() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return error || !user ? null : { supabase, user }
}

function notReady(error: { code?: string } | null) {
  return error?.code === '42P01' || error?.code === 'PGRST205' || error?.code === 'PGRST202'
}

/** Círculos públicos + os privados de que o usuário já participa (RLS já filtra isso). */
export async function GET() {
  try {
    const ctx = await context()
    if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: circles, error } = await ctx.supabase.from('circles')
      .select('id,owner_id,name,tag,description,visibility').order('created_at', { ascending: false })
    if (notReady(error)) return NextResponse.json(NOT_READY, { status: 503 })
    if (error) throw error

    const ids = (circles ?? []).map(row => row.id)
    const counts = new Map<string, number>()
    const mineIds = new Set<string>()
    if (ids.length) {
      const { data: members, error: membersError } = await ctx.supabase.from('circle_members').select('circle_id,user_id').in('circle_id', ids)
      if (membersError) throw membersError
      for (const row of members ?? []) {
        counts.set(row.circle_id, (counts.get(row.circle_id) ?? 0) + 1)
        if (row.user_id === ctx.user.id) mineIds.add(row.circle_id)
      }
    }

    const result = (circles ?? []).map(row => ({
      id: row.id, name: row.name, tag: row.tag, description: row.description, visibility: row.visibility,
      isOwner: row.owner_id === ctx.user.id,
      joined: mineIds.has(row.id) || row.owner_id === ctx.user.id,
      memberCount: counts.get(row.id) ?? 0,
    }))
    return NextResponse.json({ circles: result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Círculos indisponíveis' }, { status: 503 })
  }
}

type Body = { action?: unknown; circleId?: unknown; name?: unknown; tag?: unknown; description?: unknown }

/** Criar um círculo, ou entrar/sair de um existente. */
export async function POST(request: Request) {
  try {
    const ctx = await context()
    if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const body = await request.json().catch(() => null) as Body | null

    if (body?.action === 'create') {
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''
      if (!name) return NextResponse.json({ error: 'Dê um nome ao círculo' }, { status: 400 })
      const tag = typeof body.tag === 'string' ? body.tag.trim().slice(0, 40) : ''
      const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : ''
      const { data, error } = await ctx.supabase.from('circles')
        .insert({ owner_id: ctx.user.id, name, tag, description }).select('id').single()
      if (notReady(error)) return NextResponse.json(NOT_READY, { status: 503 })
      if (error) throw error
      return NextResponse.json({ ok: true, id: data.id })
    }

    const circleId = body?.circleId
    if (typeof circleId !== 'string' || !UUID.test(circleId)) return NextResponse.json({ error: 'Círculo inválido' }, { status: 400 })

    if (body?.action === 'join') {
      const { error } = await ctx.supabase.from('circle_members').insert({ circle_id: circleId, user_id: ctx.user.id, role: 'member' })
      if (notReady(error)) return NextResponse.json(NOT_READY, { status: 503 })
      if (error?.code === '42501') return NextResponse.json({ error: 'Este círculo é privado.' }, { status: 403 })
      if (error?.code === '23503') return NextResponse.json({ error: 'Círculo não encontrado' }, { status: 404 })
      if (error && error.code !== '23505') throw error // 23505: já era membro, idempotente
      return NextResponse.json({ ok: true })
    }

    if (body?.action === 'leave') {
      const { error } = await ctx.supabase.from('circle_members').delete().eq('circle_id', circleId).eq('user_id', ctx.user.id)
      if (notReady(error)) return NextResponse.json(NOT_READY, { status: 503 })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível processar' }, { status: 500 })
  }
}
