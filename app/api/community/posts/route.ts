import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toPost } from '@/lib/posts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const COLUMNS = 'id,user_id,author_name,author_avatar_url,body,created_at'
const NOT_READY = { error: 'O mural da comunidade ainda não foi ativado no servidor.', code: 'not_ready' }

async function context() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return error || !user ? null : { supabase, user }
}

/** Tabela ou função do mural ainda não existem: a migração não foi aplicada. */
function notReady(error: { code?: string } | null) {
  return error?.code === '42P01' || error?.code === 'PGRST205' || error?.code === 'PGRST202' || error?.code === '42883'
}

/** As 30 publicações mais recentes. Ler o mural é para qualquer pessoa logada (RLS). */
export async function GET() {
  try {
    const ctx = await context()
    if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const { data, error } = await ctx.supabase.from('community_posts').select(COLUMNS)
      .order('created_at', { ascending: false }).limit(30)
    if (notReady(error)) return NextResponse.json(NOT_READY, { status: 503 })
    if (error) throw error
    return NextResponse.json({ posts: (data ?? []).map(row => toPost(row, ctx.user.id)) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mural indisponível' }, { status: 503 })
  }
}

/**
 * Publica uma sessão de foco. Quem monta a publicação é o banco
 * (publish_focus_session), a partir da sessão gravada: daqui só saem o id e a
 * escolha de mostrar o nome. Assim ninguém publica uma sessão inventada.
 */
export async function POST(request: Request) {
  try {
    const ctx = await context()
    if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const body = await request.json().catch(() => null) as { sessionId?: unknown; showName?: unknown } | null
    if (typeof body?.sessionId !== 'string' || !UUID.test(body.sessionId)) return NextResponse.json({ error: 'Sessão inválida' }, { status: 400 })
    const { data, error } = await ctx.supabase.rpc('publish_focus_session', { target_session: body.sessionId, show_name: body.showName === true })
    if (notReady(error)) return NextResponse.json(NOT_READY, { status: 503 })
    if (error?.code === 'P0002') return NextResponse.json({ error: 'A sessão ainda não chegou ao servidor. Espere alguns segundos e tente de novo.' }, { status: 404 })
    if (error?.code === '22023') return NextResponse.json({ error: 'Só sessões de pelo menos 5 minutos vão para o mural.' }, { status: 400 })
    if (error || !data) throw error ?? new Error('Publicação sem retorno')
    return NextResponse.json({ post: toPost(data, ctx.user.id) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível publicar' }, { status: 500 })
  }
}

/** Apaga uma publicação. O RLS só deixa apagar a própria: a de outra pessoa simplesmente não é encontrada. */
export async function DELETE(request: Request) {
  try {
    const ctx = await context()
    if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const id = new URL(request.url).searchParams.get('id')
    if (!id || !UUID.test(id)) return NextResponse.json({ error: 'Publicação inválida' }, { status: 400 })
    const { data, error } = await ctx.supabase.from('community_posts').delete().eq('id', id).select('id')
    if (notReady(error)) return NextResponse.json(NOT_READY, { status: 503 })
    if (error) throw error
    if (!data?.length) return NextResponse.json({ error: 'Publicação não encontrada' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível apagar' }, { status: 500 })
  }
}
