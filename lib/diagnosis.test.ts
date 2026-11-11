import { describe, expect, it } from 'vitest'
import { basicDiagnosisPlan, currentDiagnosisPlan, diagnosisGoal, diagnosisWindow, MAX_DIAGNOSIS_ACTIONS, parseDiagnosisAnswers, sanitizeDiagnosisHabits } from './diagnosis'
import { planHabitToTask } from './routine-plans'

const valid = { name: 'Ana', destination: 'Lançar meu produto', area: 'carreira', obstacle: 'Procrastino à noite', minutesPerDay: 30, dayBlock: 'manha' }

describe('diagnóstico', () => {
  it('aceita respostas completas e normaliza espaços', () => {
    expect(parseDiagnosisAnswers({ ...valid, destination: '  Lançar   meu produto ' })).toEqual({ ...valid, destination: 'Lançar meu produto' })
  })

  it('recusa quando falta nome, destino ou área', () => {
    expect(parseDiagnosisAnswers({ ...valid, name: 'A' })).toBeNull()
    expect(parseDiagnosisAnswers({ ...valid, destination: '' })).toBeNull()
    expect(parseDiagnosisAnswers({ ...valid, area: 'admin' })).toBeNull()
    expect(parseDiagnosisAnswers(null)).toBeNull()
  })

  it('tempo e período fora das opções caem no padrão', () => {
    const parsed = parseDiagnosisAnswers({ ...valid, minutesPerDay: 999, dayBlock: 'madrugada' })
    expect(parsed?.minutesPerDay).toBe(30)
    expect(parsed?.dayBlock).toBe('livre')
  })

  it('o primeiro ciclo tem 4 semanas a partir de hoje', () => {
    expect(diagnosisWindow('2026-09-16')).toEqual({ startsOn: '2026-09-16', endsOn: '2026-10-13' })
  })

  it('poucas ações, nenhuma maior que o tempo do dia', () => {
    const window = diagnosisWindow('2026-09-16')
    const raw = Array.from({ length: 6 }, (_, index) => ({ title: `Ação ${index}`, days: [1, 3], dayBlock: 'manha', durationMinutes: 90, startsOn: window.startsOn, endsOn: window.endsOn }))
    const habits = sanitizeDiagnosisHabits(raw, { minutesPerDay: 15 }, window)
    expect(habits).toHaveLength(MAX_DIAGNOSIS_ACTIONS)
    expect(habits.every(habit => habit.durationMinutes === 15)).toBe(true)
  })

  it('sem a IA, ainda sai um plano: a meta e um passo diário', () => {
    const answers = parseDiagnosisAnswers(valid)!
    const plan = basicDiagnosisPlan(answers, '2026-09-16')
    expect(plan.goalTitle).toBe('Lançar meu produto')
    expect(plan.habits).toHaveLength(1)
    expect(plan.habits[0]).toMatchObject({ dayBlock: 'manha', durationMinutes: 30, startsOn: '2026-09-16', endsOn: '2026-10-13' })
  })

  it('acha o plano do diagnóstico mais recente, ignorando planos prontos', () => {
    const answers = parseDiagnosisAnswers(valid)!
    const toTasks = (today: string, planId: string, slug: string) => basicDiagnosisPlan(answers, today).habits
      .map(habit => planHabitToTask(habit, { id: planId, slug }, { id: `${planId}-t`, source: 'manual' }))
    const tasks = [
      ...toTasks('2026-08-01', '11111111-1111-4111-8111-111111111111', 'diagnostico'),
      ...toTasks('2026-09-10', '22222222-2222-4222-8222-222222222222', 'diagnostico'),
      ...toTasks('2026-09-12', '33333333-3333-4333-8333-333333333333', 'leitura'),
    ]
    const plan = currentDiagnosisPlan(tasks, [{ taskId: '22222222-2222-4222-8222-222222222222-t', date: '2026-09-15', status: 'completed' }], '2026-09-16')
    expect(plan?.id).toBe('22222222-2222-4222-8222-222222222222')
    expect(plan).toMatchObject({ status: 'running', week: 1, due: 7, done: 1 })
    expect(plan?.today).toHaveLength(1)
    expect(currentDiagnosisPlan([], [], '2026-09-16')).toBeUndefined()
  })

  it('a meta nasce ativa, na área escolhida, com prazo de 90 dias', () => {
    const goal = diagnosisGoal({ goalTitle: 'Lançar', summary: 'Resumo' }, { area: 'saude' }, { id: 'g1', today: '2026-09-16' })
    expect(goal).toMatchObject({ id: 'g1', category: 'saude', status: 'active', deadline: '2026-12-15', description: 'Resumo' })
  })
})
