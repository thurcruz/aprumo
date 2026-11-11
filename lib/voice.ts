import { DEFAULT_PRI_VOICE, isPriVoice, type PriVoice } from './priVoices'

/**
 * Voz da Pri: ouvir com o reconhecimento de fala do navegador (só o texto vai
 * para o servidor) e falar com a voz natural da OpenAI, com a síntese do
 * navegador como reserva.
 * As funções puras ficam no topo para os testes; o resto só roda no cliente
 * (exceto cleanForSpeech, que o servidor também usa antes de gerar o áudio).
 */

// ---------------------------------------------------------------------------
// Texto

/** Tira do texto o que não se fala: markdown, links, emojis e símbolos soltos. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_`#>~|]/g, '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/^\s*[-•]\s+/gm, '')
    // Travessão solto vira pausa.
    .replace(/\s+[-–—]\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Quebra em frases para a fila de fala. O Chrome corta falas longas no meio
 * (por volta de 15 s); frases curtas em sequência evitam o corte.
 */
export function splitSentences(text: string, max = 220): string[] {
  const sentences = text.match(/[^.!?…]+[.!?…]*\s*/g)?.map(part => part.trim()).filter(Boolean) ?? []
  return sentences.flatMap(sentence => {
    if (sentence.length <= max) return [sentence]
    const words = sentence.split(' ')
    const chunks: string[] = []
    let current = ''
    for (const word of words) {
      if ((current + ' ' + word).trim().length > max && current) { chunks.push(current); current = word }
      else current = (current + ' ' + word).trim()
    }
    if (current) chunks.push(current)
    return chunks
  })
}

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()

/** Resposta falada a uma confirmação: 'yes', 'no' ou null quando não é nem um nem outro. */
export function voiceDecision(text: string): 'yes' | 'no' | null {
  const said = normalize(text)
  if (!said) return null
  if (/^(nao|cancela|cancelar|deixa|esquece|para|pare)\b/.test(said)) return 'no'
  if (/^(sim|confirma|confirmar|confirmo|pode|ok|okay|isso|claro|manda|faz|fechado|beleza|certo)\b/.test(said)) return 'yes'
  return null
}

// ---------------------------------------------------------------------------
// Navegador: reconhecimento

/** O mínimo da Web Speech API que usamos — os tipos não vêm no TypeScript. */
export interface RecognitionResultEvent { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }
export interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((event: RecognitionResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionConstructor = new () => Recognition

export function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const scope = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// ---------------------------------------------------------------------------
// Preferência de voz (fica no aparelho)

const VOICE_KEY = 'aprumo-pri-voice'
const VOICE_EVENT = 'aprumo-pri-voice-change'

export function readPriVoice(): PriVoice {
  try {
    const saved = localStorage.getItem(VOICE_KEY)
    return isPriVoice(saved) ? saved : DEFAULT_PRI_VOICE
  } catch {
    return DEFAULT_PRI_VOICE
  }
}

export function savePriVoice(voice: PriVoice): void {
  try { localStorage.setItem(VOICE_KEY, voice) } catch { /* sem armazenamento: vale a voz padrão */ }
  window.dispatchEvent(new Event(VOICE_EVENT))
}

export function subscribePriVoice(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => { if (event.key === VOICE_KEY) onChange() }
  window.addEventListener(VOICE_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(VOICE_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

// ---------------------------------------------------------------------------
// Navegador: fala

/** Vozes femininas em português do Brasil, na ordem em que soam melhor nos sistemas comuns. */
const PREFERRED = ['luciana', 'google português do brasil', 'francisca', 'thalita', 'maria', 'vitoria']

export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const brazilian = voices.filter(voice => voice.lang.replace('_', '-').toLowerCase().startsWith('pt-br'))
  const portuguese = brazilian.length ? brazilian : voices.filter(voice => voice.lang.toLowerCase().startsWith('pt'))
  for (const name of PREFERRED) {
    const found = portuguese.find(voice => voice.name.toLowerCase().includes(name))
    if (found) return found
  }
  return portuguese.find(voice => voice.localService) ?? portuguese[0] ?? null
}

/** WAV de 44 bytes, sem som: tocado num toque, destrava o áudio no iOS. */
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

/** Um player só, reaproveitado: no iOS, o elemento destravado por um toque continua podendo tocar depois. */
let player: HTMLAudioElement | null = null
const getPlayer = () => (player ??= new Audio())

/** Cada fala ganha um número; uma fala cancelada ou substituída não toca quando o áudio chega. */
let speechId = 0
let finishCurrent: (() => void) | null = null

/**
 * O iOS só deixa tocar áudio depois de um toque. Chamar isto no toque do
 * microfone destrava o player (e a síntese do navegador, usada como reserva)
 * para a resposta que chega depois.
 */
export function unlockSpeech(): void {
  if (typeof window === 'undefined') return
  const audio = getPlayer()
  audio.src = SILENCE
  audio.play().catch(() => { /* sem toque ainda: a próxima tentativa destrava */ })
  if (canSpeak()) {
    const silent = new SpeechSynthesisUtterance(' ')
    silent.volume = 0
    window.speechSynthesis.speak(silent)
  }
}

/** Para a fala em curso na hora. O `onEnd` dela roda, como se tivesse terminado. */
export function stopSpeaking(): void {
  speechId++
  player?.pause()
  if (canSpeak()) window.speechSynthesis.cancel()
  const finish = finishCurrent
  finishCurrent = null
  finish?.()
}

/** Reserva: a voz do próprio navegador, frase por frase. */
function speakWithBrowser(text: string, onStart: () => void, finish: () => void): void {
  const parts = splitSentences(text)
  if (!canSpeak() || parts.length === 0) { finish(); return }
  const synth = window.speechSynthesis
  synth.cancel()
  const voice = pickVoice(synth.getVoices())
  parts.forEach((part, index) => {
    const utterance = new SpeechSynthesisUtterance(part)
    utterance.lang = voice?.lang ?? 'pt-BR'
    if (voice) utterance.voice = voice
    utterance.rate = 1.03
    utterance.pitch = 1.04
    if (index === 0) utterance.onstart = onStart
    if (index === parts.length - 1) utterance.onend = finish
    utterance.onerror = finish
    synth.speak(utterance)
  })
}

/**
 * Fala o texto com a voz natural da Pri (OpenAI, via /api/pri/speech). Se a voz
 * do servidor falhar, cai para a do navegador. `onStart` roda quando o som
 * começa; `onEnd`, uma vez só — ao terminar, falhar ou ser interrompida.
 */
export function speak(text: string, { onStart, onEnd, voice }: { onStart?: () => void; onEnd?: () => void; voice?: PriVoice } = {}): void {
  stopSpeaking()
  const clean = cleanForSpeech(text)
  if (!clean || typeof window === 'undefined') { onEnd?.(); return }

  const id = ++speechId
  let finished = false
  let objectUrl: string | null = null
  const finish = () => {
    if (finished) return
    finished = true
    if (finishCurrent === finish) finishCurrent = null
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    onEnd?.()
  }
  finishCurrent = finish
  const started = () => { if (id === speechId) onStart?.() }

  fetch('/api/pri/speech', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: clean, voice: voice ?? readPriVoice() }) })
    .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.blob() })
    .then(blob => {
      if (id !== speechId) return
      const audio = getPlayer()
      objectUrl = URL.createObjectURL(blob)
      audio.onplaying = started
      audio.onended = finish
      audio.onerror = finish
      audio.src = objectUrl
      return audio.play()
    })
    .catch(() => {
      if (id !== speechId || finished) return
      speakWithBrowser(clean, started, finish)
    })
}
