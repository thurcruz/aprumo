import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { answerPri, type ProposedAction } from '@/lib/pri-engine'

async function auth() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return error || !user ? null : { supabase, user }
}

export async function GET(request: Request) {
  const ctx = await auth()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const conversationId = new URL(request.url).searchParams.get('conversationId')
  const conversations = await ctx.supabase.from('ai_conversations').select('id,title,created_at,updated_at').eq('user_id', ctx.user.id).order('updated_at', { ascending: false }).limit(30)
  if (conversations.error) return NextResponse.json({ error: conversations.error.message }, { status: 500 })
  const selected = conversationId ?? conversations.data?.[0]?.id
  const messages = selected ? await ctx.supabase.from('ai_messages').select('id,role,content,sources,proposed_action,action_status,created_at').eq('user_id', ctx.user.id).eq('conversation_id', selected).order('created_at').limit(100) : { data: [], error: null }
  if (messages.error) return NextResponse.json({ error: messages.error.message }, { status: 500 })
  return NextResponse.json({ conversations: conversations.data ?? [], conversationId: selected ?? null, messages: messages.data ?? [] })
}

async function executeAction(ctx: NonNullable<Awaited<ReturnType<typeof auth>>>, proposal: ProposedAction) {
  const args = proposal.arguments
  if (proposal.name === 'create_task') {
    const title = String(args.title ?? '').trim().slice(0, 160)
    if (!title) throw new Error('Título da tarefa inválido.')
    const category = ['fixed','today','carryover'].includes(String(args.category)) ? String(args.category) : 'today'
    const { error } = await ctx.supabase.from('commitments').insert({ user_id: ctx.user.id, title, kind: category === 'fixed' ? 'habit' : 'task', category, priority: 2, scheduled_date: args.scheduled_date ? String(args.scheduled_date) : null, start_time: args.start_time ? String(args.start_time) : null, duration_minutes: Math.max(5, Math.min(1440, Number(args.duration_minutes) || 30)) })
    if (error) throw error
    return `Tarefa “${title}” registrada na agenda.`
  }
  if (proposal.name === 'create_note') {
    const title = String(args.title ?? 'Anotação').trim().slice(0, 240)
    const content = String(args.content ?? '').trim().slice(0, 12000)
    if (!content) throw new Error('Conteúdo da anotação inválido.')
    const { error } = await ctx.supabase.from('knowledge_notes').insert({ user_id: ctx.user.id, title, content })
    if (error) throw error
    return `Anotação “${title}” registrada.`
  }
  if (proposal.name === 'create_transaction') {
    const description = String(args.description ?? '').trim().slice(0, 240)
    const amount = Number(args.amount)
    if (!description || !Number.isFinite(amount) || amount <= 0) throw new Error('Dados da transação inválidos.')
    const { error } = await ctx.supabase.from('transactions').insert({ user_id: ctx.user.id, description, amount, type: args.type === 'income' ? 'income' : 'expense', category: String(args.category ?? 'Outros').slice(0, 80), occurred_at: args.occurred_at ? String(args.occurred_at) : new Date().toISOString() })
    if (error) throw error
    return `Transação “${description}” registrada.`
  }
  const bookId = String(args.book_id ?? '')
  const currentPage = Math.max(0, Math.floor(Number(args.current_page)))
  if (!bookId || !Number.isFinite(currentPage)) throw new Error('Livro ou página inválidos.')
  const { data, error } = await ctx.supabase.from('books').update({ current_page: currentPage, status: 'reading', updated_at: new Date().toISOString() }).eq('id', bookId).eq('user_id', ctx.user.id).select('title').single()
  if (error) throw error
  return `Leitura de “${data.title}” atualizada para a página ${currentPage}.`
}

export async function POST(request: Request) {
  try {
    const ctx = await auth()
    if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const body = await request.json() as { message?: unknown; conversationId?: string; confirmMessageId?: string; confirm?: boolean }

    if (body.confirmMessageId) {
      const { data: pending, error } = await ctx.supabase.from('ai_messages').select('id,conversation_id,proposed_action,action_status').eq('id', body.confirmMessageId).eq('user_id', ctx.user.id).single()
      if (error || !pending || pending.action_status !== 'pending' || !pending.proposed_action) return NextResponse.json({ error: 'Ação pendente não encontrada.' }, { status: 404 })
      if (!body.confirm) {
        await ctx.supabase.from('ai_messages').update({ action_status: 'cancelled' }).eq('id', pending.id).eq('user_id', ctx.user.id)
        return NextResponse.json({ answer: 'Tudo bem — nenhuma alteração foi feita.', actionStatus: 'cancelled' })
      }
      try {
        const result = await executeAction(ctx, pending.proposed_action as unknown as ProposedAction)
        await ctx.supabase.from('ai_messages').update({ action_status: 'confirmed' }).eq('id', pending.id).eq('user_id', ctx.user.id)
        await ctx.supabase.from('ai_messages').insert({ user_id: ctx.user.id, conversation_id: pending.conversation_id, role: 'assistant', content: result })
        await ctx.supabase.from('ai_audit_log').insert({ user_id: ctx.user.id, channel: 'web', action: 'ai_write_confirmed', metadata: pending.proposed_action })
        return NextResponse.json({ answer: result, actionStatus: 'confirmed' })
      } catch (actionError) {
        await ctx.supabase.from('ai_messages').update({ action_status: 'failed' }).eq('id', pending.id).eq('user_id', ctx.user.id)
        throw actionError
      }
    }

    if (typeof body.message !== 'string') return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })

    // O miolo (assinatura, crédito, contexto, OpenAI, gravação) é compartilhado
    // com o canal do WhatsApp — ver lib/pri-engine.ts.
    const result = await answerPri({ supabase: ctx.supabase, userId: ctx.user.id, message: body.message, conversationId: body.conversationId, channel: 'web' })
    if (!result.ok) {
      const status = result.code === 'rate_limited' ? 429 : result.code ? 402 : 400
      return NextResponse.json({ error: result.error, code: result.code }, { status })
    }
    return NextResponse.json({ answer: result.answer, sources: result.sources, conversationId: result.conversationId, proposal: result.proposal, messageId: result.messageId })
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:'Pri indisponível'},{status:500})
  }
}
