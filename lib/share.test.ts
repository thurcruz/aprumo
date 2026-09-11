import { describe, expect, it } from 'vitest'
import type { FocusSession } from './types'
import { isShareable, sessionText, SHAREABLE_MINUTES } from './share'

const session = (patch: Partial<FocusSession> = {}): FocusSession => ({
  id: 's1', name: '', plannedMinutes: 25, actualSeconds: 25 * 60,
  interruptions: 0, status: 'completed', startedAt: '2026-09-09T12:00:00.000Z', ...patch,
})

describe('quem pode ser compartilhado', () => {
  it('sessão concluída pode', () => {
    expect(isShareable(session())).toBe(true)
  })

  it('interrompida também pode, desde que tenha rendido', () => {
    // O que foi focado, foi focado: interromper não desqualifica.
    expect(isShareable(session({ status: 'abandoned', actualSeconds: 18 * 60 }))).toBe(true)
  })

  it('o mínimo é inclusivo', () => {
    expect(isShareable(session({ status: 'abandoned', actualSeconds: SHAREABLE_MINUTES * 60 }))).toBe(true)
    expect(isShareable(session({ status: 'abandoned', actualSeconds: SHAREABLE_MINUTES * 60 - 1 }))).toBe(false)
  })

  it('sessão curta demais não é oferecida', () => {
    expect(isShareable(session({ status: 'abandoned', actualSeconds: 40 }))).toBe(false)
    expect(isShareable(session({ actualSeconds: 0 }))).toBe(false)
  })
})

describe('texto compartilhado', () => {
  it('usa o tempo real, não o planejado', () => {
    // Interrompeu aos 18 de 25: o texto conta a verdade.
    expect(sessionText(session({ status: 'abandoned', actualSeconds: 18 * 60 }))).toContain('18 min')
  })

  it('inclui o que a pessoa estava fazendo', () => {
    expect(sessionText(session({ name: 'Terminar a proposta' }))).toBe('25 min de foco em "Terminar a proposta". Feito no Aprumo.')
  })

  it('sem nome, fala só do tempo', () => {
    expect(sessionText(session({ name: '   ' }))).toBe('25 min de foco. Feito no Aprumo.')
  })

  it('arredonda os segundos para o minuto mais próximo', () => {
    expect(sessionText(session({ actualSeconds: 25 * 60 + 40 }))).toContain('26 min')
  })
})
