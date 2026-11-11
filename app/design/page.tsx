import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Showcase from './Showcase'

export const metadata: Metadata = { title: 'Design System — Aprumo' }

/** Vitrine do Design System. Ferramenta de desenvolvimento: não existe em produção. */
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <Showcase/>
}
