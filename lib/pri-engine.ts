import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from './database.types'
import { CREDITS_PER_MESSAGE, resolvePlan, type SubscriptionStatus } from './billing'

type ToolName = 'create_task' | 'create_note' | 'create_transaction' | 'update_book_progress'
export type ProposedAction = { name: ToolName; arguments: Record<string, unknown> }
type OpenAIResponse = { output?: Array<{ type?: string; name?: ToolName; arguments?: string; content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } }

/** De onde a mensagem chegou — molda o que fica registrado em ai_audit_log, nada além disso. */
export type PriChannel = 'web' | 'whatsapp'

export type PriResult =
  | { ok: true; answer: string; conversationId: string; sources: string[]; proposal?: ProposedAction; messageId?: string }
  | { ok: false; error: string; code?: 'plan_required' | 'insufficient_credits' | 'rate_limited' }

const TOOLS = [
  { type: 'function', name: 'create_task', description: 'Propõe criar uma tarefa, hábito ou compromisso na agenda do usuário.', strict: true, parameters: { type: 'object', properties: { title: { type: 'string' }, category: { type: 'string', enum: ['fixed', 'today', 'carryover'] }, scheduled_date: { type: ['string', 'null'] }, start_time: { type: ['string', 'null'] }, duration_minutes: { type: 'number' } }, required: ['title', 'category', 'scheduled_date', 'start_time', 'duration_minutes'], additionalProperties: false } },
  { type: 'function', name: 'create_note', description: 'Propõe registrar uma anotação de conhecimento.', strict: true, parameters: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'], additionalProperties: false } },
  { type: 'function', name: 'create_transaction', description: 'Propõe registrar uma entrada ou saída financeira.', strict: true, parameters: { type: 'object', properties: { description: { type: 'string' }, amount: { type: 'number' }, type: { type: 'string', enum: ['income', 'expense'] }, category: { type: 'string' }, occurred_at: { type: ['string', 'null'] } }, required: ['description', 'amount', 'type', 'category', 'occurred_at'], additionalProperties: false } },
  { type: 'function', name: 'update_book_progress', description: 'Propõe atualizar a página atual de um livro existente.', strict: true, parameters: { type: 'object', properties: { book_id: { type: 'string' }, current_page: { type: 'number' } }, required: ['book_id', 'current_page'], additionalProperties: false } },
] as const

const ACTION_LABELS: Record<ToolName, string> = { create_task: 'registrar esta tarefa na agenda', create_note: 'salvar esta anotação', create_transaction: 'registrar esta transação', update_book_progress: 'atualizar o progresso de leitura' }

/**
 * O miolo da Pri: confere assinatura e crédito, monta o contexto autorizado,
 * chama a OpenAI e grava a conversa. Compartilhado pela web (sessão do
 * usuário, RLS de verdade) e pelo webhook do WhatsApp (chave de serviço, sem
 * sessão) — por isso `userId` é sempre explícito, nunca inferido de dentro
 * daqui, e toda consulta filtra por ele mesmo quando RLS já filtraria sozinha.
 *
 * O que fica de fora, só na web: confirmar/cancelar uma ação proposta (ver
 * `confirmMessageId` em app/api/pri/route.ts). No WhatsApp v1 a pessoa só
 * conversa; para confirmar algo que a Pri propôs, ela abre o Aprumo — é a
 * mesma conversa, guardada por `user_id`, não uma separada por canal.
 */
export async function answerPri(params: {
  supabase: SupabaseClient<Database>
  userId: string
  message: string
  conversationId?: string | null
  channel: PriChannel
}): Promise<PriResult> {
  const { supabase, userId, channel } = params
  const message = params.message.trim()
  if (message.length < 2 || message.length > 2000) return { ok: false, error: 'Mensagem inválida' }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, error: 'Configure OPENAI_API_KEY no servidor.' }

  // A Pri é 100% Aprumo+: sem assinatura ativa, nem a primeira mensagem sai.
  const { data: subscription } = await supabase.from('subscriptions').select('status')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (resolvePlan(subscription?.status as SubscriptionStatus | undefined) !== 'plus') {
    return { ok: false, error: 'A Pri é exclusiva do Aprumo+. Assine para conversar.', code: 'plan_required' }
  }

  const { data: recent } = await supabase.from('ai_audit_log').select('id').eq('user_id', userId).gte('created_at', new Date(Date.now() - 3600000).toISOString())
  if ((recent?.length ?? 0) >= 20) return { ok: false, error: 'Limite temporário atingido. Tente novamente em alguns minutos.', code: 'rate_limited' }

  // Gasta o crédito antes de chamar a OpenAI: depois do limite de taxa (não
  // descontar de quem só esbarrou nele) e antes da IA (mais simples e mais
  // seguro contra corrida entre pedidos simultâneos do que cobrar só no
  // sucesso). Web usa auth.uid() (sessão); WhatsApp informa o usuário à parte.
  const { error: spendError } = channel === 'whatsapp'
    ? await supabase.rpc('spend_credits_for', { p_user_id: userId, p_amount: CREDITS_PER_MESSAGE, p_description: 'Mensagem para a Pri (WhatsApp)' })
    : await supabase.rpc('spend_credits', { p_amount: CREDITS_PER_MESSAGE, p_description: 'Mensagem para a Pri' })
  if (spendError) {
    if (spendError.message.includes('INSUFFICIENT_CREDITS')) return { ok: false, error: 'Seus créditos deste ciclo acabaram.', code: 'insufficient_credits' }
    throw spendError
  }

  let conversationId = params.conversationId ?? undefined
  if (!conversationId) {
    const { data, error } = await supabase.from('ai_conversations').insert({ user_id: userId, title: message.slice(0, 70) }).select('id').single()
    if (error) throw error
    conversationId = data.id
  }
  await supabase.from('ai_messages').insert({ user_id: userId, conversation_id: conversationId, role: 'user', content: message })

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const [profileR, commitmentsR, eventsR, goalsR, booksR, notesR, transactionsR, historyR] = await Promise.all([
    supabase.from('profiles').select('display_name,purpose,ai_permissions').eq('id', userId).single(),
    supabase.from('commitments').select('id,title,category,priority,scheduled_date,start_time,duration_minutes').eq('user_id', userId).eq('active', true).limit(40),
    supabase.from('commitment_events').select('commitment_id,status,completed_at').eq('user_id', userId).eq('scheduled_for', today),
    supabase.from('goals').select('id,title,progress,deadline,status').eq('user_id', userId).neq('status', 'archived').limit(20),
    supabase.from('books').select('id,title,author,status,current_page,total_pages').eq('user_id', userId).limit(30),
    supabase.from('knowledge_notes').select('id,title,content,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(15),
    supabase.from('transactions').select('description,amount,type,category,occurred_at').eq('user_id', userId).order('occurred_at', { ascending: false }).limit(20),
    supabase.from('ai_messages').select('role,content').eq('user_id', userId).eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(12),
  ])
  const firstError = [profileR, commitmentsR, eventsR, goalsR, booksR, notesR, transactionsR, historyR].find(result => result.error)?.error
  if (firstError) throw firstError
  const permissions = (profileR.data?.ai_permissions ?? {}) as Record<string, boolean>
  const eventMap = new Map((eventsR.data ?? []).map(event => [event.commitment_id, event]))
  const context: Record<string, unknown> = { today, timezone: 'America/Sao_Paulo', name: profileR.data?.display_name, purpose: profileR.data?.purpose }
  const sources: string[] = []
  if (permissions.tasks !== false) { context.commitments = (commitmentsR.data ?? []).map(item => ({ ...item, status_today: eventMap.get(item.id)?.status ?? 'pending' })); sources.push('commitments') }
  if (permissions.goals !== false) { context.goals = goalsR.data; sources.push('goals') }
  if (permissions.books !== false) { context.books = booksR.data; context.notes = notesR.data; sources.push('books', 'notes') }
  if (permissions.finance === true) { context.transactions = transactionsR.data; sources.push('finance') }

  const input = [...(historyR.data ?? []).reverse().map(item => ({ role: item.role, content: item.content })), { role: 'user', content: `CONTEXTO ATUAL:\n${JSON.stringify(context)}\n\nPEDIDO:\n${message}` }]

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? 'gpt-5.6-luna', reasoning: { effort: 'low' }, max_output_tokens: 700, store: false, tools: TOOLS, instructions: 'Você é a Pri, copiloto de evolução pessoal. Responda em português do Brasil. Use apenas o contexto autorizado. Para registrar ou alterar dados, use exatamente uma ferramenta; nunca afirme que gravou algo. A aplicação solicitará confirmação antes de executar. Em perguntas sobre o que falta hoje, exclua status_today completed. Datas e horários devem usar o fuso informado. Não diagnostique nem dê aconselhamento financeiro profissional.', input }),
  })
  const payload = await response.json() as OpenAIResponse
  if (!response.ok) throw new Error(payload.error?.message ?? 'Falha ao consultar a IA')

  const call = payload.output?.find(item => item.type === 'function_call' && item.name)
  if (call?.name && call.arguments) {
    const proposal: ProposedAction = { name: call.name, arguments: JSON.parse(call.arguments) as Record<string, unknown> }
    const content = `Posso ${ACTION_LABELS[proposal.name]}. Confirme para eu alterar seus dados.`
    const { data: savedMessage, error } = await supabase.from('ai_messages').insert({ user_id: userId, conversation_id: conversationId, role: 'assistant', content, sources: sources as Json, proposed_action: proposal as unknown as Json, action_status: 'pending' }).select('id').single()
    if (error) throw error
    return { ok: true, answer: content, conversationId, sources, proposal, messageId: savedMessage.id }
  }

  const answer = payload.output?.flatMap(item => item.content ?? []).filter(item => item.type === 'output_text').map(item => item.text ?? '').join('\n').trim()
  if (!answer) throw new Error('A IA não retornou uma resposta.')
  await supabase.from('ai_messages').insert({ user_id: userId, conversation_id: conversationId, role: 'assistant', content: answer, sources: sources as Json })
  await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId).eq('user_id', userId)
  await supabase.from('ai_audit_log').insert({ user_id: userId, channel, action: 'chat_response', metadata: { model: process.env.OPENAI_MODEL ?? 'gpt-5.6-luna', sources } })
  return { ok: true, answer, conversationId, sources }
}
