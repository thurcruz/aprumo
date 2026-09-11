'use client'

import { useState } from 'react'
import { formatDuration, parseDuration } from '@/lib/workout'

/**
 * Campo numérico que pode ficar vazio enquanto se digita e só impõe o mínimo
 * ao sair. Travar o mínimo a cada tecla transformaria "apagar e digitar 8"
 * em "18", porque o campo nunca ficaria vazio.
 */
export function NumberField({ value, onChange, min = 0, max, step = 1, suffix, label }: {
  value: number | undefined
  onChange: (value: number) => void
  min?: number
  max: number
  step?: number
  suffix?: string
  label: string
}) {
  return <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
    <input type="number" inputMode="decimal" aria-label={label} min={min} max={max} step={step}
      value={value ? value : ''} placeholder="0"
      onChange={event => {
        const next = event.target.value === '' ? 0 : Number(event.target.value)
        if (Number.isFinite(next)) onChange(Math.min(max, Math.max(0, next)))
      }}
      onBlur={() => { if ((value ?? 0) < min) onChange(min) }}
      className="field w-16 px-2 py-1.5 text-center text-sm"/>
    {suffix}
  </label>
}

/** Duração em "mm:ss" (ou só segundos). Esteira de 20 minutos não deveria exigir digitar 1200. */
export function DurationField({ seconds, onChange }: { seconds: number; onChange: (seconds: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return <input value={draft ?? formatDuration(seconds)} aria-label="Duração" placeholder="mm:ss" inputMode="numeric"
    onChange={event => setDraft(event.target.value)}
    onBlur={() => {
      const parsed = draft === null ? undefined : parseDuration(draft)
      if (parsed !== undefined && parsed > 0) onChange(Math.min(86400, parsed))
      setDraft(null)
    }}
    className="field w-20 px-2 py-1.5 text-center text-sm tabular-nums"/>
}
