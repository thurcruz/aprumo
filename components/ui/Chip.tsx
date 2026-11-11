import type { ButtonHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

/**
 * Opção que se liga e desliga: dias da semana, período do dia, prazo, meta.
 * Serve tanto para escolha única quanto múltipla — quem chama decide.
 * Selecionado ganha a cor da área do contexto; para abas e filtros de uma
 * linha só, prefira o SegmentedControl.
 */
export default function Chip({ selected, shape = 'pill', size = 'md', className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean
  /** `square` para grades de mesmo tamanho, como os dias da semana. */
  shape?: 'pill' | 'square'
  size?: 'sm' | 'md'
}) {
  return <button type={type} aria-pressed={selected} className={cx(
    'inline-flex min-w-0 items-center justify-center gap-1.5 border font-medium transition-[background-color,border-color,color] duration-200 ease-ap',
    'disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg-1',
    shape === 'pill' ? 'rounded-full' : 'flex-1 rounded-control',
    size === 'md' ? 'h-9 px-3.5 text-body-s' : 'h-8 px-3 text-caption',
    shape === 'square' && 'px-0',
    selected ? 'border-area-line bg-area-soft text-area-ink' : 'border-line text-fg-2 hover:border-line-strong hover:text-fg-1',
    className,
  )} {...props}/>
}
