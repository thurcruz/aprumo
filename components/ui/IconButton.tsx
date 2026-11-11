import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

/**
 * Botão só de ícone. `label` é obrigatório: sem texto visível, é ele que o
 * leitor de tela anuncia. O tamanho `sm` desenha 36px mas mantém 44px de toque.
 */
export default function IconButton({ label, size = 'md', variant = 'ghost', active, className, children, type = 'button', ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  label: string
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'outline'
  active?: boolean
  children: ReactNode
}) {
  return <button type={type} aria-label={label} className={cx(
    'relative grid shrink-0 place-items-center rounded-full transition-[background-color,border-color,color] duration-200 ease-ap',
    'disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg-1',
    size === 'md' ? 'h-11 w-11' : 'h-9 w-9 after:absolute after:-inset-1 after:content-[""]',
    variant === 'outline' ? 'border border-line hover:border-line-strong' : '',
    active ? 'bg-surface-pressed text-fg-1' : 'text-fg-2 hover:bg-surface-hover hover:text-fg-1',
    className,
  )} {...props}>{children}</button>
}
