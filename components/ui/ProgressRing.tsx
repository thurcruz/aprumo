import type { ReactNode } from 'react'
import { percentOf } from '@/lib/dataviz'

/** Anel de progresso: foco, meta do dia, widgets compactos. O centro recebe o número. */
export default function ProgressRing({ value, max = 100, size = 56, stroke = 5, label, children }: {
  value: number
  max?: number
  size?: number
  stroke?: number
  label?: string
  children?: ReactNode
}) {
  const percent = percentOf(value, max)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
    className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-surface-pressed"/>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeLinecap="round"
        className="stroke-area transition-[stroke-dashoffset] duration-700 ease-ap"
        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percent / 100)}/>
    </svg>
    {children && <div className="relative text-center">{children}</div>}
  </div>
}
