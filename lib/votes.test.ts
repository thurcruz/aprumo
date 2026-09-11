import { describe, expect, it } from 'vitest'
import { isVoteFeature, tally, voteFeatures } from './votes'

const [a, b, c] = voteFeatures.map(feature => feature.id)
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

describe('validação do voto', () => {
  it('aceita só opções que existem na lista', () => {
    expect(isVoteFeature(a)).toBe(true)
    expect(isVoteFeature('qualquer-coisa')).toBe(false)
  })

  it('recusa o que nem texto é', () => {
    expect(isVoteFeature(undefined)).toBe(false)
    expect(isVoteFeature(42)).toBe(false)
    expect(isVoteFeature({ id: a })).toBe(false)
  })
})

describe('placar', () => {
  it('sem votos, todo mundo em zero — sem dividir por zero', () => {
    const result = tally({})
    expect(result.total).toBe(0)
    expect(result.rows.every(row => row.percent === 0 && row.votes === 0)).toBe(true)
  })

  it('percentuais somam exatamente 100, mesmo em divisão que não fecha', () => {
    // 1/3 para cada: arredondar isolado daria 99.
    const result = tally({ [a]: 1, [b]: 1, [c]: 1 })
    expect(sum(result.rows.map(row => row.percent))).toBe(100)
  })

  it('o ponto que sobra vai para a maior fração, com empate pela ordem da lista', () => {
    const result = tally({ [a]: 1, [b]: 1, [c]: 1 })
    expect(result.rows.slice(0, 3).map(row => row.percent)).toEqual([34, 33, 33])
  })

  it('unanimidade é 100% para um e zero para o resto', () => {
    const result = tally({ [b]: 7 })
    expect(result.rows.find(row => row.id === b)?.percent).toBe(100)
    expect(sum(result.rows.map(row => row.percent))).toBe(100)
  })

  it('ignora votos em opções que saíram da lista', () => {
    const result = tally({ [a]: 3, 'feature-aposentada': 50 })
    expect(result.total).toBe(3)
    expect(result.rows.find(row => row.id === a)?.percent).toBe(100)
  })

  it('mantém a ordem da lista em vez de ordenar pelo placar', () => {
    const result = tally({ [c]: 10, [a]: 1 })
    expect(result.rows.map(row => row.id)).toEqual(voteFeatures.map(feature => feature.id))
  })

  it('ignora contagem negativa ou quebrada vinda do banco', () => {
    const result = tally({ [a]: -4, [b]: 2.9 })
    expect(result.total).toBe(2)
  })
})
