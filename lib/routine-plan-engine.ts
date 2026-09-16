import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { chargePri, PRI_MODEL, type PriGateCode } from './pri-engine'
import { planWindow, sanitizePlanHabits, type PlanAnswers, type PlanHabit, type RoutinePlanTemplate } from './routine-plans'

export type AdaptResult =
  | { ok: true; habits: PlanHabit[]; summary: string }
  | { ok: false; error: string; code?: PriGateCode }

type OpenAIResponse = { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } }

// O banco guarda os blocos em inglês; o plano fala português.
const blockFromDb: Record<string, string> = { morning: 'manha', afternoon: 'tarde', evening: 'noite', anytime: 'livre' }

/** Saída estruturada no mesmo formato de PlanHabit, para passar direto por sanitizePlanHabits. */
const PLAN_FORMAT = {
  type: 'json_schema',
  name: 'routine_plan',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      habits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            days: { type: 'array', items: { type: 'integer' } },
            dayBlock: { type: 'string', enum: ['manha', 'tarde', 'noite', 'livre'] },
            startTime: { type: ['string', 'null'] },
            durationMinutes: { type: 'integer' },
            startsOn: { type: 'string' },
            endsOn: { type: 'string' },
          },
          required: ['title', 'days', 'dayBlock', 'startTime', 'durationMinutes', 'startsOn', 'endsOn'],
          additionalProperties: false,
        },
      },
    },
    required: ['summary', 'habits'],
    additionalProperties: false,
  },
} as const

const INSTRUCTIONS = [
  'Você é a Pri, copiloto de evolução pessoal do Aprumo. Recebe um plano base e a rotina atual da pessoa e devolve o plano adaptado a essa rotina. Escreva em português do Brasil.',
  'Mantenha o objetivo e a progressão do plano base: não pule fases nem aumente a carga mais depressa do que ele. Preserve o descanso entre sessões que o plano base prevê.',
  'Use só os dias disponíveis informados. Encaixe cada sessão sem choque com os compromissos com horário da rotina, considerando os dias da semana e a vigência de cada um; se o horário preferido conflitar, mova para o horário livre mais próximo no mesmo período do dia.',
  'Leve em conta a observação da pessoa quando houver, sem comprometer a segurança. Não faça diagnóstico nem prescrição médica.',
  'Datas em YYYY-MM-DD dentro da janela do plano; horários em HH:MM (24 h) ou null; dias da semana de 0 (domingo) a 6 (sábado). Títulos curtos, no estilo do plano base.',
  'No summary, em até 3 frases, diga o que você ajustou e por quê, citando a rotina. Se nada precisou mudar, diga isso.',
].join('\n')

/**
 * A Pri adapta um plano pronto à rotina de quem pede. Só propõe: quem grava os
 * hábitos é o cliente, depois que a pessoa confere a prévia — o mesmo
 * princípio das ações da conversa, que pedem confirmação antes de mexer em dados.
 */
export async function adaptRoutinePlan(params: {
  supabase: SupabaseClient<Database>
  userId: string
  template: RoutinePlanTemplate
  answers: PlanAnswers
}): Promise<AdaptResult> {
  const { supabase, userId, template, answers } = params
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, error: 'Configure OPENAI_API_KEY no servidor.' }

  const gate = await chargePri({ supabase, userId, channel: 'web', description: `Plano adaptado pela Pri: ${template.title}` })
  if (!gate.ok) return gate

  const window = planWindow(template, answers)
  const [profileR, commitmentsR] = await Promise.all([
    supabase.from('profiles').select('timezone,ai_permissions').eq('id', userId).single(),
    supabase.from('commitments').select('title,category,scheduled_date,start_time,duration_minutes,day_block,frequency').eq('user_id', userId).eq('active', true).limit(80),
  ])
  if (profileR.error) throw profileR.error
  if (commitmentsR.error) throw commitmentsR.error

  // Mesma permissão que a conversa respeita: sem acesso às tarefas, a Pri adapta só pelas respostas.
  const permissions = (profileR.data?.ai_permissions ?? {}) as Record<string, boolean>
  type RoutineItem = { titulo: string; horario: string | null; minutos: number | null; periodo: string; recorrente: boolean; dias?: unknown; data?: string }
  const routine = permissions.tasks === false ? [] : (commitmentsR.data ?? []).flatMap((row): RoutineItem[] => {
    const base = { titulo: row.title, horario: row.start_time?.slice(0, 5) ?? null, minutos: row.duration_minutes, periodo: blockFromDb[row.day_block] ?? 'livre' }
    if (row.category === 'fixed') {
      const frequency = (row.frequency ?? {}) as { days?: unknown; startsOn?: unknown; endsOn?: unknown }
      // Só o que se sobrepõe à janela do plano interessa.
      if (typeof frequency.endsOn === 'string' && frequency.endsOn < window.startsOn) return []
      if (typeof frequency.startsOn === 'string' && frequency.startsOn > window.endsOn) return []
      return [{ ...base, recorrente: true, dias: Array.isArray(frequency.days) && frequency.days.length > 0 ? frequency.days : 'todos' }]
    }
    if (!row.scheduled_date || row.scheduled_date < window.startsOn || row.scheduled_date > window.endsOn) return []
    return [{ ...base, recorrente: false, data: row.scheduled_date }]
  })

  const input = [
    `PLANO: ${template.title} — ${template.description}`,
    `JANELA: de ${window.startsOn} a ${window.endsOn}`,
    `RESPOSTAS: ${JSON.stringify({ nivel: answers.level, dias_disponiveis: answers.days, periodo: answers.dayBlock, horario_preferido: answers.startTime ?? null, minutos_por_sessao: template.minutesOptions.length > 0 ? answers.minutes : 'definido pelo plano' })}`,
    `OBSERVAÇÃO DA PESSOA: ${answers.note ?? 'nenhuma'}`,
    `PLANO BASE: ${JSON.stringify(template.build(answers))}`,
    `ROTINA ATUAL (fuso ${profileR.data?.timezone ?? 'America/Sao_Paulo'}): ${routine.length > 0 ? JSON.stringify(routine) : 'nenhum compromisso informado'}`,
  ].join('\n\n')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: PRI_MODEL, reasoning: { effort: 'low' }, max_output_tokens: 4000, store: false, instructions: INSTRUCTIONS, input, text: { format: PLAN_FORMAT } }),
  })
  const payload = await response.json() as OpenAIResponse
  if (!response.ok) throw new Error(payload.error?.message ?? 'Falha ao consultar a IA')

  const text = payload.output?.flatMap(item => item.content ?? []).filter(item => item.type === 'output_text').map(item => item.text ?? '').join('').trim()
  let parsed: { summary?: unknown; habits?: unknown } | null = null
  try { parsed = text ? JSON.parse(text) as { summary?: unknown; habits?: unknown } : null } catch { parsed = null }

  const habits = sanitizePlanHabits(parsed?.habits, window)
  if (habits.length === 0) return { ok: false, error: 'A Pri não conseguiu montar o plano agora. Tente de novo ou use o plano padrão.' }
  const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim().slice(0, 600) : ''

  await supabase.from('ai_audit_log').insert({ user_id: userId, channel: 'web', action: 'routine_plan_adapted', metadata: { model: PRI_MODEL, slug: template.slug, habits: habits.length } })
  return { ok: true, habits, summary }
}
