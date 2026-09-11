import { describe, expect, it } from 'vitest'
import { capitalizeFirst, formatHours } from './utils'

describe('formatação', () => {
  it('horas com vírgula decimal e espaço antes do h', () => {
    expect(formatHours(7.5)).toBe('7,5 h')
    expect(formatHours(7)).toBe('7 h')
    expect(formatHours(6.8666)).toBe('6,9 h')
  })

  it('maiúscula só na primeira letra', () => {
    expect(capitalizeFirst('setembro de 2026')).toBe('Setembro de 2026')
    expect(capitalizeFirst('7 – 13 de setembro')).toBe('7 – 13 de setembro')
    expect(capitalizeFirst('')).toBe('')
  })
})
