/**
 * As vozes da Pri (texto-para-fala da OpenAI). Puro e compartilhado: o
 * servidor valida a escolha, e Configurações mostra a lista.
 */

export const PRI_VOICES = [
  { id: 'marin', label: 'Marin' },
  { id: 'cedar', label: 'Cedar' },
  { id: 'coral', label: 'Coral' },
  { id: 'sage', label: 'Sage' },
  { id: 'shimmer', label: 'Shimmer' },
  { id: 'ash', label: 'Ash' },
] as const

export type PriVoice = (typeof PRI_VOICES)[number]['id']

export const DEFAULT_PRI_VOICE: PriVoice = 'marin'

export function isPriVoice(value: unknown): value is PriVoice {
  return typeof value === 'string' && PRI_VOICES.some(voice => voice.id === value)
}

/** Como a Pri fala — vale para qualquer voz escolhida. */
export const PRI_VOICE_STYLE = 'Fale em português do Brasil, com sotaque brasileiro natural. Tom caloroso, calmo e confiante, como uma assistente pessoal próxima. Ritmo natural, sem pressa, com pausas curtas entre as frases.'

/** Frase usada para ouvir a voz antes de escolher. */
export const PRI_VOICE_SAMPLE = 'Oi, eu sou a Pri. Vamos organizar o seu dia?'

/** Texto máximo por fala: respostas de voz são curtas; isto só barra abuso. */
export const PRI_SPEECH_MAX_CHARS = 1200
