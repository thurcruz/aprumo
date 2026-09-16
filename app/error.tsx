'use client'

import { useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return <div className="page-wrap flex min-h-[70svh] flex-col items-center justify-center gap-3 text-center">
    <p className="eyebrow">Algo deu errado</p>
    <h1 className="text-2xl font-semibold">Essa tela travou.</h1>
    <p className="muted max-w-sm text-sm">Tente de novo. Se continuar acontecendo, volte em alguns minutos.</p>
    <button onClick={reset} className="energy-button mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm">
      <RefreshCw size={15}/> Tentar de novo
    </button>
  </div>
}
