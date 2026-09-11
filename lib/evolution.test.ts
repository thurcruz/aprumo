import { describe, expect, it } from 'vitest'
import type { Book, Goal, MoodEntry, Task, TaskEvent, WorkoutLog } from './types'
import { addDays, areaStats, consistencyOf, crossInsights, dailyScores, dayOf, delta, heatmap, streaks, timeline } from './evolution'
import { indexEvents } from './utils'

const habit = (id: string, createdAt = '2026-01-01T12:00:00.000Z', patch: Partial<Task> = {}): Task =>
  ({ id, title: id, category: 'fixa', completed: false, createdAt, ...patch })
const done = (taskId: string, date: string): TaskEvent => ({ taskId, date, status: 'completed' })
const workout = (completedAt: string, volumeKg = 0, exercises: WorkoutLog['exercises'] = []): WorkoutLog =>
  ({ id: completedAt, planName: 'Treino A', exercises, volumeKg, startedAt: completedAt, completedAt })
const empty = { tasks: [], events: [], focusSessions: [], workoutLogs: [], books: [], moods: [], sleep: [] }

describe('datas', () => {
  it('lê data pura e ISO completo como dia local', () => {
    expect(dayOf('2026-09-10')).toBe('2026-09-10')
    expect(dayOf(new Date(2026, 8, 10, 23, 30).toISOString())).toBe('2026-09-10')
  })

  it('soma dias atravessando o mês', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('pontuação diária', () => {
  it('dia sem nada devido é null, não zero', () => {
    const scores = dailyScores([], indexEvents([]), '2026-09-01', '2026-09-03')
    expect(scores.map(score => score.ratio)).toEqual([null, null, null])
  })

  it('hábito não é cobrado antes de existir', () => {
    // Criado no dia 5: os dias 1 a 4 não podem contar como falha.
    const scores = dailyScores([habit('h', new Date(2026, 8, 5, 12).toISOString())], indexEvents([]), '2026-09-01', '2026-09-06')
    expect(scores.map(score => score.due)).toEqual([0, 0, 0, 0, 1, 1])
  })

  it('conta cumpridos sobre devidos', () => {
    const scores = dailyScores([habit('a'), habit('b')], indexEvents([done('a', '2026-09-01'), done('b', '2026-09-01'), done('a', '2026-09-02')]), '2026-09-01', '2026-09-02')
    expect(scores.map(score => score.ratio)).toEqual([1, 0.5])
    expect(consistencyOf(scores)).toBe(75)
  })

  it('hábito ignorado pesa — era o que inflava a constância', () => {
    const scores = dailyScores([habit('a'), habit('ignorado')], indexEvents([done('a', '2026-09-01')]), '2026-09-01', '2026-09-01')
    expect(consistencyOf(scores)).toBe(50)
  })

  it('sem nada devido no período, constância é null', () => {
    expect(consistencyOf([])).toBeNull()
  })

  it('data inválida devolve vazio em vez de travar num laço infinito', () => {
    // No primeiro render, "hoje" ainda é '' — antes da trava isso nunca terminava.
    expect(dailyScores([habit('a')], indexEvents([]), '', '')).toEqual([])
    expect(areaStats(empty, '').workouts).toEqual({ current: 0, previous: 0 })
  })
})

describe('sequência', () => {
  it('conta dias seguidos até hoje', () => {
    expect(streaks(['2026-09-08', '2026-09-09', '2026-09-10'].map(day => done('a', day)), '2026-09-10').current).toBe(3)
  })

  it('hoje ainda vazio não quebra a sequência', () => {
    expect(streaks(['2026-09-08', '2026-09-09'].map(day => done('a', day)), '2026-09-10').current).toBe(2)
  })

  it('um dia em branco quebra', () => {
    expect(streaks(['2026-09-06', '2026-09-07', '2026-09-09'].map(day => done('a', day)), '2026-09-10').current).toBe(1)
  })

  it('a melhor sequência fica guardada depois de quebrar — conquista não se desfaz', () => {
    const result = streaks(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-09'].map(day => done('a', day)), '2026-09-10')
    expect(result).toEqual({ current: 1, best: 4, bestEndedOn: '2026-09-04' })
  })

  it('evento adiado não conta', () => {
    expect(streaks([{ taskId: 'a', date: '2026-09-10', status: 'carried' }], '2026-09-10').current).toBe(0)
  })

  it('duas conclusões no mesmo dia são um dia só', () => {
    expect(streaks([done('a', '2026-09-10'), done('b', '2026-09-10')], '2026-09-10')).toMatchObject({ current: 1, best: 1 })
  })
})

describe('mapa de constância', () => {
  it('monta semanas de segunda a domingo terminando na semana de hoje', () => {
    const grid = heatmap([], '2026-09-10', 2)
    expect(grid).toHaveLength(2)
    expect(grid[1][0].date).toBe('2026-09-07')
    expect(grid[0][0].date).toBe('2026-08-31')
    expect(grid.every(week => week.length === 7)).toBe(true)
  })

  it('marca os dias depois de hoje como futuro', () => {
    expect(heatmap([], '2026-09-10', 1)[0].map(cell => cell.future)).toEqual([false, false, false, false, true, true, true])
  })

  it('usa a pontuação do dia quando existe', () => {
    const grid = heatmap([{ date: '2026-09-08', due: 2, done: 1, ratio: 0.5 }], '2026-09-10', 1)
    expect(grid[0][1].ratio).toBe(0.5)
    expect(grid[0][0].ratio).toBeNull()
  })
})

describe('números por área', () => {
  const today = '2026-09-10'

  it('compara os últimos 30 dias com os 30 anteriores', () => {
    const stats = areaStats({ ...empty, workoutLogs: [workout('2026-09-05T12:00:00.000Z', 1000), workout('2026-09-01T12:00:00.000Z', 500), workout('2026-08-01T12:00:00.000Z', 800)] }, today)
    expect(stats.workouts).toEqual({ current: 2, previous: 1 })
    expect(stats.volumeKg).toEqual({ current: 1500, previous: 800 })
  })

  it('média de humor e sono sem registro é null, não zero', () => {
    const stats = areaStats(empty, today)
    expect(stats.mood).toEqual({ current: null, previous: null })
    expect(stats.sleepHours).toEqual({ current: null, previous: null })
    expect(delta(stats.mood)).toBeNull()
  })

  it('delta arredonda a diferença', () => {
    expect(delta({ current: 4.26, previous: 3.9 })).toBe(0.4)
  })
})

describe('cruzamentos', () => {
  const today = '2026-09-10'
  const mood = (day: string, value: MoodEntry['mood']): MoodEntry => ({ id: day, date: `${day}T15:00:00.000Z`, mood: value })
  const trained = ['2026-09-01', '2026-09-03', '2026-09-05']
  const rested = ['2026-09-02', '2026-09-04', '2026-09-06']
  const logs = trained.map(day => workout(`${day}T11:00:00.000Z`))

  it('compara o humor nos dias com e sem treino', () => {
    const insights = crossInsights({ ...empty, moods: [...trained.map(day => mood(day, 5)), ...rested.map(day => mood(day, 3))], workoutLogs: logs }, today)
    const insight = insights.find(item => item.id === 'treino')
    expect(insight).toMatchObject({ withAvg: 5, withoutAvg: 3, samples: [3, 3] })
    expect(insight?.text).toMatch(/^Nos dias em que você treinou, seu humor foi 2 pontos mais alto/)
  })

  it('diferença pequena é dita como pequena', () => {
    const insights = crossInsights({ ...empty, moods: [...trained, ...rested].map(day => mood(day, 4)), workoutLogs: logs }, today)
    expect(insights.find(item => item.id === 'treino')?.text).toMatch(/praticamente igual/)
  })

  it('com menos de três dias de cada lado, não conclui nada', () => {
    const insights = crossInsights({ ...empty, moods: [mood('2026-09-01', 5), mood('2026-09-02', 3)], workoutLogs: [logs[0]] }, today)
    expect(insights.find(item => item.id === 'treino')).toBeUndefined()
  })

  it('dia sem registro de sono fica fora da pergunta sobre sono', () => {
    const insights = crossInsights({ ...empty, moods: [...trained, ...rested].map(day => mood(day, 4)) }, today)
    expect(insights.find(item => item.id === 'sono')).toBeUndefined()
  })
})

describe('linha do tempo', () => {
  it('reúne marcos de áreas diferentes, do mais recente ao mais antigo', () => {
    const goals: Goal[] = [{
      id: 'g', title: 'Maratona', description: '', category: 'saude', deadline: '', progress: 100, linkedTasks: [],
      status: 'completed', completedAt: '2026-09-08T12:00:00.000Z',
      milestones: [{ id: 'm', title: 'Correr 10 km', completed: true, completedAt: '2026-08-20T12:00:00.000Z' }],
    }]
    const books: Book[] = [{ id: 'b', title: 'Hábitos Atômicos', author: 'James Clear', status: 'lido', finishedAt: '2026-09-01' }]
    const entries = timeline({ goals, books, workoutLogs: [], focusSessions: [], events: [] }, '2026-09-10')
    expect(entries.map(entry => entry.kind)).toEqual(['goal', 'book', 'milestone'])
  })

  it('recorde de carga só quando supera o anterior — a primeira vez não é recorde', () => {
    const lift = (weight: number): WorkoutLog['exercises'] => [{ id: 's', name: 'Supino', kind: 'reps', restSeconds: 90, sets: [{ reps: 8, weight, done: true }] }]
    const logs = [workout('2026-09-01T11:00:00.000Z', 0, lift(20)), workout('2026-09-03T11:00:00.000Z', 0, lift(20)), workout('2026-09-05T11:00:00.000Z', 0, lift(22.5))]
    const records = timeline({ goals: [], books: [], workoutLogs: logs, focusSessions: [], events: [] }, '2026-09-10').filter(entry => entry.kind === 'record')
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ title: 'Recorde em Supino: 22,5 kg', detail: 'antes: 20 kg' })
  })

  it('marca o primeiro treino e a maior sequência', () => {
    const events = ['2026-09-04', '2026-09-05', '2026-09-06'].map(day => done('a', day))
    const entries = timeline({ goals: [], books: [], workoutLogs: [workout('2026-09-01T11:00:00.000Z')], focusSessions: [], events }, '2026-09-10')
    expect(entries).toEqual([
      { date: '2026-09-06', kind: 'streak', title: 'Maior sequência: 3 dias' },
      { date: '2026-09-01', kind: 'first-workout', title: 'Primeiro treino registrado', detail: 'Treino A' },
    ])
  })
})
