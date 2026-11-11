import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import AppChrome from '@/components/layout/AppChrome'
import { THEME_SCRIPT } from '@/lib/theme'

// Fontes do Design System. A mono só aparece em horários e códigos, por isso sem pré-carga.
const sans = Geist({ subsets: ['latin'], variable: '--font-ap-sans', display: 'swap' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-ap-mono', display: 'swap', preload: false })

export const metadata: Metadata = {
  title: 'Aprumo — Sua evolução, todos os dias',
  description: 'Clareza para decidir. Sistema para executar. Evolução que você consegue ver.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // suppressHydrationWarning: THEME_SCRIPT muda data-theme antes do React hidratar.
  return <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}/></head><body><AppChrome>{children}</AppChrome></body></html>
}
