import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { DIAGNOSIS_AREAS, focusLabels, DIAGNOSIS_WEEKS, diagnosisWindow, MAX_DIAGNOSIS_ACTIONS, sanitizeDiagnosisHabits, type DiagnosisAnswers, type DiagnosisPlan } from './diagnosis'
import { chargePri, PRI_MODEL, type PriGateCode } from './pri-engine'
import { PLAN_FORMAT, requestStructured } from './routine-plan-engine'
import { dayBlocks } from './types'

export type DiagnosisResult = { ok: true; plan: DiagnosisPlan } | { ok: false; error: string; code?: PriGateCode }

const DIAGNOSIS_FORMAT = {
  ...PLAN_FORMAT,
  name: 'initial_plan',
  schema: {
    ...PLAN_FORMAT.schema,
    properties: { goalTitle: { type: 'string' }, ...PLAN_FORMAT.schema.properties },
    required: ['goalTitle', ...PLAN_FORMAT.schema.required],
  },
} as const

const INSTRUCTIONS = [
  'Você é a Pri, copiloto de evolução pessoal do Aprumo. A partir de um diagnóstico curto, monte o plano inicial da pessoa. Escreva em português do Brasil.',
  `goalTitle: reescreva o destino como uma meta clara para 90 dias, em até 80 caracteres, na voz da pessoa.`,
  `habits: de 2 a ${MAX_DIAGNOSIS_ACTIONS} ações pequenas e testáveis — cada uma dá para marcar como feita ou não num dia. Comece pequeno: é melhor cumprir do que impressionar.`,
  'A soma das durações das ações de um mesmo dia não passa do tempo diário informado. Use o período do dia informado. Pelo menos uma ação ataca diretamente o obstáculo citado.',
  'Todas as ações valem para a janela inteira informada (startsOn e endsOn nas datas da janela). Dias da semana de 0 (domingo) a 6 (sábado). startTime null. Títulos curtos e concretos, começando por um verbo.',
  'summary: em até 3 frases, explique por que essas ações e diga que ao fim da janela vale revisar o que funcionou. Sem diagnóstico ou prescrição médica.',
].join('\n')

/** A Pri transforma o diagnóstico em plano. Só propõe: quem grava é o cliente, depois que a pessoa confere. */
export async function generateInitialPlan(params: { supabase: SupabaseClient<Database>; userId: string; answers: DiagnosisAnswers; today: string }): Promise<DiagnosisResult> {
  const { supabase, userId, answers, today } = params
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, error: 'Configure OPENAI_API_KEY no servidor.' }

  const gate = await chargePri({ supabase, userId, channel: 'web', description: 'Diagnóstico e plano inicial' })
  if (!gate.ok) return gate

  const window = diagnosisWindow(today)
  const input = [
    `DESTINO (90 dias): ${answers.destination}`,
    `ÁREA: ${DIAGNOSIS_AREAS.find(item => item.id === answers.area)?.label}`,
    ...(answers.focuses?.length ? [`O QUE QUER DOMINAR: ${focusLabels(answers.focuses).join(', ')} (distribua as ações entre esses focos, sem passar do tempo diário)`] : []),
    `O QUE MAIS ATRAPALHA: ${answers.obstacle || 'não informado'}`,
    `TEMPO POR DIA: ${answers.minutesPerDay} minutos`,
    `PERÍODO DO DIA: ${answers.dayBlock} (${dayBlocks.find(block => block.id === answers.dayBlock)?.label})`,
    `JANELA DO PRIMEIRO CICLO: de ${window.startsOn} a ${window.endsOn} (${DIAGNOSIS_WEEKS} semanas)`,
  ].join('\n')

  const parsed = await requestStructured<{ goalTitle: unknown; summary: unknown; habits: unknown }>({ apiKey, instructions: INSTRUCTIONS, input, format: DIAGNOSIS_FORMAT })
  const habits = sanitizeDiagnosisHabits(parsed?.habits, answers, window)
  const goalTitle = typeof parsed?.goalTitle === 'string' ? parsed.goalTitle.trim().slice(0, 120) : ''
  if (habits.length === 0 || goalTitle.length < 4) return { ok: false, error: 'A Pri não conseguiu montar o plano agora.' }
  const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim().slice(0, 600) : ''

  await supabase.from('ai_audit_log').insert({ user_id: userId, channel: 'web', action: 'initial_plan_generated', metadata: { model: PRI_MODEL, area: answers.area, habits: habits.length } })
  return { ok: true, plan: { goalTitle, summary, habits } }
}
