import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonStyle {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const variants: Record<ButtonVariant, string> = {
  // Ação principal neutra: a cor fica para o que é informação.
  primary: 'bg-fg-1 text-canvas hover:opacity-90',
  // A cor da área, para a ação que é a razão da tela (Iniciar treino, Concluir).
  accent: 'bg-area text-on-fill hover:brightness-110',
  secondary: 'border border-line bg-surface-2 text-fg-1 hover:border-line-strong hover:bg-surface-3',
  ghost: 'text-fg-2 hover:bg-surface-hover hover:text-fg-1',
  danger: 'border border-line bg-surface-2 text-alert hover:border-alert/40',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3 text-body-s',
  md: 'h-11 gap-2 px-4 text-body',
  lg: 'h-12 gap-2 px-5 text-body',
}

/** Classes do botão, para aplicar a um <Link> com a mesma aparência. */
export function buttonClass({ variant = 'primary', size = 'md', fullWidth }: ButtonStyle = {}): string {
  return cx(
    'inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium no-underline',
    'transition-[background-color,border-color,color,opacity,transform,filter] duration-200 ease-ap active:scale-[.97]',
    'disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg-1',
    variants[variant], sizes[size], fullWidth && 'w-full',
  )
}

export default function Button({ variant, size, fullWidth, loading, icon, iconRight, className, children, disabled, type = 'button', ...props }: ButtonStyle & ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}) {
  return <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cx(buttonClass({ variant, size, fullWidth }), className)} {...props}>
    {loading ? <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"/> : icon}
    {children}
    {iconRight}
  </button>
}
