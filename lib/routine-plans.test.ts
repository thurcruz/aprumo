import { describe, expect, it } from 'vitest'
import type { TaskEvent } from './types'
import { nextDay } from './utils'
import {
  defaultAnswers, findRoutinePlan, MAX_PLAN_HABITS, parsePlanAnswers, planEndChanges, planHabitToTask, planProgress,
  planWindow, ROUTINE_PLANS, sanitizePlanHabits,
} from './routine-plans'

const corrida = findRoutinePlan('corrida-5k')!
const leitura = findRoutinePlan('leitura')!
const gastos = findRoutinePlan('gastos')!
const window = { startsOn: '2026-09-14', endsOn: '2026-10-11' }

describe('catálogo', () => {
  it('todo plano padrão cabe na própria janela e passa intacto pela validação da Pri', () => {
    for (const template of ROUTINE_PLANS) {
      const answers = defaultAnswers(template, '2026-09-14')
      const habits = template.build(answers)
      const span = planWindow(template, answers)
      expect(habits.length).toBeGreaterThan(0)
      expect(habits.length).toBeLessThanOrEqual(MAX_PLAN_HABITS)
      expect(sanitizePlanHabits(habits, span)).toEqual(habits)
    }
  })

  it('as fases da corrida se sucedem sem buraco nem sobreposição', () => {
    const habits = corrida.build(defaultAnswers(corrida, '2026-09-14'))
    expect(habits[0].startsOn).toBe('2026-09-14')
    expect(habits[habits.length - 1].endsOn).toBe('2026-11-08')
    for (let i = 1; i < habits.length; i++) expect(habits[i].startsOn).toBe(nextDay(habits[i - 1].endsOn))
  })

  it('o nível muda a corrida', () => {
    const answers = { ...defaultAnswers(corrida, '2026-09-14'), level: 'intermediario' as const }
    expect(corrida.build(answers)[0].title).toContain('20 min contínuos')
    expect(corrida.build(defaultAnswers(corrida, '2026-09-14'))[0].title).toContain('1 min correndo')
  })

  it('a revisão de gastos cai no domingo quando ele está livre, senão no último dia escolhido', () => {
    const review = (days: (0 | 1 | 2 | 3 | 4 | 5 | 6)[]) => gastos.build({ ...defaultAnswers(gastos, '2026-09-14'), days })[1].days
    expect(review([0, 1, 2, 3, 4, 5, 6])).toEqual([0])
    expect(review([1, 3, 5])).toEqual([5])
  })

  it('a leitura cresce até o tempo escolhido', () => {
    const habits = leitura.build({ ...defaultAnswers(leitura, '2026-09-14'), minutes: 30 })
    expect(habits.map(habit => habit.durationMinutes)).toEqual([15, 25, 30])
  })
})

describe('parsePlanAnswers', () => {
  const valid = { level: 'iniciante', days: [2, 4, 6], dayBlock: 'manha', startTime: '06:30', minutes: 30, startsOn: '2026-09-14' }

  it('aceita respostas válidas', () => {
    expect(parsePlanAnswers(valid, corrida)).toEqual({ level: 'iniciante', days: [2, 4, 6], dayBlock: 'manha', startTime: '06:30', minutes: 30, startsOn: '2026-09-14' })
  })

  it('recusa sem dias ou com data que não existe', () => {
    expect(parsePlanAnswers({ ...valid, days: [] }, corrida)).toBeNull()
    expect(parsePlanAnswers({ ...valid, startsOn: '2026-02-30' }, corrida)).toBeNull()
    expect(parsePlanAnswers(null, corrida)).toBeNull()
  })

  it('cai nos padrões do modelo quando o valor não é oferecido', () => {
    const answers = parsePlanAnswers({ ...valid, minutes: 999, dayBlock: 'madrugada', startTime: '25:00', level: 'intermediario' }, leitura)!
    expect(answers.minutes).toBe(20)
    expect(answers.dayBlock).toBe('noite')
    expect(answers.startTime).toBeUndefined()
    // Leitura não pergunta nível.
    expect(answers.level).toBe('iniciante')
  })

  it('limpa e corta a observação', () => {
    expect(parsePlanAnswers({ ...valid, note: '   ' }, corrida)?.note).toBeUndefined()
    expect(parsePlanAnswers({ ...valid, note: 'x'.repeat(900) }, corrida)?.note).toHaveLength(400)
  })
})

describe('sanitizePlanHabits', () => {
  const habit = { title: 'Leitura · 10 min', days: [1, 3], dayBlock: 'noite', startTime: '21:00', durationMinutes: 10, startsOn: '2026-09-14', endsOn: '2026-09-20' }

  it('prende as datas à janela do plano', () => {
    const [result] = sanitizePlanHabits([{ ...habit, startsOn: '2026-01-01', endsOn: '2027-01-01' }], window)
    expect(result.startsOn).toBe(window.startsOn)
    expect(result.endsOn).toBe(window.endsOn)
  })

  it('descarta o que não se aproveita e corrige o resto', () => {
    const result = sanitizePlanHabits([
      { ...habit, title: ' ' },
      { ...habit, days: [9] },
      { ...habit, startsOn: '2026-10-01', endsOn: '2026-09-20' },
      { ...habit, days: [3, 1, 3], dayBlock: 'madrugada', startTime: '7h', durationMinutes: 1000 },
      'lixo',
    ], window)
    expect(result).toEqual([{ ...habit, days: [1, 3], dayBlock: 'livre', startTime: undefined, durationMinutes: 240 }])
  })

  it('não lança com entrada inesperada e respeita o máximo de hábitos', () => {
    expect(sanitizePlanHabits(undefined, window)).toEqual([])
    expect(sanitizePlanHabits({ habits: [] }, window)).toEqual([])
    expect(sanitizePlanHabits(Array.from({ length: 30 }, () => habit), window)).toHaveLength(MAX_PLAN_HABITS)
  })
})

describe('planHabitToTask', () => {
  it('vira hábito com vigência e o vínculo com o plano', () => {
    const task = planHabitToTask({ title: 'Ler', days: [0, 1, 2, 3, 4, 5, 6], dayBlock: 'noite', durationMinutes: 10, startsOn: '2026-09-14', endsOn: '2026-09-20' }, { id: 'plan-1', slug: 'leitura' }, { id: 't1', source: 'ai' })
    expect(task).toMatchObject({ id: 't1', category: 'fixa', source: 'ai', routinePlanId: 'plan-1', routinePlanSlug: 'leitura' })
    // Todo dia não carrega filtro de dias.
    expect(task.frequency).toEqual({ startsOn: '2026-09-14', endsOn: '2026-09-20' })
  })
})

describe('planProgress', () => {
  const answers = { ...defaultAnswers(leitura, '2026-09-01'), minutes: 20 }
  const tasks = leitura.build(answers).map((habit, i) => planHabitToTask(habit, { id: 'plan-1', slug: 'leitura' }, { id: `t${i}`, source: 'manual' }))
  const events: TaskEvent[] = [
    { taskId: 't0', date: '2026-09-01', status: 'completed' },
    { taskId: 't0', date: '2026-09-02', status: 'completed' },
  ]

  it('conta o devido e o feito até hoje', () => {
    const [plan] = planProgress(tasks, events, '2026-09-03')
    expect(plan).toMatchObject({ id: 'plan-1', slug: 'leitura', status: 'running', week: 1, totalWeeks: 4, due: 3, done: 2 })
    expect(plan.today.map(task => task.id)).toEqual(['t0'])
    expect(plan.template?.title).toBe('Leitor de todo dia')
  })

  it('sabe quando ainda não começou e quando acabou', () => {
    expect(planProgress(tasks, events, '2026-08-30')[0]).toMatchObject({ status: 'upcoming', week: 0, due: 0 })
    const finished = planProgress(tasks, events, '2026-12-01')[0]
    expect(finished).toMatchObject({ status: 'finished', week: 4, due: 28, done: 2 })
    expect(finished.today).toEqual([])
  })

  it('ignora hábitos que não vieram de plano', () => {
    expect(planProgress([{ ...tasks[0], routinePlanId: undefined }], [], '2026-09-03')).toEqual([])
  })
})

describe('planEndChanges', () => {
  const tasks = corrida.build(defaultAnswers(corrida, '2026-09-14')).map((habit, i) => planHabitToTask(habit, { id: 'plan-1', slug: 'corrida-5k' }, { id: `t${i}`, source: 'manual' }))

  it('apaga o que não começou, encerra hoje o que está em andamento e não mexe no que já acabou', () => {
    const { remove, update } = planEndChanges(tasks, '2026-10-01')
    expect(remove).toEqual(['t2', 't3'])
    expect(update.map(task => [task.id, task.frequency?.endsOn])).toEqual([['t1', '2026-10-01']])
  })
})
