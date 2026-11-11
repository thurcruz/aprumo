/**
 * A matemática do temporizador radial: quanto de cada traço está aceso, onde
 * cada traço fica no círculo e como o tempo é escrito. Sem DOM, para ser testada.
 */

export interface SegmentGeometry {
  /** Ponto interno e externo do traço, em coordenadas do viewBox. */
  x1: number; y1: number; x2: number; y2: number
}

/**
 * Quanto de cada traço está aceso para um progresso de 0 a 1. O traço onde o
 * progresso está acende parcialmente — é o que faz o anel encher de forma
 * contínua em vez de pular de traço em traço.
 */
export function segmentFills(progress: number, count: number): number[] {
  const lit = clamp01(progress) * count
  return Array.from({ length: count }, (_, index) => Math.min(1, Math.max(0, lit - index)))
}

/**
 * Posição dos traços, do topo no sentido horário. A geometria não depende do
 * progresso (coordenadas de SVG não fazem transição): o comprimento só ondula
 * de leve ao redor do círculo, o bastante para dar profundidade.
 */
export function radialSegments({ count, size, radius, length }: { count: number; size: number; radius: number; length: number }): SegmentGeometry[] {
  const center = size / 2
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2
    const ripple = 1 + 0.06 * Math.sin((index / count) * Math.PI * 6)
    const inner = radius - length * ripple
    const cos = Math.cos(angle), sin = Math.sin(angle)
    return {
      x1: round(center + cos * inner), y1: round(center + sin * inner),
      x2: round(center + cos * radius), y2: round(center + sin * radius),
    }
  })
}

/**
 * A "cabeça" do tempo que avança: os últimos traços acesos ganham um pouco de
 * ênfase (1 no mais recente, decaindo). Parado no zero ou com o anel fechado,
 * ninguém se destaca.
 */
export function headEmphasis(progress: number, count: number, span = 3): number[] {
  const p = clamp01(progress)
  const head = p * count
  return Array.from({ length: count }, (_, index) => {
    if (p <= 0 || p >= 1) return 0
    const behind = head - index
    return behind > 0 && behind <= span ? round(1 - (Math.ceil(behind) - 1) / span) : 0
  })
}

/** "25:42"; com uma hora ou mais, "1:05:00". Segundos negativos contam como zero. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** "30 min", "1h", "2h 10min" — minutos de foco numa linha. */
export function formatFocusMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60), m = total % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
