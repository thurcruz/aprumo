import { describe, expect, it } from 'vitest'
import { formatClock, formatFocusMinutes, headEmphasis, radialSegments, segmentFills } from './radial'

describe('traços acesos', () => {
  it('metade do tempo acende metade dos traços', () => {
    const fills = segmentFills(0.5, 72)
    expect(fills.filter(fill => fill === 1)).toHaveLength(36)
    expect(fills.filter(fill => fill === 0)).toHaveLength(36)
  })

  it('o traço da fronteira acende parcialmente', () => {
    expect(segmentFills(0.25, 10).slice(1, 4)).toEqual([1, 0.5, 0])
  })

  it('prende o progresso entre 0 e 1', () => {
    expect(segmentFills(-1, 4)).toEqual([0, 0, 0, 0])
    expect(segmentFills(3, 4)).toEqual([1, 1, 1, 1])
    expect(segmentFills(Number.NaN, 2)).toEqual([0, 0])
  })
})

describe('geometria do anel', () => {
  const segments = radialSegments({ count: 60, size: 200, radius: 90, length: 10 })

  it('o primeiro traço fica no topo, apontando para o centro', () => {
    expect(segments[0].x1).toBe(100)
    expect(segments[0].x2).toBe(100)
    expect(segments[0].y2).toBe(10)
    expect(segments[0].y1).toBeGreaterThan(segments[0].y2)
  })

  it('gira no sentido horário: um quarto do anel fica à direita', () => {
    expect(segments[15].x2).toBe(190)
    expect(segments[15].y2).toBe(100)
  })

  it('o comprimento só ondula de leve (menos de 15%)', () => {
    const lengths = segments.map(s => Math.hypot(s.x2 - s.x1, s.y2 - s.y1))
    expect(Math.max(...lengths) / Math.min(...lengths)).toBeLessThan(1.15)
  })
})

describe('cabeça do progresso', () => {
  it('destaca os últimos traços acesos, decaindo', () => {
    const emphasis = headEmphasis(0.5, 10)
    expect(emphasis.slice(1, 6)).toEqual([0, 0.33, 0.67, 1, 0])
  })

  it('ninguém se destaca no zero nem com o anel completo', () => {
    expect(headEmphasis(0, 10).every(value => value === 0)).toBe(true)
    expect(headEmphasis(1, 10).every(value => value === 0)).toBe(true)
  })
})

describe('tempo escrito', () => {
  it('minutos e segundos com dois dígitos', () => {
    expect(formatClock(25 * 60 + 42)).toBe('25:42')
    expect(formatClock(5)).toBe('00:05')
  })
  it('com hora quando passa de 60 minutos', () => {
    expect(formatClock(3900)).toBe('1:05:00')
  })
  it('nunca negativo', () => {
    expect(formatClock(-3)).toBe('00:00')
  })
  it('minutos de foco', () => {
    expect([30, 60, 130].map(formatFocusMinutes)).toEqual(['30 min', '1h', '2h 10min'])
  })
})
