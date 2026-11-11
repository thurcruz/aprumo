/**
 * A matemática dos gráficos do Design System — sparkline, barras, heatmap e
 * variação. Fica fora dos componentes para ser testada sem DOM e para que
 * todos os gráficos do Aprumo meçam do mesmo jeito.
 */

export interface Point { x: number; y: number }

export interface SparklineGeometry {
  /** Traço da linha; valores nulos interrompem o traço em vez de virar zero. */
  line: string
  /** Área sob a linha, fechada na base — vazia quando há buracos ou menos de 2 pontos. */
  area: string
  points: (Point | null)[]
}

const round = (value: number) => Math.round(value * 100) / 100

/**
 * Desenha uma série num retângulo `width × height`. Sem `min`/`max`, a escala
 * vem dos próprios valores; série constante vira uma linha no meio, não no chão.
 */
export function sparklinePath(values: (number | null)[], width: number, height: number, options: { min?: number; max?: number; padding?: number } = {}): SparklineGeometry {
  const padding = options.padding ?? 2
  const known = values.filter((value): value is number => value !== null && Number.isFinite(value))
  if (known.length === 0) return { line: '', area: '', points: values.map(() => null) }
  const min = options.min ?? Math.min(...known)
  const max = options.max ?? Math.max(...known)
  const span = max - min
  const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0
  const innerHeight = height - padding * 2

  const points = values.map((value, index): Point | null => {
    if (value === null || !Number.isFinite(value)) return null
    const ratio = span === 0 ? 0.5 : (Math.min(max, Math.max(min, value)) - min) / span
    return { x: round(padding + stepX * index + (values.length === 1 ? (width - padding * 2) / 2 : 0)), y: round(padding + innerHeight * (1 - ratio)) }
  })

  let line = ''
  let previous: Point | null = null
  for (const point of points) {
    if (point) line += `${previous ? 'L' : 'M'}${point.x} ${point.y}`
    previous = point
  }

  const continuous = points.every(Boolean) && points.length > 1
  const first = points[0], last = points[points.length - 1]
  const area = continuous && first && last ? `${line}L${last.x} ${height}L${first.x} ${height}Z` : ''
  return { line, area, points }
}

/** Altura de cada barra (0–1) contra o maior valor, ou contra `max` quando há meta. Nulo continua nulo. */
export function barRatios(values: (number | null)[], max?: number): (number | null)[] {
  const ceiling = max ?? Math.max(0, ...values.filter((value): value is number => value !== null))
  return values.map(value => value === null ? null : ceiling <= 0 ? 0 : Math.min(1, Math.max(0, value / ceiling)))
}

export type HeatLevel = 0 | 1 | 2 | 3 | 4

/**
 * Intensidade do quadrado no mapa. `null` = nada era devido (não é falha);
 * 0 = havia o que fazer e nada foi feito; 4 = dia cumprido por inteiro.
 * Mesmos cortes que o mapa de constância já usava em /perfil.
 */
export function heatLevel(ratio: number | null): HeatLevel | null {
  if (ratio === null) return null
  if (ratio <= 0) return 0
  if (ratio < 0.34) return 1
  if (ratio < 0.67) return 2
  if (ratio < 1) return 3
  return 4
}

/** Porcentagem inteira de `value` sobre `max`, presa entre 0 e 100. */
export function percentOf(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0
  return Math.min(100, Math.max(0, Math.round(value / max * 100)))
}

export type DeltaDirection = 'up' | 'down' | 'flat' | 'none'

/**
 * "+12%", "−3 min", "igual". Usa o sinal de menos tipográfico e vírgula decimal.
 * `null` significa "sem base para comparar" — não é zero.
 */
export function formatDelta(delta: number | null, unit = ''): { direction: DeltaDirection; text: string } {
  if (delta === null || !Number.isFinite(delta)) return { direction: 'none', text: 'sem base' }
  if (delta === 0) return { direction: 'flat', text: 'igual' }
  const amount = Math.abs(delta).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return { direction: delta > 0 ? 'up' : 'down', text: `${delta > 0 ? '+' : '−'}${amount}${unit}` }
}

/** Número em pt-BR com casas decimais opcionais: 2840 → "2.840", 4.25 → "4,3". */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}
