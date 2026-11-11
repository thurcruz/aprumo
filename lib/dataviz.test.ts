import { describe, expect, it } from 'vitest'
import { barRatios, formatDelta, formatNumber, heatLevel, percentOf, sparklinePath } from './dataviz'

describe('sparkline', () => {
  it('liga os pontos da esquerda para a direita, com o maior valor no topo', () => {
    const { line, points } = sparklinePath([0, 10], 100, 20, { padding: 0 })
    expect(line).toBe('M0 20L100 0')
    expect(points).toEqual([{ x: 0, y: 20 }, { x: 100, y: 0 }])
  })

  it('série constante fica no meio, não no chão', () => {
    const { points } = sparklinePath([5, 5, 5], 100, 20, { padding: 0 })
    expect(points.every(point => point?.y === 10)).toBe(true)
  })

  it('valor nulo interrompe o traço e não fecha área', () => {
    const { line, area } = sparklinePath([1, null, 3], 100, 20, { padding: 0 })
    expect(line).toBe('M0 20M100 0')
    expect(area).toBe('')
  })

  it('série contínua fecha a área na base', () => {
    const { area } = sparklinePath([1, 2], 100, 20, { padding: 0 })
    expect(area).toBe('M0 20L100 0L100 20L0 20Z')
  })

  it('sem nenhum valor não desenha nada', () => {
    expect(sparklinePath([null, null], 100, 20).line).toBe('')
  })

  it('respeita escala fixa e prende o que passa dela', () => {
    const { points } = sparklinePath([150], 100, 20, { min: 0, max: 100, padding: 0 })
    expect(points[0]).toEqual({ x: 50, y: 0 })
  })
})

describe('barras', () => {
  it('mede contra o maior valor', () => {
    expect(barRatios([5, 10, null])).toEqual([0.5, 1, null])
  })
  it('mede contra a meta quando existe', () => {
    expect(barRatios([90, 270], 180)).toEqual([0.5, 1])
  })
  it('tudo zero não divide por zero', () => {
    expect(barRatios([0, 0])).toEqual([0, 0])
  })
})

describe('nível do heatmap', () => {
  it('distingue "nada devido" de "nada feito"', () => {
    expect(heatLevel(null)).toBeNull()
    expect(heatLevel(0)).toBe(0)
  })
  it('usa os mesmos cortes do mapa de constância', () => {
    expect([0.2, 0.34, 0.66, 0.67, 0.99, 1].map(heatLevel)).toEqual([1, 2, 2, 3, 3, 4])
  })
})

describe('números', () => {
  it('porcentagem presa entre 0 e 100', () => {
    expect(percentOf(7, 9)).toBe(78)
    expect(percentOf(12, 9)).toBe(100)
    expect(percentOf(3, 0)).toBe(0)
  })

  it('variação com sinal tipográfico e vírgula', () => {
    expect(formatDelta(12, '%')).toEqual({ direction: 'up', text: '+12%' })
    expect(formatDelta(-0.5, ' h')).toEqual({ direction: 'down', text: '−0,5 h' })
    expect(formatDelta(0)).toEqual({ direction: 'flat', text: 'igual' })
    expect(formatDelta(null).direction).toBe('none')
  })

  it('milhar com ponto e decimal com vírgula', () => {
    expect(formatNumber(2840)).toBe('2.840')
    expect(formatNumber(4.25, 1)).toBe('4,3')
  })
})
