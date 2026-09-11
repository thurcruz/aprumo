import { describe, expect, it } from 'vitest'
import type { WorkoutLog, WorkoutPlan } from './types'
import {
  describeSet, expandSets, formatDuration, isFinalSet, isUniform, lastPerformance, markSet,
  parseDuration, parsePlanExercises, parseSessionSnapshot, sessionProgress, sessionVolume, startSession, updateSet,
} from './workout'

const plan: WorkoutPlan = {
  id: 'p1',
  name: 'Treino A',
  exercises: [
    { id: 'supino', name: 'Supino reto', kind: 'reps', restSeconds: 90, sets: expandSets(3, { reps: 10, weight: 20 }) },
    { id: 'prancha', name: 'Prancha', kind: 'time', restSeconds: 60, sets: expandSets(2, { seconds: 45 }) },
  ],
}

const log = (patch: Partial<WorkoutLog> & Pick<WorkoutLog, 'exercises'>): WorkoutLog => ({
  id: 'l', planId: 'p1', planName: 'Treino A', volumeKg: 0,
  startedAt: '2026-09-01T10:00:00.000Z', completedAt: '2026-09-01T11:00:00.000Z', ...patch,
})

describe('leitura da ficha', () => {
  it('aceita o formato antigo e descarta o check que morava na ficha', () => {
    const [exercise] = parsePlanExercises([{ id: 'x', name: 'Agachamento', sets: [{ reps: 12, weight: 40, completed: true }] }])
    expect(exercise.kind).toBe('reps')
    expect(exercise.sets[0]).toEqual({ reps: 12, weight: 40 })
  })

  it('preenche descanso e uma série padrão quando faltam', () => {
    const [exercise] = parsePlanExercises([{ id: 'x', name: 'Remada', sets: [] }])
    expect(exercise.restSeconds).toBe(90)
    expect(exercise.sets).toHaveLength(1)
  })

  it('ignora entradas quebradas e exercício sem nome', () => {
    expect(parsePlanExercises([null, 3, { name: '   ' }, { name: 'Rosca' }]).map(item => item.name)).toEqual(['Rosca'])
    expect(parsePlanExercises('lixo')).toEqual([])
  })

  it('lê exercício por tempo em segundos', () => {
    const [exercise] = parsePlanExercises([{ name: 'Esteira', kind: 'time', sets: [{ seconds: 1200 }] }])
    expect(exercise.sets[0]).toEqual({ seconds: 1200 })
  })

  it('recusa valores absurdos e cai no padrão', () => {
    const [exercise] = parsePlanExercises([{ name: 'Leg press', sets: [{ reps: -3, weight: 99999 }] }])
    expect(exercise.sets[0]).toEqual({ reps: 10, weight: 0 })
  })
})

describe('séries', () => {
  it('"3 × 12" gera três cópias independentes', () => {
    const sets = expandSets(3, { reps: 12, weight: 20 })
    expect(sets).toHaveLength(3)
    sets[0].weight = 30
    expect(sets[1].weight).toBe(20)
  })

  it('limita entre 1 e 20 séries', () => {
    expect(expandSets(0, { reps: 1 })).toHaveLength(1)
    expect(expandSets(99, { reps: 1 })).toHaveLength(20)
  })

  it('reconhece séries iguais e pirâmide', () => {
    expect(isUniform(expandSets(3, { reps: 10, weight: 20 }))).toBe(true)
    expect(isUniform([{ reps: 12, weight: 20 }, { reps: 10, weight: 25 }])).toBe(false)
  })
})

describe('tempo e texto', () => {
  it('lê duração em segundos ou mm:ss', () => {
    expect(parseDuration('45')).toBe(45)
    expect(parseDuration('1:30')).toBe(90)
    expect(parseDuration('20:00')).toBe(1200)
    expect(parseDuration('1:75')).toBeUndefined()
    expect(parseDuration('abc')).toBeUndefined()
    expect(parseDuration('')).toBeUndefined()
  })

  it('formata duração', () => {
    expect(formatDuration(45)).toBe('0:45')
    expect(formatDuration(1200)).toBe('20:00')
    expect(formatDuration(3725)).toBe('1:02:05')
  })

  it('descreve a série do jeito que se fala na academia', () => {
    expect(describeSet('reps', { reps: 12, weight: 20 })).toBe('12 × 20 kg')
    expect(describeSet('reps', { reps: 12, weight: 22.5 })).toBe('12 × 22,5 kg')
    expect(describeSet('reps', { reps: 15, weight: 0 })).toBe('15 reps')
    expect(describeSet('time', { seconds: 45 })).toBe('0:45')
  })
})

describe('última carga', () => {
  const older = log({ id: 'a', completedAt: '2026-09-01T11:00:00.000Z', exercises: [
    { id: 'supino', name: 'Supino reto', kind: 'reps', restSeconds: 90, sets: [{ reps: 10, weight: 20, done: true }] },
  ] })
  const newer = log({ id: 'b', completedAt: '2026-09-05T11:00:00.000Z', exercises: [
    { id: 'supino', name: 'Supino reto', kind: 'reps', restSeconds: 90, sets: [
      { reps: 10, weight: 22, done: true }, { reps: 8, weight: 25, done: true }, { reps: 6, weight: 30, done: false },
    ] },
  ] })

  it('vem do treino mais recente, e a melhor série é a mais pesada concluída', () => {
    const last = lastPerformance({ id: 'supino', name: 'Supino reto' }, [older, newer])
    expect(last?.date).toBe('2026-09-05T11:00:00.000Z')
    // 30 kg não foi concluída, então não conta.
    expect(last?.best).toMatchObject({ weight: 25, reps: 8 })
  })

  it('acha pelo nome quando o id mudou (ficha recriada)', () => {
    expect(lastPerformance({ id: 'outro-id', name: '  supino RETO ' }, [older])?.best.weight).toBe(20)
  })

  it('treino não finalizado não conta', () => {
    const unfinished = log({ completedAt: undefined, exercises: newer.exercises })
    expect(lastPerformance({ id: 'supino', name: 'Supino reto' }, [unfinished])).toBeUndefined()
  })
})

describe('execução', () => {
  const history = [log({ exercises: [
    { id: 'supino', name: 'Supino reto', kind: 'reps', restSeconds: 90, sets: [{ reps: 10, weight: 22, done: true }, { reps: 8, weight: 25, done: true }] },
  ] })]

  it('sugere a carga da última vez, série por série', () => {
    const session = startSession(plan, history, '2026-09-09T10:00:00.000Z')
    // A terceira série não existia da última vez: usa a melhor.
    expect(session.exercises[0].sets.map(set => set.weight)).toEqual([22, 25, 25])
    // A meta de repetições continua sendo a da ficha.
    expect(session.exercises[0].sets.map(set => set.reps)).toEqual([10, 10, 10])
  })

  it('começa com nada marcado e não altera a ficha', () => {
    const before = JSON.stringify(plan)
    const session = startSession(plan, history, '2026-09-09T10:00:00.000Z')
    expect(session.exercises.every(exercise => exercise.sets.every(set => !set.done))).toBe(true)
    expect(JSON.stringify(plan)).toBe(before)
  })

  it('sem histórico, usa a carga da ficha', () => {
    expect(startSession(plan, [], 'x').exercises[0].sets[0].weight).toBe(20)
  })

  it('marca e edita séries sem mutar o original', () => {
    const session = startSession(plan, [], 'x')
    const marked = markSet(session, 'supino', 1, true)
    expect(marked.exercises[0].sets[1].done).toBe(true)
    expect(session.exercises[0].sets[1].done).toBe(false)
    expect(updateSet(marked, 'supino', 1, { weight: 27.5 }).exercises[0].sets[1].weight).toBe(27.5)
  })

  it('volume conta só série concluída com carga — tempo fica de fora', () => {
    let session = startSession(plan, [], 'x')
    session = markSet(session, 'supino', 0, true)
    session = markSet(session, 'supino', 1, true)
    session = markSet(session, 'prancha', 0, true)
    expect(sessionVolume(session.exercises)).toBe(400)
    expect(sessionProgress(session.exercises)).toEqual({ done: 3, total: 5 })
  })

  it('sabe qual é a última série do treino — depois dela não há descanso', () => {
    const session = startSession(plan, [], 'x')
    expect(isFinalSet(session, 'prancha', 1)).toBe(true)
    expect(isFinalSet(session, 'supino', 2)).toBe(false)
    expect(isFinalSet(session, 'nao-existe', 0)).toBe(false)
  })
})

describe('retrato salvo no banco', () => {
  it('relê o que foi feito, com o estado de cada série', () => {
    const snapshot = parseSessionSnapshot({ planName: 'Treino A', exercises: [
      { id: 's', name: 'Supino', sets: [{ reps: 10, weight: 20, done: true }, { reps: 10, weight: 20 }] },
    ] })
    expect(snapshot.planName).toBe('Treino A')
    expect(snapshot.exercises[0].sets.map(set => set.done)).toEqual([true, false])
  })

  it('sobrevive a lixo no jsonb', () => {
    expect(parseSessionSnapshot(null)).toEqual({ planName: 'Treino', exercises: [] })
  })
})
