import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/** Só o desenho do interruptor, para usar dentro de um botão que já é o switch. */
export function SwitchTrack({ checked }: { checked: boolean }) {
  return <span aria-hidden className={cx('relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ease-ap', checked ? 'bg-area' : 'bg-surface-pressed ring-1 ring-inset ring-line-strong')}>
    <span className={cx('absolute top-0.5 h-5 w-5 rounded-full shadow-sm transition-[left,background-color] duration-200 ease-ap', checked ? 'left-[18px] bg-on-fill' : 'left-0.5 bg-fg-2')}/>
  </span>
}

/** Interruptor liga/desliga isolado, ex.: numa linha de configuração. */
export default function Switch({ checked, onChange, label, disabled }: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
    className="grid h-11 shrink-0 place-items-center rounded-full disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-fg-1">
    <SwitchTrack checked={checked}/>
  </button>
}

/**
 * Uma opção que se liga inteira: título, explicação do que muda e o
 * interruptor. A linha toda é o alvo de toque. Ex.: "Hora marcada",
 * "Tem data para terminar", "Modo automático".
 */
export function ToggleRow({ checked, onChange, title, description, icon: Icon, className }: {
  checked: boolean
  onChange: (checked: boolean) => void
  title: string
  description?: ReactNode
  icon?: LucideIcon
  className?: string
}) {
  return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
    className={cx('flex w-full items-center gap-3 rounded-control border p-3 text-left transition-colors duration-200 ease-ap focus-visible:outline-2 focus-visible:outline-fg-1',
      checked ? 'border-area-line bg-area-soft/40' : 'border-line hover:border-line-strong', className)}>
    {Icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-surface-2 text-area-ink"><Icon size={16}/></span>}
    <span className="min-w-0 flex-1">
      <span className="block text-body-s font-medium text-fg-1">{title}</span>
      {description && <span className="mt-0.5 block text-caption text-fg-2">{description}</span>}
    </span>
    <SwitchTrack checked={checked}/>
  </button>
}
