'use client'

import { useState, useSyncExternalStore } from 'react'
import { Check, Lock, Pause, Play } from 'lucide-react'
import { usePlan } from '@/lib/plan'
import { DEFAULT_PRI_VOICE, PRI_VOICE_SAMPLE, PRI_VOICES, type PriVoice } from '@/lib/priVoices'
import { readPriVoice, savePriVoice, speak, stopSpeaking, subscribePriVoice, unlockSpeech } from '@/lib/voice'
import { cx } from '@/lib/cx'

/**
 * Escolha da voz da Pri, com prévia. A escolha vale na hora e fica salva neste
 * aparelho — não precisa de "Salvar alterações".
 */
export default function VoicePicker() {
  const { plan, loading } = usePlan()
  const selected = useSyncExternalStore(subscribePriVoice, readPriVoice, (): PriVoice => DEFAULT_PRI_VOICE)
  const [playing, setPlaying] = useState<PriVoice | null>(null)
  const [loadingVoice, setLoadingVoice] = useState<PriVoice | null>(null)
  const locked = !loading && plan !== 'plus'

  function preview(voice: PriVoice) {
    if (playing === voice || loadingVoice === voice) { stopSpeaking(); return }
    unlockSpeech()
    setLoadingVoice(voice)
    speak(PRI_VOICE_SAMPLE, {
      voice,
      onStart: () => { setLoadingVoice(null); setPlaying(voice) },
      onEnd: () => { setLoadingVoice(current => current === voice ? null : current); setPlaying(current => current === voice ? null : current) },
    })
  }

  return <div className="px-6.75 pb-5 pt-2 max-sm:px-4.5">
    <p className="text-body-s font-medium text-fg-1">Voz da Pri</p>
    <p className="mt-1 text-caption text-fg-2">Como ela responde quando você conversa por voz. A escolha fica salva neste aparelho.</p>
    {locked && <p className="mt-3 flex items-center gap-1.5 text-caption text-fg-2"><Lock size={13}/> Ouvir e usar as vozes é do Aprumo+.</p>}
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {PRI_VOICES.map(voice => {
        const active = selected === voice.id
        const busy = loadingVoice === voice.id
        return <div key={voice.id} className={cx('flex items-center gap-1 rounded-control border p-1 pl-3 transition-colors', active ? 'border-area-line bg-area-soft' : 'border-line')}>
          <button type="button" onClick={() => savePriVoice(voice.id)} aria-pressed={active}
            className="flex min-h-10 min-w-0 flex-1 items-center gap-2 text-left text-body-s">
            <span className={cx('truncate', active ? 'font-medium text-fg-1' : 'text-fg-2')}>{voice.label}</span>
            {voice.id === DEFAULT_PRI_VOICE && <span className="text-caption text-fg-3">padrão</span>}
            {active && <Check size={14} className="ml-auto shrink-0 text-area-ink"/>}
          </button>
          <button type="button" onClick={() => preview(voice.id)} disabled={locked} aria-label={playing === voice.id ? `Parar ${voice.label}` : `Ouvir ${voice.label}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-fg-2 transition-colors hover:bg-surface-hover hover:text-fg-1 disabled:opacity-35">
            {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"/> : playing === voice.id ? <Pause size={15}/> : <Play size={15}/>}
          </button>
        </div>
      })}
    </div>
  </div>
}
