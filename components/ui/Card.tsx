import type { HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export interface CardStyle {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** 1 = card comum; 2 = card dentro de card, ou destaque sem cor. */
  tone?: 1 | 2
  /** Reage a hover/pressão — use em cards que são link ou botão. */
  interactive?: boolean
  selected?: boolean
}

const paddings = { none: '', sm: 'p-3', md: 'p-4 md:p-5', lg: 'p-5 md:p-6' }

/**
 * Classes do card, para quando o card é um <Link> ou <button> — o
 * componente Card cobre só os elementos que não são interativos.
 */
export function cardClass({ padding = 'md', tone = 1, interactive, selected }: CardStyle = {}): string {
  return cx(
    'block rounded-card border text-fg-1',
    tone === 1 ? 'bg-surface-1' : 'bg-surface-2',
    selected ? 'border-area-line' : 'border-line',
    interactive && 'transition-[background-color,border-color,transform] duration-200 ease-ap hover:border-line-strong hover:bg-surface-2 active:scale-[.99]',
    paddings[padding],
  )
}

export default function Card({ as: Tag = 'div', padding, tone, interactive, selected, className, ...props }: CardStyle & HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'article' | 'li' | 'aside' }) {
  return <Tag className={cx(cardClass({ padding, tone, interactive, selected }), className)} {...props}/>
}
