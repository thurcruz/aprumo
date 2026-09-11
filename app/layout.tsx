import type { Metadata } from 'next'
import './globals.css'
import AppChrome from '@/components/layout/AppChrome'
import { THEME_SCRIPT } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'Aprumo — Sua evolução, todos os dias',
  description: 'Clareza para decidir. Sistema para executar. Evolução que você consegue ver.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // suppressHydrationWarning: THEME_SCRIPT muda data-theme antes do React hidratar.
  return <html lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}/></head><body><AppChrome>{children}</AppChrome></body></html>
}
