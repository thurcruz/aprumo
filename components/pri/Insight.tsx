'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import IconButton from '@/components/ui/IconButton'
import { cx } from '@/lib/cx'
import { enter } from '@/lib/motion'

export type InsightTone = 'neutral' | 'celebrate' | 'alert'

export interface InsightProps {
  children: ReactNode
  tone?: InsightTone
  /** Até dois botões (Button size="sm"). Mais que isso vira tela, não insight. */
  actions?: ReactNode
  /** Letra miúda: período, amostra, "correlação, não causa". */
  footnote?: ReactNode
  onDismiss?: () => void
  className?: string
}

/**
 * Uma leitura dos dados, em uma ou duas frases, com ação opcional. A versão
 * neutra serve a qualquer tela; a da Pri é o PriInsight.
 */
export function Insight({ label, mark, tone = 'neutral', children, actions, footnote, onDismiss, className }: InsightProps & { label: string; mark?: ReactNode }) {
  const reduce = useReducedMotion()
  return <motion.aside {...(reduce ? {} : enter)}
    className={cx('rounded-card border bg-surface-1 p-4 md:p-5', tone === 'alert' ? 'border-alert/30' : tone === 'celebrate' ? 'border-area-line' : 'border-line', className)}>
    <div className="flex items-center gap-2">
      <p className={cx('flex min-w-0 flex-1 items-center gap-1.5 text-label uppercase', tone === 'alert' ? 'text-alert' : 'text-fg-1')}>
        {mark && <span aria-hidden className={cx('text-[13px] leading-none', tone === 'celebrate' ? 'text-area-ink' : tone === 'alert' ? 'text-alert' : 'text-fg-1')}>{mark}</span>}
        {label}
      </p>
      {onDismiss && <IconButton label="Dispensar" size="sm" onClick={onDismiss} className="-my-2 -mr-2"><X size={16}/></IconButton>}
    </div>
    <div className="mt-2 text-body text-fg-1">{children}</div>
    {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    {footnote && <p className="mt-3 text-caption text-fg-3">{footnote}</p>}
  </motion.aside>
}

/**
 * A Pri como camada sobre o app: aparece no contexto (Hoje, Evolução, Finanças)
 * com um padrão, um alerta ou uma comemoração — não como botão de chat solto.
 * Sempre diz de onde tirou a conclusão, como a conversa com a Pri já faz.
 * O acesso (Aprumo+) continua sendo decidido por quem usa, com o PlusGate.
 */
export default function PriInsight({ sources, footnote, ...props }: InsightProps & { sources?: string[] }) {
  const basis = sources && sources.length > 0 ? `Com base em ${sources.join(', ')}.` : null
  return <Insight label="Pri" mark="✦" {...props} footnote={basis || footnote ? <>{basis}{basis && footnote ? ' ' : ''}{footnote}</> : undefined}/>
}
