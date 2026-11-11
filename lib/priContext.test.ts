import { describe, expect, it } from 'vitest'
import { isPriScreen, PRI_SCREEN_HINTS, PRI_SCREENS, priContextFor } from './priContext'
import { cleanForSpeech, pickVoice, splitSentences, voiceDecision } from './voice'

describe('contexto da Pri por tela', () => {
  it('cada área abre o seu assunto, inclusive nas subpáginas', () => {
    expect(priContextFor('/financas').screen).toBe('financas')
    expect(priContextFor('/treino').screen).toBe('saude')
    expect(priContextFor('/saude/sono').screen).toBe('saude')
    expect(priContextFor('/agenda').screen).toBe('hoje')
    expect(priContextFor('/foco').screen).toBe('foco')
    expect(priContextFor('/perfil').screen).toBe('evolucao')
    expect(priContextFor('/planos').screen).toBe('planos')
    expect(priContextFor('/emocional').screen).toBe('hoje')
  })

  it('tela sem assunto próprio cai no geral', () => {
    expect(priContextFor('/configuracoes').screen).toBe('geral')
    expect(priContextFor('/financeiro-antigo').screen).toBe('geral')
  })

  it('toda tela tem rótulo, sugestões e dica para o modelo', () => {
    for (const screen of PRI_SCREENS) {
      expect(isPriScreen(screen)).toBe(true)
      expect(typeof PRI_SCREEN_HINTS[screen]).toBe('string')
    }
    expect(priContextFor('/financas').suggestions.length).toBeGreaterThan(0)
  })

  it('o servidor só aceita telas conhecidas', () => {
    expect(isPriScreen('financas')).toBe(true)
    expect(isPriScreen('admin')).toBe(false)
    expect(isPriScreen(42)).toBe(false)
  })
})

describe('texto para falar', () => {
  it('tira markdown, links e emojis', () => {
    expect(cleanForSpeech('**Pronto!** Veja [aqui](https://x.com) 🔥 - item')).toBe('Pronto! Veja aqui, item')
  })

  it('quebra em frases curtas', () => {
    expect(splitSentences('Oi. Tudo bem? Registrei!')).toEqual(['Oi.', 'Tudo bem?', 'Registrei!'])
    const long = splitSentences(`${'palavra '.repeat(60)}fim.`, 100)
    expect(long.every(part => part.length <= 100)).toBe(true)
  })

  it('entende sim e não falados', () => {
    expect(voiceDecision('Sim, pode registrar')).toBe('yes')
    expect(voiceDecision('confirmar')).toBe('yes')
    expect(voiceDecision('Não, cancela')).toBe('no')
    expect(voiceDecision('quanto gastei esse mês')).toBeNull()
  })

  it('escolhe uma voz brasileira', () => {
    const voice = (name: string, lang: string, localService = true) => ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice
    expect(pickVoice([voice('Samantha', 'en-US'), voice('Joana', 'pt-PT'), voice('Luciana', 'pt-BR')])?.name).toBe('Luciana')
    expect(pickVoice([voice('Joana', 'pt-PT')])?.name).toBe('Joana')
    expect(pickVoice([voice('Samantha', 'en-US')])).toBeNull()
  })
})
