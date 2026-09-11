'use client'

import type { FocusSession } from './types'

/**
 * Tempo mínimo para uma sessão valer um compartilhamento.
 * Interromper cedo acontece; oferecer "compartilhe seus 2 minutos" só constrange.
 */
export const SHAREABLE_MINUTES = 5

/** A sessão rendeu o bastante para ser mostrada? Interromper não desqualifica. */
export function isShareable(session: FocusSession): boolean {
  return session.actualSeconds >= SHAREABLE_MINUTES * 60
}

/** Texto curto de uma sessão, do jeito que se manda para alguém. */
export function sessionText(session: FocusSession): string {
  const minutes = Math.round(session.actualSeconds / 60)
  const what = session.name.trim()
  return what
    ? `${minutes} min de foco em "${what}". Feito no Aprumo.`
    : `${minutes} min de foco. Feito no Aprumo.`
}

/**
 * Compartilha pelo menu nativo quando existe (celular), com a área de
 * transferência como plano B. Devolve o que aconteceu para a interface avisar.
 */
export async function shareSession(session: FocusSession): Promise<'shared' | 'copied' | 'failed'> {
  const text = sessionText(session)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: 'Aprumo · Modo Foco', text })
      return 'shared'
    } catch (error) {
      // Cancelar o menu nativo não é falha: o usuário mudou de ideia.
      if (error instanceof DOMException && error.name === 'AbortError') return 'failed'
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1920
const INK = '#f7f7f2'
const ENERGY = '#d0e027'
const BACKGROUND = '#11130f'

/**
 * Desenha o card da sessão no formato de stories (1080×1920).
 *
 * Tudo é desenhado à mão no canvas em vez de renderizar HTML: não há
 * dependência externa, e o resultado é idêntico em qualquer navegador.
 */
export function drawSessionCard(canvas: HTMLCanvasElement, session: FocusSession, userName?: string): void {
  const context = canvas.getContext('2d')
  if (!context) return
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT

  context.fillStyle = BACKGROUND
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  const centerX = CARD_WIDTH / 2
  const centerY = 820
  const radius = 300

  // O anel mostra o que aconteceu de verdade: cheio se foi até o fim,
  // parcial se a sessão foi interrompida no meio.
  const planned = Math.max(1, session.plannedMinutes * 60)
  const ratio = Math.max(0.02, Math.min(1, session.actualSeconds / planned))

  context.lineWidth = 26
  context.strokeStyle = 'rgba(255,255,255,.07)'
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  context.stroke()

  context.strokeStyle = ENERGY
  context.lineCap = 'round'
  context.beginPath()
  context.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
  context.stroke()

  const minutes = Math.round(session.actualSeconds / 60)
  context.textAlign = 'center'

  context.fillStyle = ENERGY
  context.font = '600 34px system-ui, sans-serif'
  context.fillText('TEMPO DE FOCO', centerX, centerY - 110)

  context.fillStyle = INK
  context.font = '700 260px system-ui, sans-serif'
  context.fillText(String(minutes), centerX, centerY + 90)

  context.fillStyle = 'rgba(247,247,242,.55)'
  context.font = '400 44px system-ui, sans-serif'
  context.fillText('minutos', centerX, centerY + 170)

  // O que a pessoa fez, quebrado em até duas linhas para não estourar o card.
  const what = session.name.trim()
  if (what) {
    context.fillStyle = INK
    context.font = '600 60px system-ui, sans-serif'
    for (const [index, line] of wrap(context, what, CARD_WIDTH - 200, 2).entries()) {
      context.fillText(line, centerX, 1310 + index * 76)
    }
  }

  if (userName?.trim()) {
    context.fillStyle = 'rgba(247,247,242,.45)'
    context.font = '400 40px system-ui, sans-serif'
    context.fillText(userName.trim(), centerX, what ? 1480 : 1400)
  }

  context.fillStyle = ENERGY
  context.font = '700 46px system-ui, sans-serif'
  context.fillText('APRUMO', centerX, 1740)
  context.fillStyle = 'rgba(247,247,242,.4)'
  context.font = '400 32px system-ui, sans-serif'
  context.fillText('Presença antes de velocidade', centerX, 1796)
}

/** Quebra o texto em linhas que cabem na largura, cortando o excesso com reticências. */
function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    line = word
    if (lines.length === maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines && context.measureText(text).width > maxWidth * maxLines) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, '')}…`
  }
  return lines
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

/**
 * Manda a imagem pelo menu nativo quando o navegador aceita arquivos;
 * caso contrário salva o PNG, que é o que dá para fazer no desktop.
 */
export async function shareImage(blob: Blob, session: FocusSession): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], 'aprumo-foco.png', { type: 'image/png' })
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: sessionText(session) })
      return 'shared'
    } catch { /* Cancelou ou não deu: salvar continua valendo. */ }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'aprumo-foco.png'
  link.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
