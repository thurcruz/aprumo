'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, Image as ImageIcon, Share2, UsersRound } from 'lucide-react'
import type { FocusSession } from '@/lib/types'
import { canvasToBlob, drawSessionCard, sessionText, shareImage, shareSession } from '@/lib/share'
import { publishFocusSession } from '@/lib/feed'
import Button from '@/components/ui/Button'
import Sheet from '@/components/ui/Sheet'
import { ToggleRow } from '@/components/ui/Switch'

type Status = 'idle' | 'shared' | 'copied' | 'downloaded' | 'failed'
type PostStatus = 'idle' | 'busy' | 'done' | 'failed'

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

  const [showName, setShowName] = useState(false)
  const [postStatus, setPostStatus] = useState<PostStatus>('idle')
  const [postError, setPostError] = useState('')

  // O card é desenhado uma vez, e o mesmo canvas serve de prévia e de origem do PNG.
  // O Sheet entra no DOM um instante depois (portal), por isso o desenho espera o canvas existir.
  useEffect(() => {
    let frame = 0
    const draw = () => {
      if (canvas.current) drawSessionCard(canvas.current, session, userName)
      else frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
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

  async function onPublish() {
    setPostStatus('busy')
    setPostError('')
    const result = await publishFocusSession(session.id, showName)
    if (result.ok) setPostStatus('done')
    else { setPostStatus('failed'); setPostError(result.error) }
  }

  return <Sheet managed onClose={onClose} size="sm" eyebrow="Compartilhar" title="Mostre o que você fez">
    <div className="mx-auto max-w-60 overflow-hidden rounded-card border border-line">
      <canvas ref={canvas} className="block w-full" style={{ aspectRatio: '1080 / 1920' }} aria-label="Prévia do card da sessão"/>
    </div>

    <p className="mt-4 rounded-control border border-line bg-surface-2 p-3 text-caption text-fg-2">{sessionText(session)}</p>

    <div className="mt-4 grid gap-2">
      <Button fullWidth onClick={onShareImage} disabled={busy} icon={<ImageIcon size={16}/>}>Imagem para stories</Button>
      <Button fullWidth variant="secondary" onClick={onShareText} disabled={busy} icon={canShare ? <Share2 size={16}/> : <Copy size={16}/>}>
        {canShare ? 'Compartilhar texto' : 'Copiar texto'}
      </Button>
    </div>

    {status !== 'idle' && <p className={`mt-3 flex items-center justify-center gap-1.5 text-caption ${status === 'failed' ? 'text-alert' : 'text-fg-1'}`}>
      {status === 'failed' ? null : status === 'downloaded' ? <Download size={13}/> : <Check size={13}/>}
      {messages[status]}
    </p>}

    <div className="mt-5 border-t border-line pt-5">
      <ToggleRow checked={showName} onChange={value => { if (postStatus !== 'done') setShowName(value) }} title="Mostrar no que focou"
        description="O nome da sessão aparece na publicação."/>
      <Button fullWidth variant="secondary" className="mt-3" onClick={onPublish} disabled={postStatus === 'done'} loading={postStatus === 'busy'}
        icon={postStatus === 'done' ? <Check size={16}/> : <UsersRound size={16}/>}>
        {postStatus === 'done' ? 'Publicado na comunidade' : 'Publicar na comunidade'}
      </Button>
      {postStatus === 'failed' && <p className="mt-2 text-center text-caption text-alert">{postError}</p>}
    </div>
  </Sheet>
}
