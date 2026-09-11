import { describe, expect, it } from 'vitest'
import { THEME_SCRIPT, resolveTheme, type ThemePreference } from './theme'

/** Executa o script do <head> com um navegador de mentira e devolve o tema que ele aplicou. */
function runHeadScript(getItem: () => string | null, systemPrefersLight: boolean) {
  const root = { dataset: {} as Record<string, string> }
  const run = new Function('localStorage', 'matchMedia', 'document', THEME_SCRIPT)
  run({ getItem }, () => ({ matches: systemPrefersLight }), { documentElement: root })
  return root.dataset.theme
}

describe('tema', () => {
  it('o automático segue o sistema', () => {
    expect(resolveTheme('system', true)).toBe('light')
    expect(resolveTheme('system', false)).toBe('dark')
  })

  it('escolha explícita ignora o sistema', () => {
    expect(resolveTheme('dark', true)).toBe('dark')
    expect(resolveTheme('light', false)).toBe('light')
  })

  it('o script do <head> concorda com resolveTheme em todas as combinações', () => {
    for (const preference of ['dark', 'light', 'system'] as ThemePreference[]) {
      for (const systemPrefersLight of [true, false]) {
        expect(runHeadScript(() => preference, systemPrefersLight)).toBe(resolveTheme(preference, systemPrefersLight))
      }
    }
  })

  it('sem preferência salva, ou com valor desconhecido, vale o escuro', () => {
    expect(runHeadScript(() => null, true)).toBe('dark')
    expect(runHeadScript(() => 'azul', true)).toBe('dark')
  })

  it('armazenamento bloqueado não quebra a página', () => {
    expect(() => runHeadScript(() => { throw new Error('bloqueado') }, true)).not.toThrow()
  })
})
