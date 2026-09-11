'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Download, Image as ImageIcon, Share2, X } from 'lucide-react'
import type { FocusSession } from '@/lib/types'
import { canvasToBlob, drawSessionCard, sessionText, shareImage, shareSession } from '@/lib/share'

type Status = 'idle' | 'shared' | 'copied' | 'downloaded' | 'failed'

const messages: Record<Exclude<Status, 'idle'>, string> = {
  shared: 'Compartilhado.',
  copied: 'Texto copiado.',
  downloaded: 'Imagem salva.',
  failed: 'Não foi possível compartilhar.',
}

/** Compartilha uma sessão concluída: como texto ou como card de stories. */
export default function ShareSessionDialog({ session, userName, onClose }: {
  session: FocusSession
  userName?: string
  onClose: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [busy, setBusy] = useState(false)
  /** No servidor não há navigator; o rótulo assume "copiar" até a hidratação. */
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  // O card é desenhado uma vez, e o mesmo canvas serve de prévia e de origem do PNG.
  useEffect(() => {
    if (canvas.current) drawSessionCard(canvas.current, session, userName)
  }, [session, userName])

  async function onShareText() {
    setBusy(true)
    setStatus(await shareSession(session))
    setBusy(false)
  }

  async function onShareImage() {
    if (!canvas.current) return
    setBusy(true)
    const blob = await canvasToBlob(canvas.current)
    setStatus(blob ? await shareImage(blob, session) : 'failed')
    setBusy(false)
  }

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
    <motion.div initial={{ scale: .96, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 15 }}
      className="surface my-auto w-full max-w-sm p-6" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Compartilhar</p>
          <h2 className="mt-1 text-2xl font-semibold">Mostre o que você fez</h2>
        </div>
        <button className="icon-button shrink-0" onClick={onClose} aria-label="Fechar"><X size={17}/></button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--line)' }}>
        <canvas ref={canvas} className="block w-full" style={{ aspectRatio: '1080 / 1920' }} aria-label="Prévia do card da sessão"/>
      </div>

      <p className="muted mt-4 rounded-2xl border p-3 text-xs" style={{ borderColor: 'var(--line)' }}>{sessionText(session)}</p>

      <div className="mt-4 grid gap-2">
        <button onClick={onShareImage} disabled={busy} className="energy-button flex items-center justify-center gap-2 py-3 text-sm" style={{ opacity: busy ? .6 : 1 }}>
          <ImageIcon size={16}/> Imagem para stories
        </button>
        <button onClick={onShareText} disabled={busy} className="flex items-center justify-center gap-2 rounded-full border py-3 text-sm" style={{ borderColor: 'var(--line)', opacity: busy ? .6 : 1 }}>
          {canShare ? <><Share2 size={16}/> Compartilhar texto</> : <><Copy size={16}/> Copiar texto</>}
        </button>
      </div>

      {status !== 'idle' && <p className="mt-3 flex items-center justify-center gap-1.5 text-xs" style={{ color: status === 'failed' ? 'var(--danger)' : 'var(--accent)' }}>
        {status === 'failed' ? null : status === 'downloaded' ? <Download size={13}/> : <Check size={13}/>}
        {messages[status]}
      </p>}
    </motion.div>
  </motion.div>
}
