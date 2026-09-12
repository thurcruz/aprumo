'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import PriLauncher from '@/components/pri/PriLauncher'
import { watchTheme } from '@/lib/theme'

const publicRoutes = new Set(['/', '/login', '/cadastro', '/recuperar-senha', '/nova-senha', '/onboarding'])

export default function AppChrome({ children }: { children: React.ReactNode }) {
  // Aplica a preferência de tema e, no automático, acompanha o sistema.
  useEffect(() => watchTheme(), [])
  const isPublic = publicRoutes.has(usePathname())
  if (isPublic) return <>{children}</>
  return <div className="app-shell md:pl-[264px]"><Sidebar/><main><TopBar/>{children}</main><BottomNav/><PriLauncher/></div>
}
