import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const permissionKeys = ['tasks', 'goals', 'books', 'moods', 'finance', 'antivicio'] as const
/** Avisos que a pessoa escolhe receber. Os envios chegam com os lembretes pelo WhatsApp. */
const notificationKeys = ['reminders', 'weekly', 'email'] as const
/** Nome de arquivo que o próprio app gera: sem pastas, sem `..`. */
const AVATAR_FILE = /^[\w-]+\.(?:jpg|jpeg|png|webp)$/

/** Fuso IANA de verdade ("America/Sao_Paulo"): quem valida é o próprio Intl. */
function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 64) return false
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return true } catch { return false }
}

async function authenticatedContext() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return { supabase, user }
}

export async function GET() {
  try {
    const context = await authenticatedContext()
    if (!context) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    // `*` em vez de uma lista de colunas: enquanto uma migração não rodar, a
    // coluna nova simplesmente não vem — pedir pelo nome derrubaria o
    // carregamento do perfil inteiro, e com ele o nome em todas as telas.
    const { data, error } = await context.supabase.from('profiles').select('*').eq('id', context.user.id).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      profile: {
        display_name: data.display_name,
        purpose: data.purpose,
        ai_permissions: data.ai_permissions,
        created_at: data.created_at,
        avatar_url: data.avatar_url ?? null,
        timezone: data.timezone ?? null,
        notification_prefs: data.notification_prefs ?? null,
      },
      email: context.user.email ?? null,
    })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Perfil indisponível' }, { status: 503 }) }
}

export async function PUT(request: Request) {
  try {
    const context = await authenticatedContext()
    if (!context) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const body = await request.json() as { displayName?: unknown; purpose?: unknown; aiPermissions?: unknown; avatarUrl?: unknown; timezone?: unknown; notificationPrefs?: unknown }
    const update: {
      display_name?: string
      purpose?: string
      ai_permissions?: Record<string, boolean>
      avatar_url?: string | null
      timezone?: string
      notification_prefs?: Record<string, boolean>
      updated_at: string
    } = { updated_at: new Date().toISOString() }
    if (body.displayName !== undefined) {
      if (typeof body.displayName !== 'string' || body.displayName.trim().length < 2 || body.displayName.trim().length > 60) return NextResponse.json({ error: 'O nome precisa ter entre 2 e 60 letras.' }, { status: 400 })
      update.display_name = body.displayName.trim()
    }
    if (body.purpose !== undefined) {
      if (typeof body.purpose !== 'string' || body.purpose.length > 180) return NextResponse.json({ error: 'O propósito pode ter no máximo 180 caracteres.' }, { status: 400 })
      update.purpose = body.purpose.trim()
    }
    if (body.aiPermissions !== undefined) {
      if (!body.aiPermissions || typeof body.aiPermissions !== 'object' || Array.isArray(body.aiPermissions)) return NextResponse.json({ error: 'Permissões inválidas' }, { status: 400 })
      const source = body.aiPermissions as Record<string, unknown>
      update.ai_permissions = Object.fromEntries(permissionKeys.map(key => [key, source[key] === true]))
    }
    if (body.avatarUrl !== undefined) {
      // Só vale a foto que o próprio usuário subiu para a pasta dele no bucket:
      // a comunidade vai exibir essa URL, e ela não pode apontar para qualquer lugar.
      const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${context.user.id}/`
      if (body.avatarUrl === null) update.avatar_url = null
      else if (typeof body.avatarUrl === 'string' && body.avatarUrl.startsWith(base) && AVATAR_FILE.test(body.avatarUrl.slice(base.length))) update.avatar_url = body.avatarUrl
      else return NextResponse.json({ error: 'Foto inválida' }, { status: 400 })
    }
    if (body.timezone !== undefined) {
      if (!isTimeZone(body.timezone)) return NextResponse.json({ error: 'Fuso horário inválido' }, { status: 400 })
      update.timezone = body.timezone
    }
    if (body.notificationPrefs !== undefined) {
      if (!body.notificationPrefs || typeof body.notificationPrefs !== 'object' || Array.isArray(body.notificationPrefs)) return NextResponse.json({ error: 'Preferências de aviso inválidas' }, { status: 400 })
      const source = body.notificationPrefs as Record<string, unknown>
      update.notification_prefs = Object.fromEntries(notificationKeys.map(key => [key, source[key] === true]))
    }
    const { data, error } = await context.supabase.from('profiles').update(update).eq('id', context.user.id).select('display_name, purpose, ai_permissions, updated_at').single()
    // Coluna que o banco ainda não tem (migração de preferências pendente).
    if (error?.code === 'PGRST204' || error?.code === '42703') return NextResponse.json({ error: 'O servidor ainda não tem os campos de fuso horário e avisos. Nada foi salvo.', code: 'not_ready' }, { status: 503 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ profile: data })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível atualizar o perfil' }, { status: 503 }) }
}
