import { describe, expect, it } from 'vitest'
import { postHeadline, timeAgo, toPost, type PostRow } from './posts'

const row = (overrides: Partial<PostRow> = {}): PostRow => ({
  id: 'p1',
  user_id: 'u1',
  author_name: 'Ana',
  author_avatar_url: null,
  body: { minutes: 25, planned_minutes: 25, status: 'completed', name: 'Relatório' },
  created_at: '2026-09-11T12:00:00.000Z',
  ...overrides,
})

describe('mural', () => {
  it('traduz a linha do banco e marca o que é de quem está vendo', () => {
    const post = toPost(row(), 'u1')
    expect(post).toMatchObject({ id: 'p1', authorName: 'Ana', minutes: 25, plannedMinutes: 25, status: 'completed', name: 'Relatório', mine: true })
    expect(toPost(row(), 'outra-pessoa').mine).toBe(false)
  })

  it('não expõe o id do autor', () => {
    expect(Object.keys(toPost(row(), 'u1'))).not.toContain('user_id')
  })

  it('corpo malformado não quebra: vira zero e sem nome', () => {
    const post = toPost(row({ body: ['lixo'] }), 'u1')
    expect(post).toMatchObject({ minutes: 0, plannedMinutes: 0, status: 'completed', name: null })
    expect(toPost(row({ body: { minutes: -4, name: '   ' } }), 'u1')).toMatchObject({ minutes: 0, name: null })
  })

  it('sessão interrompida continua valendo', () => {
    expect(toPost(row({ body: { minutes: 12, status: 'abandoned' } }), 'u1').status).toBe('abandoned')
  })

  it('manchete mostra o nome só quando o autor escolheu', () => {
    expect(postHeadline({ minutes: 25, name: 'Relatório' })).toBe('25 min de foco em “Relatório”')
    expect(postHeadline({ minutes: 40, name: null })).toBe('40 min de foco')
  })

  it('tempo relativo em português', () => {
    const now = Date.parse('2026-09-11T12:00:00.000Z')
    const ago = (ms: number) => new Date(now - ms).toISOString()
    expect(timeAgo(ago(20_000), now)).toBe('agora')
    expect(timeAgo(ago(-60_000), now)).toBe('agora')
    expect(timeAgo(ago(12 * 60_000), now)).toBe('há 12 min')
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe('há 3 h')
    expect(timeAgo(ago(30 * 3_600_000), now)).toBe('ontem')
    expect(timeAgo(ago(4 * 86_400_000), now)).toBe('há 4 dias')
    expect(timeAgo('2026-08-20T12:00:00.000Z', now)).toMatch(/20 de ago/)
  })
})
