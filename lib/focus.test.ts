import { describe, expect, it } from 'vitest'
import { focusHref, focusMinutesByTask } from './focus'
import type { FocusSession } from './types'

const session = (patch: Partial<FocusSession>): FocusSession => ({
  id: crypto.randomUUID(), name: '', plannedMinutes: 25, actualSeconds: 1500, interruptions: 0, status: 'completed',
  startedAt: new Date(2026, 8, 16, 10).toISOString(), ...patch,
})

describe('foco ligado a tarefas', () => {
  it('soma os minutos por tarefa, incluindo sessões interrompidas', () => {
    const totals = focusMinutesByTask([
      session({ commitmentId: 'a' }),
      session({ commitmentId: 'a', status: 'abandoned', actualSeconds: 600 }),
      session({ commitmentId: 'b', actualSeconds: 300 }),
      session({}),
    ])
    expect(totals.get('a')).toBe(35)
    expect(totals.get('b')).toBe(5)
    expect(totals.size).toBe(2)
  })

  it('filtra pelo dia no fuso do aparelho', () => {
    const totals = focusMinutesByTask([
      session({ commitmentId: 'a' }),
      session({ commitmentId: 'a', startedAt: new Date(2026, 8, 15, 23).toISOString() }),
    ], '2026-09-16')
    expect(totals.get('a')).toBe(25)
  })

  it('o link leva o id da tarefa', () => {
    expect(focusHref('abc-1')).toBe('/foco?tarefa=abc-1')
  })
})
