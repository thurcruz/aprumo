import { describe, expect, it } from 'vitest'
import { EXTENSION_IDS, EXTENSIONS, isExtensionActive, parseExtensionChoices } from './extensions'

const empty = { transactions: [], financialGoals: [], workouts: [], workoutLogs: [], sleep: [], books: [], repertoire: [], notes: [], addictions: [] }

describe('extensões', () => {
  it('sem escolha e sem uso, fica desligada', () => {
    for (const id of EXTENSION_IDS) expect(isExtensionActive(id, {}, empty)).toBe(false)
  })

  it('sem escolha, quem já registrava continua com a extensão ativa', () => {
    const withSleep = { ...empty, sleep: [{ id: 's', date: '2026-09-16', hours: 7, quality: 4 as const }] }
    expect(isExtensionActive('treino', {}, withSleep)).toBe(true)
    expect(isExtensionActive('financas', {}, withSleep)).toBe(false)
  })

  it('a escolha explícita vence o uso', () => {
    const withAddiction = { ...empty, addictions: [{} as never] }
    expect(isExtensionActive('antivicio', { antivicio: false }, withAddiction)).toBe(false)
    expect(isExtensionActive('financas', { financas: true }, empty)).toBe(true)
  })

  it('só aceita chaves conhecidas com valor booleano', () => {
    expect(parseExtensionChoices({ financas: true, treino: 'sim', admin: true })).toEqual({ financas: true })
    expect(parseExtensionChoices(null)).toEqual({})
    expect(parseExtensionChoices([true])).toEqual({})
  })

  it('o catálogo cobre cada extensão uma vez, com ao menos uma página', () => {
    expect(EXTENSIONS.map(item => item.id).sort()).toEqual([...EXTENSION_IDS].sort())
    for (const item of EXTENSIONS) expect(item.pages.length).toBeGreaterThan(0)
  })
})
