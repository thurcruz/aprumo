'use client'

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { cx } from '@/lib/cx'
import { duration, ease } from '@/lib/motion'
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/useMediaQuery'
import IconButton from './IconButton'

const widths = { sm: 'md:max-w-sm', md: 'md:max-w-md', lg: 'md:max-w-xl' }
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
const noopSubscribe = () => () => {}

/**
 * A camada sobreposta do Aprumo. No celular é um bottom sheet — sobe de baixo,
 * fica ao alcance do polegar e fecha arrastando para baixo; no desktop é um
 * modal centralizado. Um componente só, para as telas nunca decidirem isso
 * cada uma do seu jeito.
 *
 * Controlado: quem abre decide `open`; o Sheet cuida da animação de saída.
 * Diálogos que o pai monta e desmonta dentro de um <AnimatePresence> usam
 * `managed`: aí quem anima a saída é o AnimatePresence do pai.
 */
export default function Sheet({ open = false, managed, onClose, title, description, eyebrow, footer, size = 'md', children }: {
  open?: boolean
  managed?: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  eyebrow?: string
  /** Ações fixas embaixo (Salvar, Cancelar) — continuam visíveis quando o conteúdo rola. */
  footer?: ReactNode
  size?: keyof typeof widths
  children?: ReactNode
}) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const reduce = useReducedMotion()
  const drag = useDragControls()
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  // Guardado num ref para o efeito não reinscrever a cada render do pai.
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  const active = open || Boolean(managed)

  useEffect(() => {
    if (!active) return
    const opener = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => {
      // Um campo com autoFocus já pegou o foco: não roubar.
      if (panel.current?.contains(document.activeElement)) return
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current
      first?.focus()
    })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current(); return }
      if (event.key !== 'Tab' || !panel.current) return
      // Mantém o Tab dentro do sheet enquanto ele estiver aberto.
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (items.length === 0) { event.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      opener?.focus?.()
    }
  }, [active])

  if (!mounted) return null

  const panelMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : desktop
      ? { initial: { opacity: 0, scale: 0.97, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: 8 } }
      : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }

  const layer = active && <motion.div key="sheet" className="fixed inset-0 z-[90] flex items-end justify-center md:items-center md:p-6"
      initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 1 }} transition={{ duration: duration.slow }}>
      <motion.div aria-hidden className="absolute inset-0 bg-black/60" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: duration.base }}/>
      <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        {...panelMotion} transition={{ duration: duration.slow, ease }}
        drag={desktop || reduce ? false : 'y'} dragControls={drag} dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose() }}
        className={cx('relative flex max-h-[92svh] w-full flex-col overflow-hidden border border-line bg-surface-3 text-fg-1 shadow-overlay outline-none',
          'rounded-t-sheet md:rounded-sheet', widths[size])}>
        {/* A alça e o cabeçalho são a área de arrastar: o conteúdo continua rolando normalmente. */}
        <div onPointerDown={event => { if (!desktop) drag.start(event) }} className="shrink-0 touch-none px-5 pt-2 md:touch-auto md:px-6 md:pt-6">
          <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-line-strong md:hidden"/>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 pt-1">
              {eyebrow && <p className="text-label uppercase text-fg-3">{eyebrow}</p>}
              <h2 id={titleId} className="mt-0.5 text-h2 text-fg-1">{title}</h2>
              {description && <div className="mt-1 text-body-s text-fg-2">{description}</div>}
            </div>
            <IconButton label="Fechar" size="sm" onClick={onClose} className="-mr-1"><X size={18}/></IconButton>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4 md:px-6 md:pb-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:px-6 md:pb-5">{footer}</div>}
        {!footer && <div aria-hidden className="h-[env(safe-area-inset-bottom)] shrink-0"/>}
      </motion.div>
    </motion.div>

  return createPortal(managed ? layer : <AnimatePresence>{layer}</AnimatePresence>, document.body)
}
