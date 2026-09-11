import { describe, expect, it } from 'vitest'
import type { Goal, Task, TaskEvent } from './types'
import {
  daysBetween, describeFrequency, describeSpan, endFrom, endTimeOf, habitExpired, habitRunsOn,
  indexEvents, isDoneOn, isoDate, minutesBetween, nextDay, parseDate, taskDay, taskShowsOn, weekStart,
  deadlineState, describeDeadline, goalAlert, goalConsistency, goalProgress,
} from './utils'

const task = (patch: Partial<Task> = {}): Task => ({
  id: 't1', title: 'Tarefa', category: 'hoje', completed: false,
  createdAt: '2026-09-08T12:00:00.000Z', ...patch,
})
const events = (...list: TaskEvent[]) => indexEvents(list)

describe('datas locais', () => {
  // Estes casos existem porque toISOString() já causou três bugs de fuso:
  // à noite no Brasil (UTC-3) a data UTC é a de amanhã.
  it('isoDate usa o calendário local, não UTC', () => {
    const lateAtNight = new Date(2026, 8, 8, 23, 30)
    expect(isoDate(lateAtNight)).toBe('2026-09-08')
  })

  it('parseDate lê YYYY-MM-DD sem escorregar de dia', () => {
    expect(isoDate(parseDate('2026-09-08'))).toBe('2026-09-08')
  })

  it('parseDate aceita um ISO completo e fica no mesmo dia', () => {
    expect(isoDate(parseDate('2026-03-01T23:00:00.000Z'))).toBe('2026-03-01')
  })

  it('nextDay atravessa a virada de mês', () => {
    expect(nextDay('2026-09-30')).toBe('2026-10-01')
    expect(nextDay('2026-12-31')).toBe('2027-01-01')
  })

  it('nextDay atravessa 29 de fevereiro em ano bissexto', () => {
    expect(nextDay('2028-02-28')).toBe('2028-02-29')
  })

  it('weekStart devolve a segunda-feira, inclusive vindo de um domingo', () => {
    expect(isoDate(weekStart(parseDate('2026-09-13')))).toBe('2026-09-07') // domingo
    expect(isoDate(weekStart(parseDate('2026-09-07')))).toBe('2026-09-07') // segunda
    expect(isoDate(weekStart(parseDate('2026-09-10')))).toBe('2026-09-07') // quinta
  })

  it('daysBetween conta dias inteiros nos dois sentidos', () => {
    expect(daysBetween('2026-09-01', '2026-09-08')).toBe(7)
    expect(daysBetween('2026-09-08', '2026-09-01')).toBe(-7)
    expect(daysBetween('2026-09-08', '2026-09-08')).toBe(0)
  })
})

describe('horários', () => {
  it('minutesBetween mede o intervalo', () => {
    expect(minutesBetween('07:00', '08:30')).toBe(90)
  })

  it('minutesBetween trata a virada da meia-noite', () => {
    expect(minutesBetween('23:00', '00:30')).toBe(90)
  })

  it('endTimeOf soma a duração ao início', () => {
    expect(endTimeOf({ startTime: '07:00', durationMinutes: 90 })).toBe('08:30')
  })

  it('endTimeOf não inventa fim quando não há início', () => {
    expect(endTimeOf({ startTime: undefined, durationMinutes: 30 })).toBeUndefined()
  })

  it('endFrom cai no padrão quando a tarefa não tem hora', () => {
    expect(endFrom(undefined, undefined, '10:00')).toBe('10:00')
    expect(endFrom('22:00', 180)).toBe('01:00')
  })
})

describe('recorrência do hábito', () => {
  const monday = parseDate('2026-09-07')
  const saturday = parseDate('2026-09-12')

  it('sem frequência definida vale todo dia (registros antigos)', () => {
    expect(habitRunsOn(undefined, monday)).toBe(true)
  })

  it('lista de dias vazia também vale todo dia', () => {
    expect(habitRunsOn({ days: [] }, saturday)).toBe(true)
  })

  it('respeita os dias da semana escolhidos', () => {
    const weekdaysOnly = { days: [1, 2, 3, 4, 5] as const }
    expect(habitRunsOn({ days: [...weekdaysOnly.days] }, monday)).toBe(true)
    expect(habitRunsOn({ days: [...weekdaysOnly.days] }, saturday)).toBe(false)
  })

  it('não aparece antes do começo da vigência', () => {
    expect(habitRunsOn({ startsOn: '2026-09-10' }, monday)).toBe(false)
    expect(habitRunsOn({ startsOn: '2026-09-01' }, monday)).toBe(true)
  })

  it('não aparece depois do prazo final', () => {
    expect(habitRunsOn({ endsOn: '2026-09-05' }, monday)).toBe(false)
    expect(habitRunsOn({ endsOn: '2026-09-07' }, monday)).toBe(true) // o último dia conta
  })

  it('a vigência tem precedência sobre o dia da semana', () => {
    expect(habitRunsOn({ days: [1], startsOn: '2026-09-08' }, monday)).toBe(false)
  })

  it('habitExpired olha só o prazo final', () => {
    expect(habitExpired({ endsOn: '2026-09-01' }, parseDate('2026-09-08'))).toBe(true)
    expect(habitExpired({ endsOn: '2026-09-08' }, parseDate('2026-09-08'))).toBe(false)
    expect(habitExpired(undefined, parseDate('2026-09-08'))).toBe(false)
  })
})

describe('descrições em português', () => {
  it('resume os casos comuns por nome', () => {
    expect(describeFrequency(undefined)).toBe('Todo dia')
    expect(describeFrequency({ days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Todo dia')
    expect(describeFrequency({ days: [1, 2, 3, 4, 5] })).toBe('Dias de semana')
    expect(describeFrequency({ days: [0, 6] })).toBe('Fim de semana')
  })

  it('lista os dias soltos começando pela segunda', () => {
    expect(describeFrequency({ days: [1, 3, 5] })).toBe('Seg, Qua e Sex')
    expect(describeFrequency({ days: [2] })).toBe('Ter')
  })

  it('descreve a vigência conforme os limites informados', () => {
    expect(describeSpan(undefined)).toBeUndefined()
    expect(describeSpan({ days: [1] })).toBeUndefined()
    expect(describeSpan({ endsOn: '2026-12-10' })).toMatch(/^até /)
    expect(describeSpan({ startsOn: '2026-10-01' })).toMatch(/^a partir de /)
    expect(describeSpan({ startsOn: '2026-10-01', endsOn: '2026-12-10' })).toMatch(/^de .+ a .+/)
  })
})

describe('a que dia a tarefa pertence', () => {
  it('usa a data agendada quando existe', () => {
    expect(taskDay(task({ scheduledDate: '2026-09-20' }))).toBe('2026-09-20')
  })

  it('sem agendamento, recua para o dia da criação em hora local', () => {
    // 23:30 no Brasil vira o dia seguinte em UTC — o dia de criação é o local.
    expect(taskDay(task({ createdAt: new Date(2026, 8, 8, 23, 30).toISOString() }))).toBe('2026-09-08')
  })
})

describe('o que aparece em cada dia', () => {
  const pending = task({ id: 'p', scheduledDate: '2026-09-08' })

  it('a tarefa aparece no próprio dia', () => {
    expect(taskShowsOn(pending, '2026-09-08', events())).toBe(true)
  })

  it('não aparece antes do dia agendado', () => {
    expect(taskShowsOn(pending, '2026-09-07', events())).toBe(false)
  })

  it('pendente arrasta para os dias seguintes', () => {
    expect(taskShowsOn(pending, '2026-09-10', events())).toBe(true)
  })

  it('depois de concluída, para de arrastar', () => {
    const done = events({ taskId: 'p', date: '2026-09-08', status: 'completed' })
    expect(taskShowsOn(pending, '2026-09-08', done)).toBe(true)
    expect(taskShowsOn(pending, '2026-09-09', done)).toBe(false)
  })

  it('continua aparecendo nos dias em que ainda estava pendente', () => {
    // Concluída no dia 10: nos dias 8 e 9 ela era, de fato, uma pendência.
    const done = events({ taskId: 'p', date: '2026-09-10', status: 'completed' })
    expect(taskShowsOn(pending, '2026-09-09', done)).toBe(true)
    expect(taskShowsOn(pending, '2026-09-11', done)).toBe(false)
  })

  it('hábito segue a recorrência e ignora a regra de arrasto', () => {
    const habit = task({ id: 'h', category: 'fixa', frequency: { days: [1] } })
    expect(taskShowsOn(habit, '2026-09-07', events())).toBe(true)  // segunda
    expect(taskShowsOn(habit, '2026-09-08', events())).toBe(false) // terça
  })
})

describe('índice de eventos', () => {
  it('responde pela conclusão de cada dia separadamente', () => {
    const index = events(
      { taskId: 'h', date: '2026-09-07', status: 'completed' },
      { taskId: 'h', date: '2026-09-08', status: 'pending' },
    )
    expect(isDoneOn(index, 'h', '2026-09-07')).toBe(true)
    expect(isDoneOn(index, 'h', '2026-09-08')).toBe(false)
    expect(isDoneOn(index, 'h', '2026-09-09')).toBe(false)
  })

  it('guarda a primeira conclusão, mesmo fora de ordem', () => {
    const index = events(
      { taskId: 'h', date: '2026-09-10', status: 'completed' },
      { taskId: 'h', date: '2026-09-08', status: 'completed' },
    )
    expect(index.firstDone.get('h')).toBe('2026-09-08')
  })

  it('adiar não conta como concluir', () => {
    const index = events({ taskId: 'p', date: '2026-09-08', status: 'carried' })
    expect(isDoneOn(index, 'p', '2026-09-08')).toBe(false)
    expect(index.firstDone.has('p')).toBe(false)
  })
})

describe('prazo da meta', () => {
  const today = '2026-09-09'

  it('classifica a situação do prazo', () => {
    expect(deadlineState(undefined, today)).toBe('none')
    expect(deadlineState('2026-09-08', today)).toBe('late')
    expect(deadlineState('2026-09-09', today)).toBe('today')
    expect(deadlineState('2026-09-20', today)).toBe('soon')
    expect(deadlineState('2026-12-01', today)).toBe('ok')
  })

  it('o limite de "em breve" é configurável e inclusivo', () => {
    expect(deadlineState('2026-09-23', today, 14)).toBe('soon')
    expect(deadlineState('2026-09-24', today, 14)).toBe('ok')
  })

  it('aceita um ISO completo, não só YYYY-MM-DD', () => {
    expect(deadlineState('2026-09-09T00:00:00.000Z', today)).toBe('today')
  })

  it('descreve o prazo em português', () => {
    expect(describeDeadline(undefined, today)).toBeUndefined()
    expect(describeDeadline('2026-09-09', today)).toBe('vence hoje')
    expect(describeDeadline('2026-09-10', today)).toBe('vence amanhã')
    expect(describeDeadline('2026-09-08', today)).toBe('venceu ontem')
    expect(describeDeadline('2026-09-04', today)).toBe('venceu há 5 dias')
    expect(describeDeadline('2026-09-21', today)).toBe('faltam 12 dias')
    expect(describeDeadline('2026-12-09', today)).toMatch(/^faltam cerca de 3 meses$/)
  })
})

describe('constância e progresso da meta', () => {
  const today = '2026-09-09'
  const habit = (id: string, days?: number[]): Task =>
    task({ id, category: 'fixa', createdAt: '2026-01-01T12:00:00.000Z', frequency: days ? { days: days as never } : undefined })

  it('sem tarefas ligadas não há constância a informar', () => {
    expect(goalConsistency([], events(), today)).toBeUndefined()
  })

  it('hábito diário nunca cumprido dá 0%, não indefinido', () => {
    expect(goalConsistency([habit('h')], events(), today, 10)).toBe(0)
  })

  it('conta os dias cumpridos sobre os devidos', () => {
    const done = Array.from({ length: 5 }, (_, i) => ({
      taskId: 'h', date: `2026-09-0${9 - i}`, status: 'completed' as const,
    }))
    expect(goalConsistency([habit('h')], events(...done), today, 10)).toBe(50)
  })

  it('só conta os dias da recorrência do hábito', () => {
    // Segundas na janela de 09/09 (quarta) até 03/09: dia 07.
    const monday = { taskId: 'h', date: '2026-09-07', status: 'completed' as const }
    expect(goalConsistency([habit('h', [1])], events(monday), today, 7)).toBe(100)
  })

  it('tarefa avulsa conta só no próprio dia, sem o arrasto', () => {
    const single = task({ id: 's', scheduledDate: '2026-09-05' })
    expect(goalConsistency([single], events(), today, 10)).toBe(0)
    expect(goalConsistency([single], events({ taskId: 's', date: '2026-09-05', status: 'completed' }), today, 10)).toBe(100)
  })

  it('progresso vem dos marcos quando eles existem', () => {
    const milestones = [
      { id: 'a', title: 'a', completed: true },
      { id: 'b', title: 'b', completed: false },
    ]
    expect(goalProgress(milestones)).toBe(50)
    expect(goalProgress(milestones, 90)).toBe(50) // marcos têm precedência
  })

  it('sem marcos, o progresso é a constância — e não fica preso em 0%', () => {
    expect(goalProgress([], 42)).toBe(42)
    expect(goalProgress([])).toBe(0)
  })
})

describe('o que a meta cobra', () => {
  const today = '2026-09-09'
  const goal = (patch: Partial<Goal> = {}): Goal => ({
    id: 'g', title: 'Meta', description: '', category: 'carreira',
    deadline: '2026-12-01', progress: 0, milestones: [], linkedTasks: [], status: 'active', ...patch,
  })
  const alert = (g: Goal, consistency?: number, linkedCount = 1) => goalAlert(g, { today, consistency, linkedCount })

  it('meta encerrada ou pausada não cobra nada', () => {
    expect(alert(goal({ status: 'completed', deadline: '2026-01-01' }))).toBeUndefined()
    expect(alert(goal({ status: 'paused', deadline: '2026-01-01' }))).toBeUndefined()
    expect(alert(goal({ status: 'archived', deadline: '2026-01-01' }))).toBeUndefined()
  })

  it('atraso é o aviso mais urgente e vem em vermelho', () => {
    const result = alert(goal({ deadline: '2026-09-04' }), 10, 0)
    expect(result?.tone).toBe('danger')
    expect(result?.text).toContain('5 dias')
  })

  it('singular no dia seguinte ao vencimento', () => {
    expect(alert(goal({ deadline: '2026-09-08' }))?.text).toContain('ontem')
  })

  it('meta sem marcos e sem tarefas é sinalizada como desejo solto', () => {
    expect(alert(goal(), undefined, 0)?.text).toMatch(/não virou comportamento/)
  })

  it('constância baixa vira cobrança', () => {
    expect(alert(goal(), 25)?.text).toContain('25%')
  })

  it('constância saudável não cobra nada', () => {
    expect(alert(goal({ progress: 80 }), 85)).toBeUndefined()
  })

  it('prazo próximo com pouco progresso avisa', () => {
    const result = alert(goal({ deadline: '2026-09-16', progress: 20 }), 90)
    expect(result?.tone).toBe('attention')
    expect(result?.text).toContain('7 dias')
  })

  it('prazo próximo com bom progresso não incomoda', () => {
    expect(alert(goal({ deadline: '2026-09-16', progress: 80 }), 90)).toBeUndefined()
  })

  it('cobra um aviso por vez, o mais grave', () => {
    // Atrasada E sem comportamento E constância zero: só o atraso aparece.
    const result = alert(goal({ deadline: '2026-09-01' }), 0, 0)
    expect(result?.text).toMatch(/^Passou do prazo/)
  })
})

describe('devido × feito', () => {
  it('hábito recém-criado não chega com faltas acumuladas', () => {
    // Criado no dia 8, visto no dia 9: só dois dias devidos, os dois cumpridos.
    const fresh = task({ id: 'novo', category: 'fixa', createdAt: new Date(2026, 8, 8, 12).toISOString() })
    const index = indexEvents([
      { taskId: 'novo', date: '2026-09-08', status: 'completed' },
      { taskId: 'novo', date: '2026-09-09', status: 'completed' },
    ])
    expect(goalConsistency([fresh], index, '2026-09-09', 30)).toBe(100)
  })
})
